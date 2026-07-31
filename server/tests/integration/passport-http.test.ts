import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import type {
  AuthenticationResponseJSON,
  EmailLinkDelivery,
  PassportCredentialRecord,
  PassportWebAuthnAdapter,
  RegistrationResponseJSON,
} from "../../src/passport/types";
import { PassportHttpApi } from "../../src/passport/http";
import { CaptainPassportService } from "../../src/passport/service";
import { SqlitePassportStore } from "../../src/passport/sqlite-store";
import { AuthoritativeArenaServer } from "../../src/server";

const ORIGIN = "http://localhost:4173";
const PEPPER = "passport-http-test-pepper-32-bytes-minimum";
const temporaryDirectories: string[] = [];

class FakeWebAuthn implements PassportWebAuthnAdapter {
  async createRegistrationOptions(accountId: string) {
    return {
      rp: { id: "localhost", name: "Wormifi" },
      user: { id: accountId, name: `captain-${accountId}`, displayName: "Captain" },
      challenge: "registration-challenge",
      pubKeyCredParams: [{ alg: -7, type: "public-key" as const }],
    };
  }

  async verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    return {
      verified: expectedChallenge === "registration-challenge",
      credential: {
        credentialId: response.id,
        publicKeyBase64Url: Buffer.from("public-key").toString("base64url"),
        counter: 0,
        transports: ["internal" as const],
        deviceType: "multiDevice" as const,
        backedUp: true,
      },
    };
  }

  async createAuthenticationOptions() {
    return {
      rpId: "localhost",
      challenge: "authentication-challenge",
      userVerification: "required" as const,
    };
  }

  async verifyAuthentication(
    _response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: PassportCredentialRecord,
  ) {
    return {
      verified: expectedChallenge === "authentication-challenge",
      newCounter: credential.counter + 1,
      deviceType: credential.deviceType,
      backedUp: credential.backedUp,
    };
  }
}

class CaptureEmailDelivery implements EmailLinkDelivery {
  readonly deliveries: Array<{ email: string; completionUrl: string; expiresAtMs: number }> = [];

  async sendSignInLink(input: { email: string; completionUrl: string; expiresAtMs: number }) {
    this.deliveries.push({ ...input });
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function databasePath() {
  const directory = mkdtempSync(join(tmpdir(), "wormifi-passport-"));
  temporaryDirectories.push(directory);
  return join(directory, "passport.sqlite");
}

function tokenFromCompletionUrl(completionUrl: string) {
  const fragment = new URL(completionUrl).hash;
  assert.match(fragment, /^#passport-email=/u);
  return decodeURIComponent(fragment.slice("#passport-email=".length));
}

async function post(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
  options: { origin?: string; cookie?: string } = {},
) {
  return fetch(`${baseUrl}/passport/v1${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: options.origin ?? ORIGIN,
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("Captain Passport local HTTP and SQLite beta", () => {
  it("creates and restores an email-link account without storing the raw address or link token", async () => {
    const filename = databasePath();
    const store = new SqlitePassportStore(filename);
    const delivery = new CaptureEmailDelivery();
    const service = new CaptainPassportService(store, new FakeWebAuthn(), PEPPER, {
      emailDelivery: delivery,
      emailCompletionUrl: ORIGIN,
    });
    const api = new PassportHttpApi({
      service,
      allowedOrigins: [ORIGIN],
      emailEnabled: true,
      secureCookies: false,
    });
    const server = new AuthoritativeArenaServer({ passport: api, targetPopulation: 0 });
    const started = await server.start();

    try {
      const startedEmail = await post(started.httpUrl, "/email/start", {
        email: "Captain.Example@Email.Test",
      });
      assert.equal(startedEmail.status, 202);
      assert.deepEqual(await startedEmail.json(), { ok: true, accepted: true });
      assert.equal(delivery.deliveries.length, 1);
      assert.equal(delivery.deliveries[0].email, "captain.example@email.test");

      const linkToken = tokenFromCompletionUrl(delivery.deliveries[0].completionUrl);
      const completed = await post(started.httpUrl, "/email/complete", {
        token: linkToken,
        deviceLabel: "Test browser",
      });
      assert.equal(completed.status, 200);
      const completedBody = await completed.json() as {
        created: boolean;
        recoveryCode: string;
        profile: { accountId: string };
      };
      assert.equal(completedBody.created, true);
      assert.match(completedBody.recoveryCode, /^W1-/u);
      const accountId = completedBody.profile.accountId;
      const cookie = completed.headers.get("set-cookie");
      assert.ok(cookie?.includes("HttpOnly"));
      assert.ok(cookie?.includes("SameSite=Lax"));

      const replay = await post(started.httpUrl, "/email/complete", {
        token: linkToken,
        deviceLabel: "Replay",
      });
      assert.equal(replay.status, 400);
      assert.deepEqual(await replay.json(), { ok: false, code: "AUTHENTICATION_FAILED" });

      const session = await fetch(`${started.httpUrl}/passport/v1/session`, {
        headers: { cookie: cookie! },
      });
      assert.equal(session.status, 200);
      assert.equal((await session.json() as { profile: { accountId: string } }).profile.accountId, accountId);

      const bytes = readFileSync(filename);
      assert.equal(bytes.includes(Buffer.from("captain.example@email.test")), false);
      assert.equal(bytes.includes(Buffer.from(linkToken)), false);

      const crossOrigin = await post(started.httpUrl, "/email/start", {
        email: "other@example.test",
      }, { origin: "https://evil.example" });
      assert.equal(crossOrigin.status, 403);
      assert.equal(delivery.deliveries.length, 1);
    } finally {
      await server.stop();
      store.close();
    }
  });

  it("persists identity across restarts and awards one authoritative life per idempotency key", async () => {
    const filename = databasePath();
    const firstStore = new SqlitePassportStore(filename);
    const firstDelivery = new CaptureEmailDelivery();
    const firstService = new CaptainPassportService(firstStore, new FakeWebAuthn(), PEPPER, {
      emailDelivery: firstDelivery,
      emailCompletionUrl: ORIGIN,
    });
    await firstService.startEmailAuthentication({
      email: "returning@example.test",
      ipKey: "127.0.0.1",
      nowMs: 1_000,
    });
    const firstToken = tokenFromCompletionUrl(firstDelivery.deliveries[0].completionUrl);
    const created = firstService.completeEmailAuthentication({
      token: firstToken,
      deviceLabel: "First browser",
      nowMs: 1_001,
    });
    firstService.recordEntitlementEvent({
      accountId: created.accountId,
      productId: "legend-voyage-lifetime-v1",
      action: "grant",
      source: "local_test",
      occurredAtMs: 1_002,
      idempotencyKey: "sqlite:voyage:grant",
    });
    firstStore.close();

    const secondStore = new SqlitePassportStore(filename);
    const secondDelivery = new CaptureEmailDelivery();
    const secondService = new CaptainPassportService(secondStore, new FakeWebAuthn(), PEPPER, {
      emailDelivery: secondDelivery,
      emailCompletionUrl: ORIGIN,
    });
    try {
      await secondService.startEmailAuthentication({
        email: "RETURNING@example.test",
        ipKey: "127.0.0.2",
        nowMs: 2_000,
      });
      const secondToken = tokenFromCompletionUrl(secondDelivery.deliveries[0].completionUrl);
      const restored = secondService.completeEmailAuthentication({
        token: secondToken,
        deviceLabel: "Second browser",
        nowMs: 2_001,
      });
      assert.equal(restored.created, false);
      assert.equal(restored.accountId, created.accountId);
      assert.equal(
        secondService.sessionProfile(restored.sessionToken, 2_002)
          .entitlements.find((entry) =>
            entry.productId === "legend-voyage-lifetime-v1"
          )?.permanent,
        true,
      );

      const award = {
        accountId: restored.accountId,
        idempotencyKey: "passport-life:public-1:life-alpha",
        roomId: "public-1",
        lifeId: "life-alpha",
        finalScore: 2_400,
        kills: 2,
        rank: 3,
        peakMass: 96,
        rulesetVersion: "protocol-5",
        occurredAtMs: 3_000,
      };
      const firstAward = secondService.awardAuthoritativeLife(award);
      const duplicate = secondService.awardAuthoritativeLife(award);
      assert.equal(firstAward.awarded, true);
      assert.equal(duplicate.awarded, false);
      assert.equal(duplicate.progression.completedRuns, 1);
      assert.equal(duplicate.progression.totalScore, 2_400);
      assert.equal(duplicate.progression.xp, firstAward.progression.xp);
    } finally {
      secondStore.close();
    }
  });
});

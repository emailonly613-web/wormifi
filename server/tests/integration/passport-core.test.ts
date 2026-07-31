import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type {
  AuthenticationResponseJSON,
  PassportCredentialRecord,
  PassportWebAuthnAdapter,
  RegistrationResponseJSON,
} from "../../src/passport/types";
import { CaptainPassportService, PassportError } from "../../src/passport/service";
import { InMemoryPassportStore } from "../../src/passport/store";
import { WormifiWebAuthn } from "../../src/passport/webauthn";

const PEPPER = "passport-test-pepper-32-bytes-minimum-value";

function registrationResponse(id = "credential-alpha") {
  return { id } as RegistrationResponseJSON;
}

function authenticationResponse(id = "credential-alpha") {
  return { id } as AuthenticationResponseJSON;
}

class FakeWebAuthn implements PassportWebAuthnAdapter {
  registrationChallenge = "registration-challenge";
  authenticationChallenge = "authentication-challenge";
  registrationVerifications = 0;
  authenticationVerifications = 0;

  async createRegistrationOptions(accountId: string, excludeCredentialIds: string[] = []) {
    return {
      rp: { id: "wormifi.com", name: "Wormifi" },
      user: { id: accountId, name: `captain-${accountId}`, displayName: "Captain" },
      challenge: this.registrationChallenge,
      pubKeyCredParams: [{ alg: -7, type: "public-key" as const }],
      excludeCredentials: excludeCredentialIds.map((id) => ({ id, type: "public-key" as const })),
    };
  }

  async verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    this.registrationVerifications += 1;
    return {
      verified: expectedChallenge === this.registrationChallenge,
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
      rpId: "wormifi.com",
      challenge: this.authenticationChallenge,
      userVerification: "required" as const,
    };
  }

  async verifyAuthentication(
    _response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: PassportCredentialRecord,
  ) {
    this.authenticationVerifications += 1;
    return {
      verified: expectedChallenge === this.authenticationChallenge,
      newCounter: credential.counter + 1,
      deviceType: credential.deviceType,
      backedUp: credential.backedUp,
    };
  }
}

function setup() {
  const store = new InMemoryPassportStore();
  const webAuthn = new FakeWebAuthn();
  const service = new CaptainPassportService(store, webAuthn, PEPPER);
  return { store, webAuthn, service };
}

async function enroll(nowMs = 1_700_000_000_000) {
  const kit = setup();
  const start = await kit.service.startEnrollment(nowMs);
  const finish = await kit.service.finishEnrollment({
    ceremonyId: start.ceremonyId,
    response: registrationResponse(),
    deviceLabel: "Captain's Windows laptop <script>",
    nowMs: nowMs + 1,
  });
  return { ...kit, start, finish, nowMs };
}

describe("Captain Passport local account core", () => {
  it("creates an opaque, email-free account and stores only hashed recovery/session secrets", async () => {
    const result = await enroll();
    assert.match(result.finish.accountId, /^[0-9a-f-]{36}$/u);
    assert.match(result.finish.recoveryCode, /^W1-(?:[0-9A-F]{4}-){7}[0-9A-F]{4}$/u);

    const serialized = JSON.stringify(result.store.auditSnapshot());
    assert.equal(serialized.includes(result.finish.sessionToken), false);
    assert.equal(serialized.includes(result.finish.recoveryCode), false);
    assert.equal(serialized.includes("<script>"), false);
    assert.equal(serialized.includes("@"), false);
    assert.equal(
      result.service.authenticateSession(result.finish.sessionToken, result.nowMs + 2).accountId,
      result.finish.accountId,
    );
  });

  it("expires and consumes each ceremony before verification so a challenge cannot replay", async () => {
    const { service, webAuthn } = setup();
    const start = await service.startEnrollment(1_000);
    await assert.rejects(
      service.finishEnrollment({
        ceremonyId: start.ceremonyId,
        response: registrationResponse(),
        deviceLabel: "Expired",
        nowMs: 301_001,
      }),
      (error: unknown) => error instanceof PassportError && error.code === "INVALID_CEREMONY",
    );
    assert.equal(webAuthn.registrationVerifications, 0);

    const fresh = await service.startEnrollment(1_000);
    await service.finishEnrollment({
      ceremonyId: fresh.ceremonyId,
      response: registrationResponse(),
      deviceLabel: "First use",
      nowMs: 1_001,
    });
    await assert.rejects(
      service.finishEnrollment({
        ceremonyId: fresh.ceremonyId,
        response: registrationResponse("credential-replay"),
        deviceLabel: "Replay",
        nowMs: 1_002,
      }),
      (error: unknown) => error instanceof PassportError && error.code === "INVALID_CEREMONY",
    );
    assert.equal(webAuthn.registrationVerifications, 1);
  });

  it("authenticates discoverable passkeys, advances the counter, and revokes sessions immediately", async () => {
    const result = await enroll();
    const auth = await result.service.startAuthentication(result.nowMs + 10);
    const signedIn = await result.service.finishAuthentication({
      ceremonyId: auth.ceremonyId,
      response: authenticationResponse(),
      deviceLabel: "Phone",
      nowMs: result.nowMs + 11,
    });
    assert.equal(result.store.credential("credential-alpha")?.counter, 1);
    assert.equal(result.service.listSessions(signedIn.sessionToken, result.nowMs + 12).length, 2);
    assert.equal(
      result.service.revokeSession(signedIn.sessionToken, result.finish.sessionId, result.nowMs + 13),
      true,
    );
    assert.throws(
      () => result.service.authenticateSession(result.finish.sessionToken, result.nowMs + 14),
      (error: unknown) => error instanceof PassportError && error.code === "INVALID_SESSION",
    );
  });

  it("rotates a used recovery code, revokes old sessions, and permits only one redemption", async () => {
    const result = await enroll();
    const recovered = result.service.recover({
      accountId: result.finish.accountId,
      recoveryCode: result.finish.recoveryCode,
      ipKey: "198.51.100.7",
      deviceLabel: "Replacement phone",
      nowMs: result.nowMs + 20,
    });
    assert.notEqual(recovered.recoveryCode, result.finish.recoveryCode);
    assert.throws(() => result.service.authenticateSession(result.finish.sessionToken, result.nowMs + 21));
    assert.equal(result.service.authenticateSession(recovered.sessionToken, result.nowMs + 21).accountId, result.finish.accountId);

    const oldPasskeyAttempt = await result.service.startAuthentication(result.nowMs + 21);
    await assert.rejects(
      result.service.finishAuthentication({
        ceremonyId: oldPasskeyAttempt.ceremonyId,
        response: authenticationResponse("credential-alpha"),
        deviceLabel: "Lost device",
        nowMs: result.nowMs + 21,
      }),
      (error: unknown) => error instanceof PassportError && error.code === "AUTHENTICATION_FAILED",
    );

    const addPasskey = await result.service.startPasskeyAddition(recovered.sessionToken, result.nowMs + 21);
    assert.equal(addPasskey.options.excludeCredentials?.[0]?.id, "credential-alpha");
    await result.service.finishPasskeyAddition({
      ceremonyId: addPasskey.ceremonyId,
      response: registrationResponse("credential-beta"),
      authToken: recovered.sessionToken,
      nowMs: result.nowMs + 21,
    });
    assert.throws(
      () => result.service.recover({
        accountId: result.finish.accountId,
        recoveryCode: result.finish.recoveryCode,
        ipKey: "198.51.100.7",
        deviceLabel: "Replay",
        nowMs: result.nowMs + 22,
      }),
      (error: unknown) => error instanceof PassportError && error.code === "AUTHENTICATION_FAILED",
    );
    assert.deepEqual(
      result.store.events(result.finish.accountId).map((event) => event.type),
      ["account_created", "recovery_completed", "passkey_added"],
    );
  });

  it("rate limits recovery by account and IP without revealing unknown accounts", async () => {
    const result = await enroll();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.throws(
        () => result.service.recover({
          accountId: result.finish.accountId,
          recoveryCode: "W1-0000-0000-0000-0000-0000-0000-0000-0000",
          ipKey: "203.0.113.9",
          deviceLabel: "Guess",
          nowMs: result.nowMs + attempt,
        }),
        (error: unknown) => error instanceof PassportError && error.code === "AUTHENTICATION_FAILED",
      );
    }
    assert.throws(
      () => result.service.recover({
        accountId: result.finish.accountId,
        recoveryCode: result.finish.recoveryCode,
        ipKey: "203.0.113.9",
        deviceLabel: "Correct but blocked",
        nowMs: result.nowMs + 6,
      }),
      (error: unknown) => error instanceof PassportError && error.code === "RATE_LIMITED",
    );
    assert.throws(
      () => result.service.recover({
        accountId: "00000000-0000-4000-8000-000000000000",
        recoveryCode: "W1-0000-0000-0000-0000-0000-0000-0000-0000",
        ipKey: "203.0.113.10",
        deviceLabel: "Unknown",
        nowMs: result.nowMs + 7,
      }),
      (error: unknown) => error instanceof PassportError && error.code === "AUTHENTICATION_FAILED",
    );
  });

  it("derives monthly access and permanent ownership from an append-only entitlement log", async () => {
    const result = await enroll(10_000);
    const accountId = result.finish.accountId;
    const firstPaidThrough = 10_000 + 30 * 24 * 60 * 60_000;
    const first = result.service.recordEntitlementEvent({
      accountId,
      productId: "captain-club-monthly-v1",
      action: "grant",
      source: "local_test",
      occurredAtMs: 10_010,
      paidThroughMs: firstPaidThrough,
      idempotencyKey: "club:grant:one",
    });
    const duplicate = result.service.recordEntitlementEvent({
      accountId,
      productId: "captain-club-monthly-v1",
      action: "grant",
      source: "local_test",
      occurredAtMs: 10_011,
      paidThroughMs: firstPaidThrough,
      idempotencyKey: "club:grant:one",
    });
    assert.equal(first.recorded, true);
    assert.equal(duplicate.recorded, false);

    const renewedThrough = firstPaidThrough + 30 * 24 * 60 * 60_000;
    result.service.recordEntitlementEvent({
      accountId,
      productId: "captain-club-monthly-v1",
      action: "renew",
      source: "local_test",
      // Simulate delayed delivery of an event that occurred before cancellation.
      occurredAtMs: 10_020,
      paidThroughMs: renewedThrough,
      idempotencyKey: "club:renew:two",
    });
    result.service.recordEntitlementEvent({
      accountId,
      productId: "captain-club-monthly-v1",
      action: "cancel_at_period_end",
      source: "local_test",
      occurredAtMs: 10_030,
      idempotencyKey: "club:cancel",
    });
    const club = result.service.sessionProfile(result.finish.sessionToken, 10_040)
      .entitlements.find((entitlement) =>
        entitlement.productId === "captain-club-monthly-v1"
      );
    assert.equal(club?.active, true);
    assert.equal(club?.paidThroughMs, renewedThrough);
    assert.equal(club?.cancelAtPeriodEnd, true);
    assert.equal(club?.history.length, 3);

    const lifetime = result.service.recordEntitlementEvent({
      accountId,
      productId: "legend-voyage-lifetime-v1",
      action: "grant",
      source: "operator_correction",
      occurredAtMs: 10_050,
      idempotencyKey: "voyage:grant",
    });
    assert.equal(lifetime.entitlements.find((entry) =>
      entry.productId === "legend-voyage-lifetime-v1"
    )?.permanent, true);
    const reversed = result.service.recordEntitlementEvent({
      accountId,
      productId: "legend-voyage-lifetime-v1",
      action: "reverse",
      source: "operator_correction",
      occurredAtMs: 10_060,
      reversesEventId: lifetime.event.eventId,
      idempotencyKey: "voyage:reverse",
    });
    const voyage = reversed.entitlements.find((entry) =>
      entry.productId === "legend-voyage-lifetime-v1"
    );
    assert.equal(voyage?.active, false);
    assert.equal(voyage?.history.length, 2);
    assert.deepEqual(
      result.store.events(accountId).filter((event) => event.type === "entitlement_recorded")
        .map((event) => event.detail.action),
      ["grant", "renew", "cancel_at_period_end", "grant", "reverse"],
    );
    assert.throws(() => result.service.recordEntitlementEvent({
      accountId,
      productId: "captain-club-monthly-v1",
      action: "renew",
      source: "payment_provider",
      occurredAtMs: 10_070,
      paidThroughMs: renewedThrough,
      externalReferenceHash: "raw-provider-id",
      idempotencyKey: "provider:bad",
    }), /one-way external reference hash/u);
  });

  it("pins production WebAuthn to exact HTTPS origin, RP ID, resident keys, and user verification", async () => {
    const adapter = new WormifiWebAuthn({ rpId: "wormifi.com", expectedOrigin: "https://wormifi.com" });
    const options = await adapter.createRegistrationOptions("00000000-0000-4000-8000-000000000000");
    assert.equal(options.rp.id, "wormifi.com");
    assert.equal(options.authenticatorSelection?.residentKey, "required");
    assert.equal(options.authenticatorSelection?.userVerification, "required");
    assert.equal(Buffer.from(options.challenge, "base64url").byteLength >= 16, true);
    assert.throws(() => new WormifiWebAuthn({ rpId: "evil.example", expectedOrigin: "https://wormifi.com" }));
    assert.throws(() => new WormifiWebAuthn({ rpId: "wormifi.com", expectedOrigin: "http://wormifi.com" }));
  });

  it("defines the durable PostgreSQL records without email, password, analytics, or payment data", () => {
    const sql = readFileSync(new URL("../../src/passport/schema.sql", import.meta.url), "utf8");
    const executableSql = sql.replace(/^--.*$/gmu, "");
    for (const table of [
      "passport_accounts",
      "passport_credentials",
      "passport_challenges",
      "passport_sessions",
      "passport_recovery_codes",
      "captain_log_events",
      "captain_entitlement_events",
    ]) {
      assert.match(sql, new RegExp(`CREATE TABLE ${table}\\b`, "u"));
    }
    assert.doesNotMatch(executableSql, /\b(email|password|card_number|analytics_id)\b/iu);
    assert.match(sql, /UNIQUE INDEX passport_one_active_recovery_code/u);
    assert.match(sql, /token_hash text NOT NULL UNIQUE/u);
    assert.match(sql, /idempotency_key text NOT NULL UNIQUE/u);
  });
});

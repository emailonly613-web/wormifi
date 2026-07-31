import { randomBytes, randomUUID } from "node:crypto";
import {
  assertPassportPepper,
  constantTimeFakeRecoveryCheck,
  createRecoverySecret,
  createSessionToken,
  sessionTokenHash,
  verifyRecoveryCode,
} from "./crypto";
import { PassportRateLimiter } from "./rate-limit";
import { InMemoryPassportStore } from "./store";
import type {
  AuthenticationResponseJSON,
  CaptainLogEventRecord,
  PassportChallengePurpose,
  PassportCredentialRecord,
  PassportSessionRecord,
  PassportWebAuthnAdapter,
  RegistrationResponseJSON,
} from "./types";

const CHALLENGE_TTL_MS = 5 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export class PassportError extends Error {
  constructor(readonly code: "INVALID_CEREMONY" | "AUTHENTICATION_FAILED" | "RATE_LIMITED" | "INVALID_SESSION") {
    super(code);
  }
}

function cleanDeviceLabel(value: string) {
  const label = value.replace(/[^a-z0-9 ._()-]/giu, "").trim().slice(0, 60);
  return label || "Unnamed device";
}

export class CaptainPassportService {
  readonly #recoveryLimiter: PassportRateLimiter;

  constructor(
    private readonly store: InMemoryPassportStore,
    private readonly webAuthn: PassportWebAuthnAdapter,
    private readonly pepper: string,
    recoveryLimiter = new PassportRateLimiter(),
  ) {
    assertPassportPepper(pepper);
    this.#recoveryLimiter = recoveryLimiter;
  }

  async startEnrollment(nowMs = Date.now()) {
    const accountId = randomUUID();
    const options = await this.webAuthn.createRegistrationOptions(accountId);
    const ceremonyId = this.#saveChallenge("enrollment", accountId, options.challenge, nowMs);
    return { ceremonyId, options };
  }

  async finishEnrollment(input: {
    ceremonyId: string;
    response: RegistrationResponseJSON;
    deviceLabel: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const challenge = this.store.claimChallenge(input.ceremonyId, "enrollment", nowMs);
    if (!challenge?.accountId) throw new PassportError("INVALID_CEREMONY");

    const verification = await this.#verifyRegistration(input.response, challenge.expectedChallenge);
    if (!verification.verified || !verification.credential) throw new PassportError("AUTHENTICATION_FAILED");

    const credential: PassportCredentialRecord = {
      ...verification.credential,
      accountId: challenge.accountId,
      createdAtMs: nowMs,
      lastUsedAtMs: null,
      revokedAtMs: null,
    };
    const recovery = createRecoverySecret(challenge.accountId, 1, nowMs, this.pepper);
    const session = this.#newSession(challenge.accountId, input.deviceLabel, nowMs);
    const event = this.#event(challenge.accountId, "account_created", nowMs, {
      credentialIdSuffix: credential.credentialId.slice(-8),
    });

    this.store.createAccount(
      { accountId: challenge.accountId, createdAtMs: nowMs },
      credential,
      recovery.record,
      session.record,
      event,
    );
    return {
      accountId: challenge.accountId,
      sessionId: session.record.sessionId,
      sessionToken: session.token,
      recoveryCode: recovery.code,
    };
  }

  async startAuthentication(nowMs = Date.now()) {
    const options = await this.webAuthn.createAuthenticationOptions();
    const ceremonyId = this.#saveChallenge("authentication", null, options.challenge, nowMs);
    return { ceremonyId, options };
  }

  async startPasskeyAddition(authToken: string, nowMs = Date.now()) {
    const actor = this.authenticateSession(authToken, nowMs);
    const excludeCredentialIds = this.store.credentials(actor.accountId).map((credential) => credential.credentialId);
    const options = await this.webAuthn.createRegistrationOptions(actor.accountId, excludeCredentialIds);
    const ceremonyId = this.#saveChallenge("passkey_addition", actor.accountId, options.challenge, nowMs);
    return { ceremonyId, options };
  }

  async finishPasskeyAddition(input: {
    ceremonyId: string;
    response: RegistrationResponseJSON;
    authToken: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const actor = this.authenticateSession(input.authToken, nowMs);
    const challenge = this.store.claimChallenge(input.ceremonyId, "passkey_addition", nowMs);
    if (!challenge?.accountId || challenge.accountId !== actor.accountId) {
      throw new PassportError("INVALID_CEREMONY");
    }

    const verification = await this.#verifyRegistration(input.response, challenge.expectedChallenge);
    if (!verification.verified || !verification.credential) throw new PassportError("AUTHENTICATION_FAILED");
    const credential: PassportCredentialRecord = {
      ...verification.credential,
      accountId: actor.accountId,
      createdAtMs: nowMs,
      lastUsedAtMs: null,
      revokedAtMs: null,
    };
    const added = this.store.addCredential(
      credential,
      this.#event(actor.accountId, "passkey_added", nowMs, {
        credentialIdSuffix: credential.credentialId.slice(-8),
      }),
    );
    if (!added) throw new PassportError("AUTHENTICATION_FAILED");
    return { accountId: actor.accountId, credentialId: credential.credentialId };
  }

  async finishAuthentication(input: {
    ceremonyId: string;
    response: AuthenticationResponseJSON;
    deviceLabel: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const challenge = this.store.claimChallenge(input.ceremonyId, "authentication", nowMs);
    if (!challenge) throw new PassportError("INVALID_CEREMONY");

    const credential = this.store.credential(input.response.id);
    if (!credential || credential.revokedAtMs !== null) throw new PassportError("AUTHENTICATION_FAILED");
    let verification;
    try {
      verification = await this.webAuthn.verifyAuthentication(
        input.response,
        challenge.expectedChallenge,
        credential,
      );
    } catch {
      throw new PassportError("AUTHENTICATION_FAILED");
    }
    if (!verification.verified || verification.newCounter === undefined) {
      throw new PassportError("AUTHENTICATION_FAILED");
    }
    const updated = this.store.updateCredentialAfterAuthentication(
      credential.credentialId,
      verification.newCounter,
      verification.backedUp ?? credential.backedUp,
      nowMs,
    );
    if (!updated) throw new PassportError("AUTHENTICATION_FAILED");

    const session = this.#newSession(credential.accountId, input.deviceLabel, nowMs);
    this.store.saveSession(session.record);
    this.store.appendEvent(this.#event(credential.accountId, "passkey_authenticated", nowMs, {
      sessionId: session.record.sessionId,
    }));
    return {
      accountId: credential.accountId,
      sessionId: session.record.sessionId,
      sessionToken: session.token,
    };
  }

  recover(input: {
    accountId: string;
    recoveryCode: string;
    ipKey: string;
    deviceLabel: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const accountKey = `account:${input.accountId}`;
    const ipKey = `ip:${input.ipKey}`;
    if (!this.#recoveryLimiter.isAllowed(accountKey, nowMs) || !this.#recoveryLimiter.isAllowed(ipKey, nowMs)) {
      throw new PassportError("RATE_LIMITED");
    }

    const current = this.store.recovery(input.accountId);
    const matches = current
      ? verifyRecoveryCode(input.recoveryCode, current.salt, current.codeHash, this.pepper)
      : constantTimeFakeRecoveryCheck(input.recoveryCode, this.pepper);
    if (!current || !matches || current.usedAtMs !== null) {
      this.#recoveryLimiter.recordFailure(accountKey, nowMs);
      this.#recoveryLimiter.recordFailure(ipKey, nowMs);
      throw new PassportError("AUTHENTICATION_FAILED");
    }

    const replacement = createRecoverySecret(input.accountId, current.version + 1, nowMs, this.pepper);
    const session = this.#newSession(input.accountId, input.deviceLabel, nowMs);
    const rotated = this.store.recoverAccount(
      input.accountId,
      current.version,
      replacement.record,
      session.record,
      this.#event(input.accountId, "recovery_completed", nowMs, {
        previousRecoveryVersion: current.version,
        newRecoveryVersion: replacement.record.version,
      }),
      nowMs,
    );
    if (!rotated) throw new PassportError("AUTHENTICATION_FAILED");

    this.#recoveryLimiter.clear(accountKey);
    this.#recoveryLimiter.clear(ipKey);
    return {
      accountId: input.accountId,
      sessionId: session.record.sessionId,
      sessionToken: session.token,
      recoveryCode: replacement.code,
    };
  }

  authenticateSession(token: string, nowMs = Date.now()) {
    const tokenHash = sessionTokenHash(token, this.pepper);
    const session = this.store.sessionByHash(tokenHash);
    if (!session || session.revokedAtMs !== null || session.expiresAtMs <= nowMs) {
      throw new PassportError("INVALID_SESSION");
    }
    if (!this.store.touchSession(tokenHash, nowMs)) throw new PassportError("INVALID_SESSION");
    return { accountId: session.accountId, sessionId: session.sessionId };
  }

  revokeSession(authToken: string, sessionId: string, nowMs = Date.now()) {
    const actor = this.authenticateSession(authToken, nowMs);
    const revoked = this.store.revokeSession(actor.accountId, sessionId, nowMs);
    if (revoked) {
      this.store.appendEvent(this.#event(actor.accountId, "session_revoked", nowMs, { sessionId }));
    }
    return revoked;
  }

  listSessions(authToken: string, nowMs = Date.now()) {
    const actor = this.authenticateSession(authToken, nowMs);
    return this.store.sessions(actor.accountId).map((session) => ({
      sessionId: session.sessionId,
      deviceLabel: session.deviceLabel,
      createdAtMs: session.createdAtMs,
      lastUsedAtMs: session.lastUsedAtMs,
      expiresAtMs: session.expiresAtMs,
      revokedAtMs: session.revokedAtMs,
      current: session.sessionId === actor.sessionId,
    }));
  }

  #saveChallenge(
    purpose: PassportChallengePurpose,
    accountId: string | null,
    expectedChallenge: string,
    nowMs: number,
  ) {
    const ceremonyId = randomBytes(24).toString("base64url");
    this.store.saveChallenge({
      ceremonyId,
      purpose,
      accountId,
      expectedChallenge,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + CHALLENGE_TTL_MS,
      consumedAtMs: null,
    });
    return ceremonyId;
  }

  #newSession(accountId: string, deviceLabel: string, nowMs: number) {
    const secret = createSessionToken(this.pepper);
    const record: PassportSessionRecord = {
      sessionId: randomUUID(),
      accountId,
      tokenHash: secret.tokenHash,
      deviceLabel: cleanDeviceLabel(deviceLabel),
      createdAtMs: nowMs,
      lastUsedAtMs: nowMs,
      expiresAtMs: nowMs + SESSION_TTL_MS,
      revokedAtMs: null,
    };
    return { token: secret.token, record };
  }

  async #verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    try {
      return await this.webAuthn.verifyRegistration(response, expectedChallenge);
    } catch {
      throw new PassportError("AUTHENTICATION_FAILED");
    }
  }

  #event(
    accountId: string,
    type: CaptainLogEventRecord["type"],
    occurredAtMs: number,
    detail: CaptainLogEventRecord["detail"],
  ): CaptainLogEventRecord {
    return { eventId: randomUUID(), accountId, type, occurredAtMs, detail };
  }
}

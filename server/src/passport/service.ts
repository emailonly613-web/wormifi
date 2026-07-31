import { randomBytes, randomUUID } from "node:crypto";
import {
  assertPassportPepper,
  constantTimeFakeRecoveryCheck,
  createEmailLinkToken,
  createRecoverySecret,
  createSessionToken,
  emailAddressKey,
  emailLinkTokenHash,
  normalizeEmailAddress,
  sessionTokenHash,
  verifyRecoveryCode,
} from "./crypto";
import { PassportRateLimiter } from "./rate-limit";
import type { PassportStore } from "./store";
import {
  CAPTAIN_ENTITLEMENT_PRODUCTS,
  deriveCaptainEntitlements,
} from "./entitlements";
import type {
  AuthenticationResponseJSON,
  AuthoritativeLifeAward,
  CaptainEntitlementEventAction,
  CaptainEntitlementEventSource,
  CaptainEntitlementProductId,
  CaptainLogEventRecord,
  EmailLinkDelivery,
  PassportChallengePurpose,
  PassportCredentialRecord,
  PassportEmailIdentityRecord,
  PassportSessionRecord,
  PassportWebAuthnAdapter,
  RegistrationResponseJSON,
} from "./types";
import {
  calculateCaptainRunXp,
  MAX_CAPTAIN_XP,
} from "../../../src/game/captainProgression.ts";

const CHALLENGE_TTL_MS = 5 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
const EMAIL_LINK_TTL_MS = 15 * 60_000;

export class PassportError extends Error {
  constructor(readonly code:
    | "INVALID_CEREMONY"
    | "AUTHENTICATION_FAILED"
    | "EMAIL_UNAVAILABLE"
    | "INVALID_EMAIL"
    | "RATE_LIMITED"
    | "INVALID_SESSION"
  ) {
    super(code);
  }
}

function cleanDeviceLabel(value: string) {
  const label = value.replace(/[^a-z0-9 ._()-]/giu, "").trim().slice(0, 60);
  return label || "Unnamed device";
}

export class CaptainPassportService {
  readonly #recoveryLimiter: PassportRateLimiter;
  readonly #emailLimiter: PassportRateLimiter;
  readonly #emailDelivery?: EmailLinkDelivery;
  readonly #emailCompletionUrl: string;

  constructor(
    private readonly store: PassportStore,
    private readonly webAuthn: PassportWebAuthnAdapter,
    private readonly pepper: string,
    options: {
      recoveryLimiter?: PassportRateLimiter;
      emailLimiter?: PassportRateLimiter;
      emailDelivery?: EmailLinkDelivery;
      emailCompletionUrl?: string;
    } = {},
  ) {
    assertPassportPepper(pepper);
    this.#recoveryLimiter = options.recoveryLimiter ?? new PassportRateLimiter();
    this.#emailLimiter = options.emailLimiter ?? new PassportRateLimiter(4, 15 * 60_000, 15 * 60_000);
    this.#emailDelivery = options.emailDelivery;
    this.#emailCompletionUrl = options.emailCompletionUrl ?? "https://wormifi.com/";
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

  async startEmailAuthentication(input: {
    email: string;
    ipKey: string;
    authToken?: string;
    nowMs?: number;
  }) {
    if (!this.#emailDelivery) throw new PassportError("EMAIL_UNAVAILABLE");
    const nowMs = input.nowMs ?? Date.now();
    let normalizedEmail: string;
    try {
      normalizedEmail = normalizeEmailAddress(input.email);
    } catch {
      throw new PassportError("INVALID_EMAIL");
    }
    const emailKey = emailAddressKey(normalizedEmail, this.pepper);
    const rateKeys = [`email:${emailKey}`, `ip:${input.ipKey}`];
    if (rateKeys.some((key) => !this.#emailLimiter.isAllowed(key, nowMs))) {
      throw new PassportError("RATE_LIMITED");
    }
    for (const key of rateKeys) this.#emailLimiter.recordFailure(key, nowMs);

    const actor = input.authToken
      ? this.authenticateSession(input.authToken, nowMs)
      : undefined;
    const existing = this.store.emailIdentity(emailKey);
    if (actor && existing && existing.accountId !== actor.accountId) {
      // The HTTP layer intentionally turns this into the same generic response
      // as every other request so an address cannot be used for enumeration.
      throw new PassportError("AUTHENTICATION_FAILED");
    }
    const accountId = actor?.accountId ?? existing?.accountId ?? null;
    const secret = createEmailLinkToken(this.pepper);
    const linkId = randomUUID();
    const expiresAtMs = nowMs + EMAIL_LINK_TTL_MS;
    this.store.saveEmailLink({
      linkId,
      emailKey,
      accountId,
      tokenHash: secret.tokenHash,
      createdAtMs: nowMs,
      expiresAtMs,
      consumedAtMs: null,
    });
    const completionUrl = new URL(this.#emailCompletionUrl);
    completionUrl.hash = `passport-email=${encodeURIComponent(secret.token)}`;
    try {
      await this.#emailDelivery.sendSignInLink({
        email: normalizedEmail,
        completionUrl: completionUrl.toString(),
        expiresAtMs,
      });
    } catch {
      throw new PassportError("EMAIL_UNAVAILABLE");
    }
    return { accepted: true as const, expiresAtMs };
  }

  completeEmailAuthentication(input: {
    token: string;
    deviceLabel: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const tokenHash = emailLinkTokenHash(input.token, this.pepper);
    const link = this.store.claimEmailLink(tokenHash, nowMs);
    if (!link) throw new PassportError("AUTHENTICATION_FAILED");

    let accountId = link.accountId;
    let recoveryCode: string | undefined;
    let created = false;
    if (!accountId) {
      accountId = randomUUID();
      const recovery = createRecoverySecret(accountId, 1, nowMs, this.pepper);
      const session = this.#newSession(accountId, input.deviceLabel, nowMs);
      const identity: PassportEmailIdentityRecord = {
        emailKey: link.emailKey,
        accountId,
        createdAtMs: nowMs,
        verifiedAtMs: nowMs,
      };
      const saved = this.store.createEmailAccount(
        { accountId, createdAtMs: nowMs },
        identity,
        recovery.record,
        session.record,
        this.#event(accountId, "account_created", nowMs, { method: "email_link" }),
      );
      if (!saved) throw new PassportError("AUTHENTICATION_FAILED");
      created = true;
      recoveryCode = recovery.code;
      return {
        accountId,
        sessionId: session.record.sessionId,
        sessionToken: session.token,
        created,
        recoveryCode,
      };
    }

    const identity = this.store.emailIdentity(link.emailKey);
    if (identity && identity.accountId !== accountId) {
      throw new PassportError("AUTHENTICATION_FAILED");
    }
    if (!identity) {
      const added = this.store.addEmailIdentity({
        emailKey: link.emailKey,
        accountId,
        createdAtMs: nowMs,
        verifiedAtMs: nowMs,
      });
      if (!added) throw new PassportError("AUTHENTICATION_FAILED");
    }
    const session = this.#newSession(accountId, input.deviceLabel, nowMs);
    this.store.saveSession(session.record);
    this.store.appendEvent(this.#event(accountId, "email_authenticated", nowMs, {
      sessionId: session.record.sessionId,
    }));
    return {
      accountId,
      sessionId: session.record.sessionId,
      sessionToken: session.token,
      created,
      recoveryCode,
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

  sessionProfile(authToken: string, nowMs = Date.now()) {
    const actor = this.authenticateSession(authToken, nowMs);
    return {
      accountId: actor.accountId,
      sessionId: actor.sessionId,
      progression: this.store.progression(actor.accountId),
      entitlements: deriveCaptainEntitlements(
        this.store.entitlementEvents(actor.accountId),
        nowMs,
      ),
      passkeyCount: this.store.credentials(actor.accountId)
        .filter((credential) => credential.revokedAtMs === null)
        .length,
    };
  }

  /**
   * Internal fulfillment seam. The public HTTP router deliberately exposes no
   * route to this method; a later verified provider adapter or reviewed
   * operator correction must call it from trusted server code.
   */
  recordEntitlementEvent(input: {
    accountId: string;
    productId: CaptainEntitlementProductId;
    action: CaptainEntitlementEventAction;
    source: CaptainEntitlementEventSource;
    occurredAtMs: number;
    paidThroughMs?: number | null;
    reversesEventId?: string | null;
    externalReferenceHash?: string | null;
    idempotencyKey: string;
  }) {
    if (!this.store.account(input.accountId)) {
      throw new Error("Cannot record an entitlement for an unknown account.");
    }
    const product = CAPTAIN_ENTITLEMENT_PRODUCTS[input.productId];
    if (!product) throw new Error("Unknown Captain entitlement product.");
    const paidThroughMs = input.paidThroughMs ?? null;
    const reversesEventId = input.reversesEventId ?? null;
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 160) {
      throw new Error("Entitlement idempotency key is invalid.");
    }
    if (!Number.isSafeInteger(input.occurredAtMs) || input.occurredAtMs < 0) {
      throw new Error("Entitlement occurrence time is invalid.");
    }
    if (input.action === "reverse") {
      if (!reversesEventId || paidThroughMs !== null) {
        throw new Error("A reversal must name exactly one event and no paid-through time.");
      }
    } else if (reversesEventId) {
      throw new Error("Only a reversal may name a prior entitlement event.");
    }
    if (product.relationship === "permanent_ownership") {
      if (paidThroughMs !== null || input.action === "renew" || input.action === "cancel_at_period_end") {
        throw new Error("Permanent ownership cannot renew, cancel at period end, or expire.");
      }
    } else if (
      (input.action === "grant" || input.action === "renew" || input.action === "correct") &&
      (typeof paidThroughMs !== "number" ||
        !Number.isSafeInteger(paidThroughMs) ||
        paidThroughMs <= 0)
    ) {
      throw new Error("Monthly access events require a valid paid-through time.");
    }
    const externalReferenceHash = input.externalReferenceHash ?? null;
    if (
      input.source === "payment_provider" &&
      !/^[a-f0-9]{64}$/u.test(externalReferenceHash ?? "")
    ) {
      throw new Error("Provider events require a one-way external reference hash.");
    }

    const record = {
      eventId: randomUUID(),
      accountId: input.accountId,
      productId: input.productId,
      action: input.action,
      source: input.source,
      occurredAtMs: input.occurredAtMs,
      paidThroughMs,
      reversesEventId,
      externalReferenceHash,
      idempotencyKey: input.idempotencyKey,
    };
    const event = this.#event(input.accountId, "entitlement_recorded", input.occurredAtMs, {
      entitlementEventId: record.eventId,
      productId: input.productId,
      action: input.action,
      source: input.source,
    });
    event.idempotencyKey = `entitlement:${input.idempotencyKey}`;
    const recorded = this.store.appendEntitlementEvent(record, event);
    return {
      recorded,
      event: record,
      entitlements: deriveCaptainEntitlements(
        this.store.entitlementEvents(input.accountId),
        input.occurredAtMs,
      ),
    };
  }

  awardAuthoritativeLife(input: Omit<AuthoritativeLifeAward, "xpDelta" | "formulaVersion">) {
    const current = this.store.progression(input.accountId);
    const calculatedXp = calculateCaptainRunXp({
      source: "live",
      score: input.finalScore,
      kills: input.kills,
      rank: input.rank,
      peakMass: input.peakMass,
    });
    const xpDelta = Math.max(0, Math.min(calculatedXp, MAX_CAPTAIN_XP - current.xp));
    const award: AuthoritativeLifeAward = {
      ...input,
      formulaVersion: "captain-xp-v1",
      xpDelta,
    };
    const event = this.#event(input.accountId, "progress_awarded", input.occurredAtMs, {
      roomId: input.roomId,
      lifeId: input.lifeId,
      finalScore: input.finalScore,
      kills: input.kills,
      rank: input.rank,
      peakMass: input.peakMass,
      rulesetVersion: input.rulesetVersion,
      formulaVersion: award.formulaVersion,
      xpDelta,
    });
    event.idempotencyKey = input.idempotencyKey;
    return this.store.awardAuthoritativeLife(award, event);
  }

  listCaptainLog(authToken: string, nowMs = Date.now()) {
    const actor = this.authenticateSession(authToken, nowMs);
    return this.store.events(actor.accountId);
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

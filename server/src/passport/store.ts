import type {
  AuthoritativeLifeAward,
  CaptainEntitlementEventRecord,
  CaptainProgressionRecord,
  CaptainLogEventRecord,
  PassportAccountRecord,
  PassportChallengePurpose,
  PassportChallengeRecord,
  PassportCredentialRecord,
  PassportEmailIdentityRecord,
  PassportEmailLinkRecord,
  PassportRecoveryRecord,
  PassportSessionRecord,
} from "./types";

function copy<T>(value: T): T {
  return structuredClone(value);
}

const EMPTY_PROGRESSION = Object.freeze({
  xp: 0,
  completedRuns: 0,
  totalScore: 0,
  lastAwardXp: 0,
  updatedAtMs: 0,
});

export interface PassportStore {
  saveChallenge(record: PassportChallengeRecord): void;
  claimChallenge(
    ceremonyId: string,
    purpose: PassportChallengePurpose,
    nowMs: number,
  ): PassportChallengeRecord | null;
  createAccount(
    account: PassportAccountRecord,
    credential: PassportCredentialRecord,
    recovery: PassportRecoveryRecord,
    session: PassportSessionRecord,
    event: CaptainLogEventRecord,
  ): void;
  createEmailAccount(
    account: PassportAccountRecord,
    emailIdentity: PassportEmailIdentityRecord,
    recovery: PassportRecoveryRecord,
    session: PassportSessionRecord,
    event: CaptainLogEventRecord,
  ): boolean;
  account(accountId: string): PassportAccountRecord | null;
  credential(credentialId: string): PassportCredentialRecord | null;
  credentials(accountId: string): PassportCredentialRecord[];
  addCredential(credential: PassportCredentialRecord, event: CaptainLogEventRecord): boolean;
  updateCredentialAfterAuthentication(
    credentialId: string,
    newCounter: number,
    backedUp: boolean,
    nowMs: number,
  ): boolean;
  saveSession(record: PassportSessionRecord): void;
  sessionByHash(tokenHash: string): PassportSessionRecord | null;
  touchSession(tokenHash: string, nowMs: number): boolean;
  revokeSession(accountId: string, sessionId: string, nowMs: number): boolean;
  sessions(accountId: string): PassportSessionRecord[];
  recovery(accountId: string): PassportRecoveryRecord | null;
  recoverAccount(
    accountId: string,
    expectedVersion: number,
    replacement: PassportRecoveryRecord,
    replacementSession: PassportSessionRecord,
    event: CaptainLogEventRecord,
    nowMs: number,
  ): boolean;
  emailIdentity(emailKey: string): PassportEmailIdentityRecord | null;
  addEmailIdentity(record: PassportEmailIdentityRecord): boolean;
  saveEmailLink(record: PassportEmailLinkRecord): void;
  claimEmailLink(tokenHash: string, nowMs: number): PassportEmailLinkRecord | null;
  awardAuthoritativeLife(
    award: AuthoritativeLifeAward,
    event: CaptainLogEventRecord,
  ): { awarded: boolean; progression: CaptainProgressionRecord };
  progression(accountId: string): CaptainProgressionRecord;
  appendEntitlementEvent(
    record: CaptainEntitlementEventRecord,
    event: CaptainLogEventRecord,
  ): boolean;
  entitlementEvents(accountId: string): CaptainEntitlementEventRecord[];
  appendEvent(event: CaptainLogEventRecord): void;
  events(accountId: string): CaptainLogEventRecord[];
}

export class InMemoryPassportStore implements PassportStore {
  readonly #accounts = new Map<string, PassportAccountRecord>();
  readonly #credentials = new Map<string, PassportCredentialRecord>();
  readonly #challenges = new Map<string, PassportChallengeRecord>();
  readonly #sessionsByHash = new Map<string, PassportSessionRecord>();
  readonly #recoveries = new Map<string, PassportRecoveryRecord>();
  readonly #emailIdentities = new Map<string, PassportEmailIdentityRecord>();
  readonly #emailLinksByHash = new Map<string, PassportEmailLinkRecord>();
  readonly #progression = new Map<string, CaptainProgressionRecord>();
  readonly #idempotencyKeys = new Set<string>();
  readonly #events: CaptainLogEventRecord[] = [];
  readonly #entitlementEvents: CaptainEntitlementEventRecord[] = [];

  saveChallenge(record: PassportChallengeRecord) {
    if (this.#challenges.has(record.ceremonyId)) throw new Error("Duplicate ceremony id.");
    this.#challenges.set(record.ceremonyId, copy(record));
  }

  claimChallenge(ceremonyId: string, purpose: PassportChallengePurpose, nowMs: number) {
    const record = this.#challenges.get(ceremonyId);
    if (!record || record.purpose !== purpose || record.consumedAtMs !== null || record.expiresAtMs < nowMs) {
      return null;
    }
    record.consumedAtMs = nowMs;
    return copy(record);
  }

  createAccount(
    account: PassportAccountRecord,
    credential: PassportCredentialRecord,
    recovery: PassportRecoveryRecord,
    session: PassportSessionRecord,
    event: CaptainLogEventRecord,
  ) {
    if (this.#accounts.has(account.accountId) || this.#credentials.has(credential.credentialId)) {
      throw new Error("Passport account or passkey already exists.");
    }
    this.#accounts.set(account.accountId, copy(account));
    this.#credentials.set(credential.credentialId, copy(credential));
    this.#recoveries.set(account.accountId, copy(recovery));
    this.#sessionsByHash.set(session.tokenHash, copy(session));
    this.#events.push(copy(event));
  }

  createEmailAccount(
    account: PassportAccountRecord,
    emailIdentity: PassportEmailIdentityRecord,
    recovery: PassportRecoveryRecord,
    session: PassportSessionRecord,
    event: CaptainLogEventRecord,
  ) {
    if (this.#accounts.has(account.accountId) || this.#emailIdentities.has(emailIdentity.emailKey)) {
      return false;
    }
    this.#accounts.set(account.accountId, copy(account));
    this.#emailIdentities.set(emailIdentity.emailKey, copy(emailIdentity));
    this.#recoveries.set(account.accountId, copy(recovery));
    this.#sessionsByHash.set(session.tokenHash, copy(session));
    this.#events.push(copy(event));
    return true;
  }

  account(accountId: string) {
    const value = this.#accounts.get(accountId);
    return value ? copy(value) : null;
  }

  credential(credentialId: string) {
    const value = this.#credentials.get(credentialId);
    return value ? copy(value) : null;
  }

  credentials(accountId: string) {
    return [...this.#credentials.values()]
      .filter((credential) => credential.accountId === accountId)
      .map(copy);
  }

  addCredential(credential: PassportCredentialRecord, event: CaptainLogEventRecord) {
    if (!this.#accounts.has(credential.accountId) || this.#credentials.has(credential.credentialId)) {
      return false;
    }
    this.#credentials.set(credential.credentialId, copy(credential));
    this.#events.push(copy(event));
    return true;
  }

  updateCredentialAfterAuthentication(
    credentialId: string,
    newCounter: number,
    backedUp: boolean,
    nowMs: number,
  ) {
    const credential = this.#credentials.get(credentialId);
    if (!credential || credential.revokedAtMs !== null) return false;
    if (newCounter < credential.counter) return false;
    credential.counter = newCounter;
    credential.backedUp = backedUp;
    credential.lastUsedAtMs = nowMs;
    return true;
  }

  saveSession(record: PassportSessionRecord) {
    if (this.#sessionsByHash.has(record.tokenHash)) throw new Error("Duplicate session token.");
    this.#sessionsByHash.set(record.tokenHash, copy(record));
  }

  sessionByHash(tokenHash: string) {
    const value = this.#sessionsByHash.get(tokenHash);
    return value ? copy(value) : null;
  }

  touchSession(tokenHash: string, nowMs: number) {
    const session = this.#sessionsByHash.get(tokenHash);
    if (!session || session.revokedAtMs !== null || session.expiresAtMs <= nowMs) return false;
    session.lastUsedAtMs = nowMs;
    return true;
  }

  revokeSession(accountId: string, sessionId: string, nowMs: number) {
    for (const session of this.#sessionsByHash.values()) {
      if (session.accountId === accountId && session.sessionId === sessionId && session.revokedAtMs === null) {
        session.revokedAtMs = nowMs;
        return true;
      }
    }
    return false;
  }

  sessions(accountId: string) {
    return [...this.#sessionsByHash.values()]
      .filter((session) => session.accountId === accountId)
      .map(copy)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }

  recovery(accountId: string) {
    const value = this.#recoveries.get(accountId);
    return value ? copy(value) : null;
  }

  recoverAccount(
    accountId: string,
    expectedVersion: number,
    replacement: PassportRecoveryRecord,
    replacementSession: PassportSessionRecord,
    event: CaptainLogEventRecord,
    nowMs: number,
  ) {
    const current = this.#recoveries.get(accountId);
    if (!current || current.version !== expectedVersion || current.usedAtMs !== null) return false;

    current.usedAtMs = nowMs;
    for (const credential of this.#credentials.values()) {
      if (credential.accountId === accountId && credential.revokedAtMs === null) credential.revokedAtMs = nowMs;
    }
    for (const session of this.#sessionsByHash.values()) {
      if (session.accountId === accountId && session.revokedAtMs === null) session.revokedAtMs = nowMs;
    }
    this.#recoveries.set(accountId, copy(replacement));
    this.#sessionsByHash.set(replacementSession.tokenHash, copy(replacementSession));
    this.#events.push(copy(event));
    return true;
  }

  emailIdentity(emailKey: string) {
    const value = this.#emailIdentities.get(emailKey);
    return value ? copy(value) : null;
  }

  addEmailIdentity(record: PassportEmailIdentityRecord) {
    if (
      !this.#accounts.has(record.accountId) ||
      this.#emailIdentities.has(record.emailKey) ||
      [...this.#emailIdentities.values()].some((identity) => identity.accountId === record.accountId)
    ) {
      return false;
    }
    this.#emailIdentities.set(record.emailKey, copy(record));
    return true;
  }

  saveEmailLink(record: PassportEmailLinkRecord) {
    if (this.#emailLinksByHash.has(record.tokenHash)) throw new Error("Duplicate email-link token.");
    this.#emailLinksByHash.set(record.tokenHash, copy(record));
  }

  claimEmailLink(tokenHash: string, nowMs: number) {
    const record = this.#emailLinksByHash.get(tokenHash);
    if (!record || record.consumedAtMs !== null || record.expiresAtMs < nowMs) return null;
    record.consumedAtMs = nowMs;
    return copy(record);
  }

  awardAuthoritativeLife(award: AuthoritativeLifeAward, event: CaptainLogEventRecord) {
    if (!this.#accounts.has(award.accountId)) {
      throw new Error("Cannot award progression to an unknown account.");
    }
    const current = this.progression(award.accountId);
    if (this.#idempotencyKeys.has(award.idempotencyKey)) {
      return { awarded: false, progression: current };
    }
    this.#idempotencyKeys.add(award.idempotencyKey);
    const progression: CaptainProgressionRecord = {
      accountId: award.accountId,
      xp: current.xp + award.xpDelta,
      completedRuns: current.completedRuns + 1,
      totalScore: current.totalScore + award.finalScore,
      lastAwardXp: award.xpDelta,
      updatedAtMs: award.occurredAtMs,
    };
    this.#progression.set(award.accountId, progression);
    this.#events.push(copy(event));
    return { awarded: true, progression: copy(progression) };
  }

  progression(accountId: string): CaptainProgressionRecord {
    return copy(this.#progression.get(accountId) ?? {
      accountId,
      ...EMPTY_PROGRESSION,
    });
  }

  appendEntitlementEvent(
    record: CaptainEntitlementEventRecord,
    event: CaptainLogEventRecord,
  ) {
    if (!this.#accounts.has(record.accountId)) {
      throw new Error("Cannot grant an entitlement to an unknown account.");
    }
    if (this.#entitlementEvents.some((event) =>
      event.eventId === record.eventId || event.idempotencyKey === record.idempotencyKey
    )) {
      return false;
    }
    if (record.reversesEventId) {
      const target = this.#entitlementEvents.find(
        (event) => event.eventId === record.reversesEventId,
      );
      if (
        !target ||
        target.accountId !== record.accountId ||
        target.productId !== record.productId ||
        target.action === "reverse"
      ) {
        throw new Error("Entitlement reversal target is invalid.");
      }
    }
    this.#entitlementEvents.push(copy(record));
    this.#events.push(copy(event));
    return true;
  }

  entitlementEvents(accountId: string) {
    return this.#entitlementEvents
      .filter((event) => event.accountId === accountId)
      .map(copy)
      .sort((first, second) =>
        first.occurredAtMs - second.occurredAtMs ||
        first.eventId.localeCompare(second.eventId)
      );
  }

  appendEvent(event: CaptainLogEventRecord) {
    if (event.idempotencyKey) {
      if (this.#idempotencyKeys.has(event.idempotencyKey)) return;
      this.#idempotencyKeys.add(event.idempotencyKey);
    }
    this.#events.push(copy(event));
  }

  events(accountId: string) {
    return this.#events.filter((event) => event.accountId === accountId).map(copy);
  }

  /** Test/audit snapshot: contains records as stored, never raw issued secrets. */
  auditSnapshot() {
    return copy({
      accounts: [...this.#accounts.values()],
      credentials: [...this.#credentials.values()],
      challenges: [...this.#challenges.values()],
      sessions: [...this.#sessionsByHash.values()],
      recoveries: [...this.#recoveries.values()],
      emailIdentities: [...this.#emailIdentities.values()],
      emailLinks: [...this.#emailLinksByHash.values()],
      progression: [...this.#progression.values()],
      entitlementEvents: this.#entitlementEvents,
      events: this.#events,
    });
  }
}

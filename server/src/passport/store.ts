import type {
  CaptainLogEventRecord,
  PassportAccountRecord,
  PassportChallengePurpose,
  PassportChallengeRecord,
  PassportCredentialRecord,
  PassportRecoveryRecord,
  PassportSessionRecord,
} from "./types";

function copy<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryPassportStore {
  readonly #accounts = new Map<string, PassportAccountRecord>();
  readonly #credentials = new Map<string, PassportCredentialRecord>();
  readonly #challenges = new Map<string, PassportChallengeRecord>();
  readonly #sessionsByHash = new Map<string, PassportSessionRecord>();
  readonly #recoveries = new Map<string, PassportRecoveryRecord>();
  readonly #events: CaptainLogEventRecord[] = [];

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

  appendEvent(event: CaptainLogEventRecord) {
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
      events: this.#events,
    });
  }
}

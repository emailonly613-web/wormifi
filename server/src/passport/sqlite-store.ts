import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from "@simplewebauthn/server";

import type { PassportStore } from "./store";
import type {
  AuthoritativeLifeAward,
  CaptainEntitlementEventRecord,
  CaptainLogEventRecord,
  CaptainProgressionRecord,
  PassportAccountRecord,
  PassportChallengePurpose,
  PassportChallengeRecord,
  PassportCredentialRecord,
  PassportEmailIdentityRecord,
  PassportEmailLinkRecord,
  PassportRecoveryRecord,
  PassportSessionRecord,
} from "./types";

type SqlRow = Record<string, unknown>;

const MIGRATIONS = [{
  version: 1,
  sql: readFileSync(
    new URL("./migrations/001_local_passport.sql", import.meta.url),
    "utf8",
  ),
}, {
  version: 2,
  sql: readFileSync(
    new URL("./migrations/002_entitlement_ledger.sql", import.meta.url),
    "utf8",
  ),
}];

function number(value: unknown): number {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : number(value);
}

function boolean(value: unknown): boolean {
  return number(value) === 1;
}

function changes(result: { changes: number | bigint }) {
  return number(result.changes);
}

function accountFrom(row: SqlRow): PassportAccountRecord {
  return {
    accountId: String(row.account_id),
    createdAtMs: number(row.created_at_ms),
  };
}

function credentialFrom(row: SqlRow): PassportCredentialRecord {
  return {
    credentialId: String(row.credential_id),
    accountId: String(row.account_id),
    publicKeyBase64Url: String(row.public_key_base64url),
    counter: number(row.signature_counter),
    transports: JSON.parse(String(row.transports_json)) as AuthenticatorTransportFuture[],
    deviceType: String(row.device_type) as CredentialDeviceType,
    backedUp: boolean(row.backed_up),
    createdAtMs: number(row.created_at_ms),
    lastUsedAtMs: nullableNumber(row.last_used_at_ms),
    revokedAtMs: nullableNumber(row.revoked_at_ms),
  };
}

function challengeFrom(row: SqlRow): PassportChallengeRecord {
  return {
    ceremonyId: String(row.ceremony_id),
    purpose: String(row.purpose) as PassportChallengePurpose,
    accountId: row.account_id === null ? null : String(row.account_id),
    expectedChallenge: String(row.expected_challenge),
    createdAtMs: number(row.created_at_ms),
    expiresAtMs: number(row.expires_at_ms),
    consumedAtMs: nullableNumber(row.consumed_at_ms),
  };
}

function sessionFrom(row: SqlRow): PassportSessionRecord {
  return {
    sessionId: String(row.session_id),
    accountId: String(row.account_id),
    tokenHash: String(row.token_hash),
    deviceLabel: String(row.device_label),
    createdAtMs: number(row.created_at_ms),
    lastUsedAtMs: number(row.last_used_at_ms),
    expiresAtMs: number(row.expires_at_ms),
    revokedAtMs: nullableNumber(row.revoked_at_ms),
  };
}

function recoveryFrom(row: SqlRow): PassportRecoveryRecord {
  return {
    accountId: String(row.account_id),
    version: number(row.version),
    salt: String(row.salt),
    codeHash: String(row.code_hash),
    createdAtMs: number(row.created_at_ms),
    usedAtMs: nullableNumber(row.used_at_ms),
  };
}

function emailIdentityFrom(row: SqlRow): PassportEmailIdentityRecord {
  return {
    emailKey: String(row.email_key),
    accountId: String(row.account_id),
    createdAtMs: number(row.created_at_ms),
    verifiedAtMs: number(row.verified_at_ms),
  };
}

function emailLinkFrom(row: SqlRow): PassportEmailLinkRecord {
  return {
    linkId: String(row.link_id),
    emailKey: String(row.email_key),
    accountId: row.account_id === null ? null : String(row.account_id),
    tokenHash: String(row.token_hash),
    createdAtMs: number(row.created_at_ms),
    expiresAtMs: number(row.expires_at_ms),
    consumedAtMs: nullableNumber(row.consumed_at_ms),
  };
}

function eventFrom(row: SqlRow): CaptainLogEventRecord {
  return {
    eventId: String(row.event_id),
    accountId: String(row.account_id),
    type: String(row.event_type) as CaptainLogEventRecord["type"],
    occurredAtMs: number(row.occurred_at_ms),
    detail: JSON.parse(String(row.detail_json)) as CaptainLogEventRecord["detail"],
    idempotencyKey: row.idempotency_key === null ? undefined : String(row.idempotency_key),
  };
}

function progressionFrom(row: SqlRow | undefined, accountId: string): CaptainProgressionRecord {
  if (!row) {
    return {
      accountId,
      xp: 0,
      completedRuns: 0,
      totalScore: 0,
      lastAwardXp: 0,
      updatedAtMs: 0,
    };
  }
  return {
    accountId: String(row.account_id),
    xp: number(row.xp),
    completedRuns: number(row.completed_runs),
    totalScore: number(row.total_score),
    lastAwardXp: number(row.last_award_xp),
    updatedAtMs: number(row.updated_at_ms),
  };
}

function entitlementEventFrom(row: SqlRow): CaptainEntitlementEventRecord {
  return {
    eventId: String(row.event_id),
    accountId: String(row.account_id),
    productId: String(row.product_id) as CaptainEntitlementEventRecord["productId"],
    action: String(row.action) as CaptainEntitlementEventRecord["action"],
    source: String(row.source) as CaptainEntitlementEventRecord["source"],
    occurredAtMs: number(row.occurred_at_ms),
    paidThroughMs: nullableNumber(row.paid_through_ms),
    reversesEventId: row.reverses_event_id === null
      ? null
      : String(row.reverses_event_id),
    externalReferenceHash: row.external_reference_hash === null
      ? null
      : String(row.external_reference_hash),
    idempotencyKey: String(row.idempotency_key),
  };
}

export class SqlitePassportStore implements PassportStore {
  readonly #database: DatabaseSync;

  constructor(filename: string) {
    this.#database = new DatabaseSync(filename);
    this.#database.exec("PRAGMA foreign_keys = ON");
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS passport_migrations (
        version INTEGER PRIMARY KEY,
        applied_at_ms INTEGER NOT NULL
      )
    `);
    this.#migrate();
  }

  close() {
    this.#database.close();
  }

  saveChallenge(record: PassportChallengeRecord) {
    this.#database.prepare(`
      INSERT INTO passport_challenges (
        ceremony_id, purpose, account_id, expected_challenge,
        created_at_ms, expires_at_ms, consumed_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.ceremonyId,
      record.purpose,
      record.accountId,
      record.expectedChallenge,
      record.createdAtMs,
      record.expiresAtMs,
      record.consumedAtMs,
    );
  }

  claimChallenge(ceremonyId: string, purpose: PassportChallengePurpose, nowMs: number) {
    return this.#transaction(() => {
      const result = this.#database.prepare(`
        UPDATE passport_challenges
        SET consumed_at_ms = ?
        WHERE ceremony_id = ?
          AND purpose = ?
          AND consumed_at_ms IS NULL
          AND expires_at_ms >= ?
      `).run(nowMs, ceremonyId, purpose, nowMs);
      if (changes(result) !== 1) return null;
      const row = this.#database.prepare(
        "SELECT * FROM passport_challenges WHERE ceremony_id = ?",
      ).get(ceremonyId) as SqlRow | undefined;
      return row ? challengeFrom(row) : null;
    });
  }

  createAccount(
    account: PassportAccountRecord,
    credential: PassportCredentialRecord,
    recovery: PassportRecoveryRecord,
    session: PassportSessionRecord,
    event: CaptainLogEventRecord,
  ) {
    this.#transaction(() => {
      this.#insertAccount(account);
      this.#insertCredential(credential);
      this.#insertRecovery(recovery);
      this.#insertSession(session);
      this.#insertEvent(event);
      this.#insertEmptyProgression(account.accountId);
    });
  }

  createEmailAccount(
    account: PassportAccountRecord,
    emailIdentity: PassportEmailIdentityRecord,
    recovery: PassportRecoveryRecord,
    session: PassportSessionRecord,
    event: CaptainLogEventRecord,
  ) {
    try {
      this.#transaction(() => {
        this.#insertAccount(account);
        this.#insertEmailIdentity(emailIdentity);
        this.#insertRecovery(recovery);
        this.#insertSession(session);
        this.#insertEvent(event);
        this.#insertEmptyProgression(account.accountId);
      });
      return true;
    } catch {
      return false;
    }
  }

  account(accountId: string) {
    const row = this.#database.prepare(
      "SELECT * FROM passport_accounts WHERE account_id = ?",
    ).get(accountId) as SqlRow | undefined;
    return row ? accountFrom(row) : null;
  }

  credential(credentialId: string) {
    const row = this.#database.prepare(
      "SELECT * FROM passport_credentials WHERE credential_id = ?",
    ).get(credentialId) as SqlRow | undefined;
    return row ? credentialFrom(row) : null;
  }

  credentials(accountId: string) {
    const rows = this.#database.prepare(`
      SELECT * FROM passport_credentials
      WHERE account_id = ?
      ORDER BY created_at_ms ASC
    `).all(accountId) as SqlRow[];
    return rows.map(credentialFrom);
  }

  addCredential(credential: PassportCredentialRecord, event: CaptainLogEventRecord) {
    try {
      this.#transaction(() => {
        this.#insertCredential(credential);
        this.#insertEvent(event);
      });
      return true;
    } catch {
      return false;
    }
  }

  updateCredentialAfterAuthentication(
    credentialId: string,
    newCounter: number,
    backedUp: boolean,
    nowMs: number,
  ) {
    const result = this.#database.prepare(`
      UPDATE passport_credentials
      SET signature_counter = ?, backed_up = ?, last_used_at_ms = ?
      WHERE credential_id = ?
        AND revoked_at_ms IS NULL
        AND signature_counter <= ?
    `).run(newCounter, backedUp ? 1 : 0, nowMs, credentialId, newCounter);
    return changes(result) === 1;
  }

  saveSession(record: PassportSessionRecord) {
    this.#insertSession(record);
  }

  sessionByHash(tokenHash: string) {
    const row = this.#database.prepare(
      "SELECT * FROM passport_sessions WHERE token_hash = ?",
    ).get(tokenHash) as SqlRow | undefined;
    return row ? sessionFrom(row) : null;
  }

  touchSession(tokenHash: string, nowMs: number) {
    const result = this.#database.prepare(`
      UPDATE passport_sessions
      SET last_used_at_ms = ?
      WHERE token_hash = ?
        AND revoked_at_ms IS NULL
        AND expires_at_ms > ?
    `).run(nowMs, tokenHash, nowMs);
    return changes(result) === 1;
  }

  revokeSession(accountId: string, sessionId: string, nowMs: number) {
    const result = this.#database.prepare(`
      UPDATE passport_sessions
      SET revoked_at_ms = ?
      WHERE account_id = ? AND session_id = ? AND revoked_at_ms IS NULL
    `).run(nowMs, accountId, sessionId);
    return changes(result) === 1;
  }

  sessions(accountId: string) {
    const rows = this.#database.prepare(`
      SELECT * FROM passport_sessions
      WHERE account_id = ?
      ORDER BY created_at_ms DESC
    `).all(accountId) as SqlRow[];
    return rows.map(sessionFrom);
  }

  recovery(accountId: string) {
    const row = this.#database.prepare(`
      SELECT * FROM passport_recovery_codes
      WHERE account_id = ? AND used_at_ms IS NULL
      ORDER BY version DESC LIMIT 1
    `).get(accountId) as SqlRow | undefined;
    return row ? recoveryFrom(row) : null;
  }

  recoverAccount(
    accountId: string,
    expectedVersion: number,
    replacement: PassportRecoveryRecord,
    replacementSession: PassportSessionRecord,
    event: CaptainLogEventRecord,
    nowMs: number,
  ) {
    return this.#transaction(() => {
      const result = this.#database.prepare(`
        UPDATE passport_recovery_codes
        SET used_at_ms = ?
        WHERE account_id = ? AND version = ? AND used_at_ms IS NULL
      `).run(nowMs, accountId, expectedVersion);
      if (changes(result) !== 1) return false;
      this.#database.prepare(`
        UPDATE passport_credentials
        SET revoked_at_ms = ?
        WHERE account_id = ? AND revoked_at_ms IS NULL
      `).run(nowMs, accountId);
      this.#database.prepare(`
        UPDATE passport_sessions
        SET revoked_at_ms = ?
        WHERE account_id = ? AND revoked_at_ms IS NULL
      `).run(nowMs, accountId);
      this.#insertRecovery(replacement);
      this.#insertSession(replacementSession);
      this.#insertEvent(event);
      return true;
    });
  }

  emailIdentity(emailKey: string) {
    const row = this.#database.prepare(
      "SELECT * FROM passport_email_identities WHERE email_key = ?",
    ).get(emailKey) as SqlRow | undefined;
    return row ? emailIdentityFrom(row) : null;
  }

  addEmailIdentity(record: PassportEmailIdentityRecord) {
    try {
      this.#insertEmailIdentity(record);
      return true;
    } catch {
      return false;
    }
  }

  saveEmailLink(record: PassportEmailLinkRecord) {
    this.#database.prepare(`
      INSERT INTO passport_email_links (
        link_id, email_key, account_id, token_hash,
        created_at_ms, expires_at_ms, consumed_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.linkId,
      record.emailKey,
      record.accountId,
      record.tokenHash,
      record.createdAtMs,
      record.expiresAtMs,
      record.consumedAtMs,
    );
  }

  claimEmailLink(tokenHash: string, nowMs: number) {
    return this.#transaction(() => {
      const result = this.#database.prepare(`
        UPDATE passport_email_links
        SET consumed_at_ms = ?
        WHERE token_hash = ?
          AND consumed_at_ms IS NULL
          AND expires_at_ms >= ?
      `).run(nowMs, tokenHash, nowMs);
      if (changes(result) !== 1) return null;
      const row = this.#database.prepare(
        "SELECT * FROM passport_email_links WHERE token_hash = ?",
      ).get(tokenHash) as SqlRow | undefined;
      return row ? emailLinkFrom(row) : null;
    });
  }

  awardAuthoritativeLife(award: AuthoritativeLifeAward, event: CaptainLogEventRecord) {
    return this.#transaction(() => {
      const inserted = changes(this.#database.prepare(`
        INSERT OR IGNORE INTO captain_log_events (
          event_id, account_id, event_type, occurred_at_ms, detail_json, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        event.eventId,
        event.accountId,
        event.type,
        event.occurredAtMs,
        JSON.stringify(event.detail),
        award.idempotencyKey,
      )) === 1;
      if (inserted) {
        this.#database.prepare(`
          UPDATE captain_progression
          SET xp = xp + ?,
              completed_runs = completed_runs + 1,
              total_score = total_score + ?,
              last_award_xp = ?,
              updated_at_ms = ?
          WHERE account_id = ?
        `).run(
          award.xpDelta,
          award.finalScore,
          award.xpDelta,
          award.occurredAtMs,
          award.accountId,
        );
      }
      return {
        awarded: inserted,
        progression: this.progression(award.accountId),
      };
    });
  }

  progression(accountId: string) {
    const row = this.#database.prepare(
      "SELECT * FROM captain_progression WHERE account_id = ?",
    ).get(accountId) as SqlRow | undefined;
    return progressionFrom(row, accountId);
  }

  appendEntitlementEvent(
    record: CaptainEntitlementEventRecord,
    event: CaptainLogEventRecord,
  ) {
    try {
      return this.#transaction(() => {
        if (record.reversesEventId) {
          const target = this.#database.prepare(`
            SELECT account_id, product_id, action
            FROM captain_entitlement_events
            WHERE event_id = ?
          `).get(record.reversesEventId) as SqlRow | undefined;
          if (
            !target ||
            String(target.account_id) !== record.accountId ||
            String(target.product_id) !== record.productId ||
            String(target.action) === "reverse"
          ) {
            throw new Error("Entitlement reversal target is invalid.");
          }
        }
        const result = this.#database.prepare(`
          INSERT OR IGNORE INTO captain_entitlement_events (
            event_id, account_id, product_id, action, source, occurred_at_ms,
            paid_through_ms, reverses_event_id, external_reference_hash,
            idempotency_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          record.eventId,
          record.accountId,
          record.productId,
          record.action,
          record.source,
          record.occurredAtMs,
          record.paidThroughMs,
          record.reversesEventId,
          record.externalReferenceHash,
          record.idempotencyKey,
        );
        const inserted = changes(result) === 1;
        if (inserted) this.#insertEvent(event);
        return inserted;
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed: captain_entitlement_events")
      ) {
        return false;
      }
      throw error;
    }
  }

  entitlementEvents(accountId: string) {
    const rows = this.#database.prepare(`
      SELECT * FROM captain_entitlement_events
      WHERE account_id = ?
      ORDER BY occurred_at_ms ASC, event_id ASC
    `).all(accountId) as SqlRow[];
    return rows.map(entitlementEventFrom);
  }

  appendEvent(event: CaptainLogEventRecord) {
    if (event.idempotencyKey) {
      this.#database.prepare(`
        INSERT OR IGNORE INTO captain_log_events (
          event_id, account_id, event_type, occurred_at_ms, detail_json, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        event.eventId,
        event.accountId,
        event.type,
        event.occurredAtMs,
        JSON.stringify(event.detail),
        event.idempotencyKey,
      );
      return;
    }
    this.#insertEvent(event);
  }

  events(accountId: string) {
    const rows = this.#database.prepare(`
      SELECT * FROM captain_log_events
      WHERE account_id = ?
      ORDER BY occurred_at_ms DESC, event_id DESC
    `).all(accountId) as SqlRow[];
    return rows.map(eventFrom);
  }

  #migrate() {
    for (const migration of MIGRATIONS) {
      const applied = this.#database.prepare(
        "SELECT version FROM passport_migrations WHERE version = ?",
      ).get(migration.version);
      if (applied) continue;
      this.#transaction(() => {
        this.#database.exec(migration.sql);
        this.#database.prepare(
          "INSERT INTO passport_migrations (version, applied_at_ms) VALUES (?, ?)",
        ).run(migration.version, Date.now());
      });
    }
  }

  #transaction<T>(operation: () => T): T {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.#database.exec("COMMIT");
      return result;
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  #insertAccount(account: PassportAccountRecord) {
    this.#database.prepare(
      "INSERT INTO passport_accounts (account_id, created_at_ms) VALUES (?, ?)",
    ).run(account.accountId, account.createdAtMs);
  }

  #insertCredential(credential: PassportCredentialRecord) {
    this.#database.prepare(`
      INSERT INTO passport_credentials (
        credential_id, account_id, public_key_base64url, signature_counter,
        transports_json, device_type, backed_up, created_at_ms,
        last_used_at_ms, revoked_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      credential.credentialId,
      credential.accountId,
      credential.publicKeyBase64Url,
      credential.counter,
      JSON.stringify(credential.transports),
      credential.deviceType,
      credential.backedUp ? 1 : 0,
      credential.createdAtMs,
      credential.lastUsedAtMs,
      credential.revokedAtMs,
    );
  }

  #insertRecovery(recovery: PassportRecoveryRecord) {
    this.#database.prepare(`
      INSERT INTO passport_recovery_codes (
        account_id, version, salt, code_hash, created_at_ms, used_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      recovery.accountId,
      recovery.version,
      recovery.salt,
      recovery.codeHash,
      recovery.createdAtMs,
      recovery.usedAtMs,
    );
  }

  #insertSession(session: PassportSessionRecord) {
    this.#database.prepare(`
      INSERT INTO passport_sessions (
        session_id, account_id, token_hash, device_label,
        created_at_ms, last_used_at_ms, expires_at_ms, revoked_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.sessionId,
      session.accountId,
      session.tokenHash,
      session.deviceLabel,
      session.createdAtMs,
      session.lastUsedAtMs,
      session.expiresAtMs,
      session.revokedAtMs,
    );
  }

  #insertEmailIdentity(identity: PassportEmailIdentityRecord) {
    this.#database.prepare(`
      INSERT INTO passport_email_identities (
        email_key, account_id, created_at_ms, verified_at_ms
      ) VALUES (?, ?, ?, ?)
    `).run(
      identity.emailKey,
      identity.accountId,
      identity.createdAtMs,
      identity.verifiedAtMs,
    );
  }

  #insertEvent(event: CaptainLogEventRecord) {
    this.#database.prepare(`
      INSERT INTO captain_log_events (
        event_id, account_id, event_type, occurred_at_ms, detail_json, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      event.eventId,
      event.accountId,
      event.type,
      event.occurredAtMs,
      JSON.stringify(event.detail),
      event.idempotencyKey ?? null,
    );
  }

  #insertEmptyProgression(accountId: string) {
    this.#database.prepare(
      "INSERT INTO captain_progression (account_id) VALUES (?)",
    ).run(accountId);
  }
}

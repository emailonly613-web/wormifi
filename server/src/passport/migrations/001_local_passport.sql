CREATE TABLE IF NOT EXISTS passport_accounts (
  account_id TEXT PRIMARY KEY,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS passport_credentials (
  credential_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  public_key_base64url TEXT NOT NULL,
  signature_counter INTEGER NOT NULL CHECK (signature_counter >= 0),
  transports_json TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up INTEGER NOT NULL CHECK (backed_up IN (0, 1)),
  created_at_ms INTEGER NOT NULL,
  last_used_at_ms INTEGER,
  revoked_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS passport_challenges (
  ceremony_id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('enrollment', 'passkey_addition', 'authentication')),
  account_id TEXT,
  expected_challenge TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  consumed_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS passport_sessions (
  session_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  last_used_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS passport_recovery_codes (
  account_id TEXT NOT NULL REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  salt TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  used_at_ms INTEGER,
  PRIMARY KEY (account_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS passport_one_active_recovery_code
  ON passport_recovery_codes (account_id)
  WHERE used_at_ms IS NULL;

CREATE TABLE IF NOT EXISTS passport_email_identities (
  email_key TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  created_at_ms INTEGER NOT NULL,
  verified_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS passport_email_links (
  link_id TEXT PRIMARY KEY,
  email_key TEXT NOT NULL,
  account_id TEXT REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  consumed_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS captain_log_events (
  event_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  occurred_at_ms INTEGER NOT NULL,
  detail_json TEXT NOT NULL,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS captain_progression (
  account_id TEXT PRIMARY KEY REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  completed_runs INTEGER NOT NULL DEFAULT 0 CHECK (completed_runs >= 0),
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  last_award_xp INTEGER NOT NULL DEFAULT 0 CHECK (last_award_xp >= 0),
  updated_at_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS passport_sessions_account_active
  ON passport_sessions (account_id, expires_at_ms DESC)
  WHERE revoked_at_ms IS NULL;

CREATE INDEX IF NOT EXISTS captain_log_account_time
  ON captain_log_events (account_id, occurred_at_ms DESC);

CREATE INDEX IF NOT EXISTS passport_email_links_expiry
  ON passport_email_links (expires_at_ms)
  WHERE consumed_at_ms IS NULL;

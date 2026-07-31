-- Captain Passport PostgreSQL contract. This migration is local-only until the
-- owner approves a durable database. It intentionally stores no email,
-- password, display name, payment card, or analytics identifier.

CREATE TABLE passport_accounts (
  account_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE passport_credentials (
  credential_id text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  public_key bytea NOT NULL,
  signature_counter bigint NOT NULL CHECK (signature_counter >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  device_type text NOT NULL CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up boolean NOT NULL,
  created_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE passport_challenges (
  ceremony_id text PRIMARY KEY,
  purpose text NOT NULL CHECK (purpose IN ('enrollment', 'passkey_addition', 'authentication')),
  account_id uuid,
  expected_challenge text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK ((purpose IN ('enrollment', 'passkey_addition') AND account_id IS NOT NULL) OR purpose = 'authentication')
);

CREATE TABLE passport_sessions (
  session_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_label text NOT NULL CHECK (length(device_label) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE TABLE passport_recovery_codes (
  account_id uuid NOT NULL REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  salt text NOT NULL,
  code_hash text NOT NULL,
  created_at timestamptz NOT NULL,
  used_at timestamptz,
  PRIMARY KEY (account_id, version)
);

CREATE UNIQUE INDEX passport_one_active_recovery_code
  ON passport_recovery_codes (account_id)
  WHERE used_at IS NULL;

CREATE TABLE captain_log_events (
  event_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  idempotency_key text UNIQUE
);

CREATE INDEX passport_sessions_account_active
  ON passport_sessions (account_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX captain_log_account_time
  ON captain_log_events (account_id, occurred_at DESC);

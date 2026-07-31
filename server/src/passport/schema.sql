-- Captain Passport PostgreSQL contract. This migration is local-only until the
-- owner approves a durable database. Optional email-link identity stores only a
-- keyed address digest; raw email, passwords, display names, payment cards, and
-- analytics identifiers are not durable account fields.

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

CREATE TABLE passport_email_identities (
  email_key text PRIMARY KEY,
  account_id uuid NOT NULL UNIQUE REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  verified_at timestamptz NOT NULL
);

CREATE TABLE passport_email_links (
  link_id uuid PRIMARY KEY,
  email_key text NOT NULL,
  account_id uuid REFERENCES passport_accounts(account_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE captain_log_events (
  event_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  idempotency_key text UNIQUE
);

CREATE TABLE captain_progression (
  account_id uuid PRIMARY KEY REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  xp bigint NOT NULL DEFAULT 0 CHECK (xp >= 0),
  completed_runs bigint NOT NULL DEFAULT 0 CHECK (completed_runs >= 0),
  total_score bigint NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  last_award_xp integer NOT NULL DEFAULT 0 CHECK (last_award_xp >= 0),
  updated_at timestamptz
);

CREATE TABLE captain_entitlement_events (
  event_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  product_id text NOT NULL CHECK (
    product_id IN ('captain-club-monthly-v1', 'legend-voyage-lifetime-v1')
  ),
  action text NOT NULL CHECK (
    action IN ('grant', 'renew', 'cancel_at_period_end', 'reverse', 'correct')
  ),
  source text NOT NULL CHECK (
    source IN ('local_test', 'operator_correction', 'payment_provider')
  ),
  occurred_at timestamptz NOT NULL,
  paid_through_at timestamptz,
  reverses_event_id uuid REFERENCES captain_entitlement_events(event_id) ON DELETE RESTRICT,
  external_reference_hash text,
  idempotency_key text NOT NULL UNIQUE,
  CHECK (
    (action = 'reverse' AND reverses_event_id IS NOT NULL) OR
    (action <> 'reverse' AND reverses_event_id IS NULL)
  )
);

CREATE INDEX passport_sessions_account_active
  ON passport_sessions (account_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX captain_log_account_time
  ON captain_log_events (account_id, occurred_at DESC);

CREATE INDEX captain_entitlements_account_time
  ON captain_entitlement_events (account_id, occurred_at, event_id);

CREATE UNIQUE INDEX captain_entitlements_external_reference
  ON captain_entitlement_events (source, external_reference_hash)
  WHERE external_reference_hash IS NOT NULL;

CREATE INDEX passport_email_links_expiry
  ON passport_email_links (expires_at)
  WHERE consumed_at IS NULL;

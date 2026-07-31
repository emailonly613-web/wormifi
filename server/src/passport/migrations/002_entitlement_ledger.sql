CREATE TABLE IF NOT EXISTS captain_entitlement_events (
  event_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES passport_accounts(account_id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL CHECK (
    product_id IN ('captain-club-monthly-v1', 'legend-voyage-lifetime-v1')
  ),
  action TEXT NOT NULL CHECK (
    action IN ('grant', 'renew', 'cancel_at_period_end', 'reverse', 'correct')
  ),
  source TEXT NOT NULL CHECK (
    source IN ('local_test', 'operator_correction', 'payment_provider')
  ),
  occurred_at_ms INTEGER NOT NULL,
  paid_through_ms INTEGER,
  reverses_event_id TEXT REFERENCES captain_entitlement_events(event_id) ON DELETE RESTRICT,
  external_reference_hash TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  CHECK (
    (action = 'reverse' AND reverses_event_id IS NOT NULL) OR
    (action <> 'reverse' AND reverses_event_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS captain_entitlements_account_time
  ON captain_entitlement_events (account_id, occurred_at_ms, event_id);

CREATE UNIQUE INDEX IF NOT EXISTS captain_entitlements_external_reference
  ON captain_entitlement_events (source, external_reference_hash)
  WHERE external_reference_hash IS NOT NULL;

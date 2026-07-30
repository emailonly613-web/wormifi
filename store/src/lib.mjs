/**
 * Pure helpers for the Founder's Pack store service. No IO here — everything
 * in this file is unit-testable without the network or Stripe.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const FOUNDER_PACK_PRICE_USD_CENTS = 299;
export const FOUNDER_PACK_PRODUCT_NAME = "Wormifi Founder's Pack";
export const FOUNDER_PACK_PRODUCT_DESCRIPTION =
  "Kraken's Ink, Phoenix Wake and Leviathan Scale — three legend skins, unlocked forever on your device.";

/** Stripe's form encoding: nested keys become bracketed field names. */
export function formEncode(fields) {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

/**
 * The complete Checkout Session request body. price_data is inline, so no
 * dashboard product setup exists to drift from the code.
 */
export function checkoutSessionFields(publicOrigin) {
  return {
    mode: "payment",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": FOUNDER_PACK_PRICE_USD_CENTS,
    "line_items[0][price_data][product_data][name]": FOUNDER_PACK_PRODUCT_NAME,
    "line_items[0][price_data][product_data][description]": FOUNDER_PACK_PRODUCT_DESCRIPTION,
    success_url: `${publicOrigin}/?founder_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicOrigin}/?store=cancelled`,
  };
}

/** Checkout session ids are the only client input; validate hard. */
export function isValidSessionId(value) {
  return typeof value === "string" && /^cs_[A-Za-z0-9_]{8,128}$/.test(value);
}

export function mintGrantToken(sessionId, secret) {
  return createHmac("sha256", secret).update(`founder-pack:${sessionId}`).digest("hex");
}

export function verifyGrantToken(sessionId, token, secret) {
  if (!isValidSessionId(sessionId) || typeof token !== "string") return false;
  const expected = Buffer.from(mintGrantToken(sessionId, secret), "utf8");
  const provided = Buffer.from(token, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/** Key mode is public knowledge (it prefixes the key); customers may see it. */
export function stripeKeyMode(secretKey) {
  if (typeof secretKey !== "string" || secretKey.length === 0) return "absent";
  if (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_")) return "test";
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) return "live";
  return "unknown";
}

/** Fixed-window per-IP throttle; small and resettable, for a tiny surface. */
export function createRateLimiter(limit, windowMs) {
  const hits = new Map();
  return function allow(key, now) {
    const entry = hits.get(key);
    if (!entry || now - entry.startedAt >= windowMs) {
      hits.set(key, { startedAt: now, count: 1 });
      return true;
    }
    entry.count += 1;
    if (hits.size > 10_000) hits.clear();
    return entry.count <= limit;
  };
}

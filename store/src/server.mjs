/**
 * Founder's Pack store service.
 *
 * Three routes behind the /store ingress prefix, zero runtime dependencies:
 *   GET  /store/healthz  → { ok, product, mode }   (mode: test | live)
 *   POST /store/checkout → { url }                 (Stripe-hosted checkout)
 *   GET  /store/verify?session_id=cs_…
 *                        → { granted, token? }     (paid → HMAC unlock grant)
 *
 * Money truth lives at Stripe: verify re-reads the session from Stripe's API
 * on every call, so a grant can only ever be minted from a session Stripe
 * itself reports as paid. This service stores nothing.
 */
import { createServer } from "node:http";
import {
  checkoutSessionFields,
  createRateLimiter,
  formEncode,
  isValidSessionId,
  mintGrantToken,
  stripeKeyMode,
} from "./lib.mjs";

const port = Number(process.env.PORT ?? 8090);
const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
const unlockSecret = process.env.WORMIFI_UNLOCK_SECRET ?? "";
const publicOrigin = process.env.WORMIFI_PUBLIC_ORIGIN ?? "https://wormifi.com";
const mode = stripeKeyMode(stripeKey);

if (!stripeKey || !unlockSecret) {
  // Fail loud at boot: a store that cannot fulfill must never half-run.
  console.error("store: STRIPE_SECRET_KEY and WORMIFI_UNLOCK_SECRET are required");
  process.exit(1);
}

const allowCheckout = createRateLimiter(12, 60_000);
const allowVerify = createRateLimiter(30, 60_000);

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(payload);
}

async function stripeRequest(method, path, body) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${stripeKey}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const clientIp = String(request.headers["do-connecting-ip"] ?? request.socket.remoteAddress ?? "unknown");

  try {
    if (request.method === "GET" && url.pathname === "/store/healthz") {
      json(response, 200, { ok: true, product: "founder-pack", mode });
      return;
    }

    if (request.method === "POST" && url.pathname === "/store/checkout") {
      if (!allowCheckout(clientIp, Date.now())) {
        json(response, 429, { error: "Too many checkout attempts. Try again in a minute." });
        return;
      }
      const result = await stripeRequest(
        "POST",
        "/v1/checkout/sessions",
        formEncode(checkoutSessionFields(publicOrigin)),
      );
      if (result.status !== 200 || typeof result.data?.url !== "string") {
        console.error("store: checkout create failed", result.status, result.data?.error?.message);
        json(response, 502, { error: "Checkout is unavailable right now. Nothing was charged." });
        return;
      }
      json(response, 200, { url: result.data.url });
      return;
    }

    if (request.method === "GET" && url.pathname === "/store/verify") {
      if (!allowVerify(clientIp, Date.now())) {
        json(response, 429, { error: "Too many attempts. Try again in a minute." });
        return;
      }
      const sessionId = url.searchParams.get("session_id") ?? "";
      if (!isValidSessionId(sessionId)) {
        json(response, 400, { granted: false, error: "That receipt reference is not valid." });
        return;
      }
      const result = await stripeRequest("GET", `/v1/checkout/sessions/${sessionId}`);
      if (result.status !== 200) {
        json(response, 404, { granted: false, error: "That purchase could not be found." });
        return;
      }
      if (result.data?.payment_status !== "paid") {
        json(response, 200, { granted: false, status: String(result.data?.payment_status ?? "unpaid") });
        return;
      }
      json(response, 200, {
        granted: true,
        token: mintGrantToken(sessionId, unlockSecret),
        sessionId,
      });
      return;
    }

    json(response, 404, { error: "Not found." });
  } catch (error) {
    console.error("store: request failed", error);
    json(response, 500, { error: "The store hit a problem. Nothing was charged." });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`wormifi-store listening on :${port} (${mode} mode)`);
});

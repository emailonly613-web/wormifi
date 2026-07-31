/**
 * Founder's Pack store service.
 *
 * Three routes behind the /store ingress prefix, zero runtime dependencies:
 *   GET  /store/healthz  -> explicit locked/non-purchasable status
 *   POST /store/checkout -> 503 research-only response
 *   GET  /store/verify   -> 503 research-only response
 *
 * This legacy service is a hard money lock. It has no environment switch and
 * no Stripe request path. A future private payment sandbox must replace this
 * service only after the ordered Captain Passport gates pass.
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(payload);
}

export function createStoreServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (request.method === "GET" && url.pathname === "/store/healthz") {
        json(response, 200, {
          ok: true,
          product: "founder-pack",
          mode: "locked",
          checkoutEnabled: false,
          purchasable: false,
        });
        return;
      }

      if (
        (request.method === "POST" && url.pathname === "/store/checkout") ||
        (request.method === "GET" && url.pathname === "/store/verify")
      ) {
        json(response, 503, {
          granted: false,
          purchasable: false,
          error: "Legend Voyage is research only. Checkout is not available.",
        });
        return;
      }

      json(response, 404, { error: "Not found." });
    } catch (error) {
      console.error("store: request failed", error);
      json(response, 500, { error: "The store hit a problem. Nothing was charged." });
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT ?? 8090);
  let server;
  try {
    server = createStoreServer();
  } catch (error) {
    console.error("store: refused to boot", error instanceof Error ? error.message : error);
    process.exit(1);
  }
  server.listen(port, "0.0.0.0", () => {
    const address = server.address();
    const listeningPort = typeof address === "object" && address ? address.port : port;
    console.log(`wormifi-store listening on :${listeningPort} (checkout locked)`);
  });
}

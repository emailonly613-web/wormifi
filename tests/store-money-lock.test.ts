import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { createStoreServer } from "../store/src/server.mjs";

const servers: ReturnType<typeof createStoreServer>[] = [];

async function lockedStore() {
  const server = createStoreServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${port}` };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

describe("public money lock", () => {
  it("boots without payment secrets and reports the hard boundary", async () => {
    const { origin } = await lockedStore();
    const response = await fetch(`${origin}/store/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      mode: "locked",
      checkoutEnabled: false,
      purchasable: false,
    });
  });

  it.each([
    ["POST", "/store/checkout"],
    ["GET", "/store/verify?session_id=cs_test_12345678"],
  ])("rejects %s %s with no enable path", async (method, path) => {
    const { origin } = await lockedStore();
    const response = await fetch(`${origin}${path}`, { method });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      granted: false,
      purchasable: false,
    });
  });
});

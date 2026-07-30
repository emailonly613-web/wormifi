const GIT_REVISION = /^[0-9a-f]{7,64}$/u;

function fail(message) {
  console.error(`WORMIFI_DEPLOYMENT_IDENTITY_MISS ${message}`);
  process.exitCode = 1;
}

async function readJson(response, label) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${label} did not return JSON (${contentType || "no content-type"})`);
  }
  return response.json();
}

const argumentsAfterSeparator = process.argv.slice(2).filter((argument) => argument !== "--");
const baseUrl = argumentsAfterSeparator[0];
const expectedRevision = argumentsAfterSeparator[1]?.trim().toLowerCase();

if (!baseUrl || !expectedRevision) {
  fail("usage: node scripts/verify-deployment-identity.mjs <base-url> <git-sha>");
} else if (!GIT_REVISION.test(expectedRevision)) {
  fail("expected revision is not a 7-64 character hexadecimal Git revision");
} else {
  try {
    const origin = new URL(baseUrl);
    const [clientResponse, serverResponse] = await Promise.all([
      fetch(new URL(`/build-info.json?candidate=${expectedRevision}`, origin), { cache: "no-store" }),
      fetch(new URL("/healthz", origin), { cache: "no-store" }),
    ]);

    if (!clientResponse.ok || !serverResponse.ok) {
      throw new Error(`HTTP client=${clientResponse.status} server=${serverResponse.status}`);
    }

    const [client, server] = await Promise.all([
      readJson(clientResponse, "client build identity"),
      readJson(serverResponse, "server health identity"),
    ]);
    const failures = [];

    if (client?.product !== "wormifi") failures.push("client product");
    if (client?.protocolVersion !== 5) failures.push("client protocol");
    if (client?.buildRevision !== expectedRevision) failures.push("client revision");
    if (server?.ok !== true || server?.authority !== "server") failures.push("server health");
    if (server?.protocolVersion !== 5) failures.push("server protocol");
    if (server?.buildRevision !== expectedRevision) failures.push("server revision");

    if (failures.length > 0) {
      fail(failures.join(", "));
    } else {
      console.log(
        `WORMIFI_DEPLOYMENT_IDENTITY_PASS revision=${expectedRevision} protocol=5 origin=${origin.origin}`,
      );
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

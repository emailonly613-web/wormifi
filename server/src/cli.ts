import { AuthoritativeArenaServer } from "./server.ts";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const host = process.env.HOST ?? "0.0.0.0";
const targetPopulation = Number.parseInt(process.env.TARGET_POPULATION ?? "24", 10);
const targetDropCount = Number.parseInt(process.env.TARGET_DROP_COUNT ?? "720", 10);
const snapshotHz = Number.parseInt(process.env.SNAPSHOT_HZ ?? "15", 10);
const arenaRadius = Number.parseInt(process.env.ARENA_RADIUS ?? "1850", 10);
const server = new AuthoritativeArenaServer({
  host,
  port,
  targetPopulation,
  targetDropCount,
  snapshotHz,
  arenaRadius,
});
const started = await server.start();

process.stdout.write(`Wormifi authoritative server listening on ${started.websocketUrl}\n`);

async function shutdown(): Promise<void> {
  await server.stop();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

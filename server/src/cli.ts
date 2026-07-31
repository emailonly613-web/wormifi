import { AuthoritativeArenaServer } from "./server.ts";
import { DEFAULT_PLAYER_INTEREST_RADIUS } from "./room.ts";
import { LIVE_SPATIAL_PROFILE } from "../../src/game/spatialFeel.ts";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const host = process.env.HOST ?? "0.0.0.0";
const targetPopulation = Number.parseInt(
  process.env.TARGET_POPULATION ?? String(LIVE_SPATIAL_PROFILE.targetPopulation),
  10,
);
const maxHumanPlayers = Number.parseInt(
  process.env.MAX_HUMAN_PLAYERS_PER_ROOM ?? String(targetPopulation),
  10,
);
const targetDropCount = Number.parseInt(
  process.env.TARGET_DROP_COUNT ?? String(LIVE_SPATIAL_PROFILE.targetDropCount),
  10,
);
const snapshotHz = Number.parseInt(process.env.SNAPSHOT_HZ ?? "15", 10);
const arenaRadius = Number.parseInt(
  process.env.ARENA_RADIUS ?? String(LIVE_SPATIAL_PROFILE.arenaRadius),
  10,
);
const playerInterestRadius = Number.parseInt(
  process.env.PLAYER_INTEREST_RADIUS ?? String(DEFAULT_PLAYER_INTEREST_RADIUS),
  10,
);
const server = new AuthoritativeArenaServer({
  host,
  port,
  targetPopulation,
  maxHumanPlayers,
  targetDropCount,
  snapshotHz,
  arenaRadius,
  playerInterestRadius,
});
const started = await server.start();

process.stdout.write(`Wormifi authoritative server listening on ${started.websocketUrl}\n`);

async function shutdown(): Promise<void> {
  await server.stop();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

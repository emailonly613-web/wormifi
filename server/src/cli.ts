import { AuthoritativeArenaServer } from "./server.ts";
import { DEFAULT_PLAYER_INTEREST_RADIUS } from "./room.ts";
import { LIVE_SPATIAL_PROFILE } from "../../src/game/spatialFeel.ts";
import { PassportHttpApi } from "./passport/http.ts";
import { CaptainPassportService } from "./passport/service.ts";
import { SqlitePassportStore } from "./passport/sqlite-store.ts";
import { WormifiWebAuthn } from "./passport/webauthn.ts";

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
const passportDatabasePath = process.env.PASSPORT_DB_PATH?.trim();
let passportStore: SqlitePassportStore | undefined;
let passport: PassportHttpApi | undefined;
if (passportDatabasePath) {
  const pepper = process.env.PASSPORT_PEPPER;
  if (!pepper) throw new Error("PASSPORT_PEPPER is required when PASSPORT_DB_PATH is set.");
  const expectedOrigin = process.env.PASSPORT_EXPECTED_ORIGIN ?? "http://localhost:4173";
  const rpId = process.env.PASSPORT_RP_ID ?? new URL(expectedOrigin).hostname;
  const allowedOrigins = (process.env.PASSPORT_ALLOWED_ORIGINS ?? expectedOrigin)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  passportStore = new SqlitePassportStore(passportDatabasePath);
  const passportService = new CaptainPassportService(
    passportStore,
    new WormifiWebAuthn({ rpId, expectedOrigin }),
    pepper,
    { emailCompletionUrl: expectedOrigin },
  );
  passport = new PassportHttpApi({
    service: passportService,
    allowedOrigins,
    emailEnabled: false,
    secureCookies: new URL(expectedOrigin).protocol === "https:",
  });
}
const server = new AuthoritativeArenaServer({
  host,
  port,
  targetPopulation,
  maxHumanPlayers,
  targetDropCount,
  snapshotHz,
  arenaRadius,
  playerInterestRadius,
  passport,
});
const started = await server.start();

process.stdout.write(`Wormifi authoritative server listening on ${started.websocketUrl}\n`);

async function shutdown(): Promise<void> {
  await server.stop();
  passportStore?.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

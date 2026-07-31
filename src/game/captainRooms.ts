import type { GameBoardConfig } from "./types";
import { OPEN_SEAS_BOARD } from "./chargingStations";

export type CaptainRoomTierId =
  | "captain-room-10-session-v1"
  | "captain-room-20-session-v1"
  | "captain-room-30-session-v1";

export interface CaptainRoomTier {
  id: CaptainRoomTierId;
  label: string;
  humanSeats: 10 | 20 | 30;
  launchPriceUsdCents: 0;
  launchAccess: "free";
  arenaRadius: number;
  targetDropCount: number;
  boardId: `captain-cove-${10 | 20 | 30}`;
}

export const CAPTAIN_ROOM_TIERS = Object.freeze([
  Object.freeze({
    id: "captain-room-10-session-v1",
    label: "PRIVATE CREW",
    humanSeats: 10,
    launchPriceUsdCents: 0,
    launchAccess: "free",
    arenaRadius: 1_250,
    targetDropCount: 90,
    boardId: "captain-cove-10",
  }),
  Object.freeze({
    id: "captain-room-20-session-v1",
    label: "FLEET ROOM",
    humanSeats: 20,
    launchPriceUsdCents: 0,
    launchAccess: "free",
    arenaRadius: 1_650,
    targetDropCount: 150,
    boardId: "captain-cove-20",
  }),
  Object.freeze({
    id: "captain-room-30-session-v1",
    label: "GRAND ARMADA",
    humanSeats: 30,
    launchPriceUsdCents: 0,
    launchAccess: "free",
    arenaRadius: 2_050,
    targetDropCount: 210,
    boardId: "captain-cove-30",
  }),
] satisfies readonly CaptainRoomTier[]);

const CAPTAIN_ROOM_ID_PATTERN = /^captain-(10|20|30)-([a-f0-9]{20})$/u;

const tierIdBySeats = Object.freeze({
  10: "captain-room-10-session-v1",
  20: "captain-room-20-session-v1",
  30: "captain-room-30-session-v1",
} satisfies Record<10 | 20 | 30, CaptainRoomTierId>);

export function getCaptainRoomTier(id: CaptainRoomTierId): CaptainRoomTier {
  const tier = CAPTAIN_ROOM_TIERS.find((candidate) => candidate.id === id);
  if (!tier) throw new Error(`Unknown Captain Room tier: ${id}`);
  return tier;
}

export function createCaptainRoomId(
  tierId: CaptainRoomTierId,
  randomWords = crypto.getRandomValues(new Uint32Array(3)),
): string {
  const tier = getCaptainRoomTier(tierId);
  const entropy = Array.from(randomWords)
    .slice(0, 3)
    .map((word) => (word >>> 0).toString(16).padStart(8, "0"))
    .join("")
    .padEnd(20, "0")
    .slice(0, 20);
  return `captain-${tier.humanSeats}-${entropy}`;
}

export function captainRoomTierFromRoomId(
  roomId: string | null | undefined,
): CaptainRoomTier | undefined {
  const match = CAPTAIN_ROOM_ID_PATTERN.exec((roomId ?? "").trim().toLowerCase());
  if (!match) return undefined;
  const seats = Number(match[1]) as 10 | 20 | 30;
  return getCaptainRoomTier(tierIdBySeats[seats]);
}

export function buildCaptainRoomInviteUrl(
  roomId: string,
  href = "https://wormifi.com/",
): string {
  if (!captainRoomTierFromRoomId(roomId)) {
    throw new Error(`Invalid free Captain Room id: ${roomId}`);
  }
  const url = new URL(href);
  for (const key of ["arena_ws", "board", "boardId", "c", "match", "pace", "paceId"]) {
    url.searchParams.delete(key);
  }
  url.searchParams.set("room", roomId);
  url.hash = "";
  return url.toString();
}

/**
 * The server constructs this board only for a valid cryptographically-random
 * free Captain Room id. It is intentionally absent from the public board
 * catalog, so a board query or ordinary room id cannot select it.
 */
export function createCaptainRoomBoard(tierId: CaptainRoomTierId): GameBoardConfig {
  const tier = getCaptainRoomTier(tierId);
  const scale = tier.arenaRadius / 1_850;
  return {
    id: tier.boardId,
    name: `Captain Cove · ${tier.humanSeats}`,
    chargingStations: OPEN_SEAS_BOARD.chargingStations.map((station) => ({
      ...station,
      id: `${tier.boardId}-${station.id}`,
      name: station.id === "kraken-atoll"
        ? "Host's Atoll"
        : station.id === "coin-cay"
          ? "Crew Ring"
          : "Fleet Ring",
      position: {
        x: Math.round(station.position.x * scale),
        y: Math.round(station.position.y * scale),
      },
    })),
  };
}

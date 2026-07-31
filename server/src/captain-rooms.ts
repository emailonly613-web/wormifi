import type { ArenaRoomOptions } from "./room.ts";
import {
  createCaptainRoomBoard,
  getCaptainRoomTier,
  type CaptainRoomTierId,
} from "../../src/game/captainRooms.ts";

/**
 * Trusted free-launch room seam. The server selects this from a validated
 * Captain Room id; clients cannot set their own board or seat limit.
 */
export function captainRoomOptionsForTier(
  tierId: CaptainRoomTierId,
): ArenaRoomOptions {
  const tier = getCaptainRoomTier(tierId);
  return {
    maxHumanPlayers: tier.humanSeats,
    targetPopulation: 0,
    arenaRadius: tier.arenaRadius,
    targetDropCount: tier.targetDropCount,
    board: createCaptainRoomBoard(tier.id),
    heatRing: false,
  };
}

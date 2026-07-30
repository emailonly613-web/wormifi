import type { GameBoardId as ChargingGameBoardId } from "./chargingStations";

export type GameBoardId = ChargingGameBoardId;

export const DEFAULT_GAME_BOARD_ID: GameBoardId = "open-seas";
export const BOARD_QUERY_PARAMETER = "board";

export interface BoardOption {
  id: GameBoardId;
  name: string;
  shortLabel: string;
  description: string;
  objectiveCount: number;
  objectiveDisclosure: string;
}

export const BOARD_OPTIONS: readonly BoardOption[] = Object.freeze([
  Object.freeze({
    id: "open-seas",
    name: "Open Seas",
    shortLabel: "FREE-ROAM + ISLAND LOOPS",
    description: "Hunt treasure, grow, boost, and risk tight island laps while rivals close in.",
    objectiveCount: 3,
    objectiveDisclosure: "Three mini harbors: circle back to each buoy for +2.5, +4, or +7 size.",
  }),
  Object.freeze({
    id: "black-pearl-relay",
    name: "Black Pearl Relay",
    shortLabel: "TWO CAPSTAN RELAY",
    description: "A tactical crew arena built around two visible wrap-and-charge landmarks.",
    objectiveCount: 2,
    objectiveDisclosure: "Two wrap-capstan objectives: Port Capstan and Starboard Capstan.",
  }),
]);

export interface ResolvedRoomBoardPreference {
  /** Effective selection. An authoritative existing-room board always wins. */
  boardId: GameBoardId;
  requestedBoardId: GameBoardId;
  existingRoomBoardId?: GameBoardId;
  locked: boolean;
  requestIgnored: boolean;
}

export function isGameBoardId(value: unknown): value is GameBoardId {
  return value === "open-seas" || value === "black-pearl-relay";
}

export function normalizeBoardPreference(value: unknown): GameBoardId {
  return isGameBoardId(value) ? value : DEFAULT_GAME_BOARD_ID;
}

function queryParameters(input: string | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const trimmed = input.trim();
  if (trimmed.includes("://") || trimmed.startsWith("/")) {
    return new URL(trimmed, "https://wormifi.invalid").searchParams;
  }
  return new URLSearchParams(trimmed.startsWith("?") ? trimmed.slice(1) : trimmed);
}

/** Missing and unknown query values fail closed to the Open Seas default. */
export function readBoardPreference(
  search: string | URLSearchParams,
): GameBoardId {
  return normalizeBoardPreference(queryParameters(search).get(BOARD_QUERY_PARAMETER));
}

/**
 * Existing room truth is immutable client-side. A query, picker, or altered
 * invite can express a request only when no authoritative room board is known.
 */
export function resolveRoomBoardPreference(
  requestedBoard: unknown,
  existingRoomBoard: unknown = undefined,
): ResolvedRoomBoardPreference {
  const requestedBoardId = normalizeBoardPreference(requestedBoard);
  const existingRoomBoardId = isGameBoardId(existingRoomBoard)
    ? existingRoomBoard
    : undefined;
  return {
    boardId: existingRoomBoardId ?? requestedBoardId,
    requestedBoardId,
    existingRoomBoardId,
    locked: existingRoomBoardId !== undefined,
    requestIgnored: existingRoomBoardId !== undefined && existingRoomBoardId !== requestedBoardId,
  };
}

/**
 * Returns the creation preference for a join message. Once room truth is
 * known, the field is omitted so the client cannot present it as an override.
 */
export function boardIdForJoin(
  selection: ResolvedRoomBoardPreference,
): GameBoardId | undefined {
  return selection.locked ? undefined : selection.boardId;
}

/** Returns a new URL string with its board query normalized to this contract. */
export function buildBoardPreferenceUrl(
  href: string,
  board: unknown,
): string {
  const boardId = normalizeBoardPreference(board);
  const url = new URL(href);
  url.searchParams.delete("boardId");
  if (boardId === DEFAULT_GAME_BOARD_ID) {
    url.searchParams.delete(BOARD_QUERY_PARAMETER);
  } else {
    url.searchParams.set(BOARD_QUERY_PARAMETER, boardId);
  }
  return url.toString();
}

/**
 * Adds the non-default board to an existing clean room invite URL. Open Seas
 * remains the default and therefore needs no query parameter.
 */
export function buildBoardAwareInviteUrl(
  baseInviteUrl: string,
  requestedBoard: unknown,
  existingRoomBoard: unknown = undefined,
): string {
  const selection = resolveRoomBoardPreference(requestedBoard, existingRoomBoard);
  return buildBoardPreferenceUrl(baseInviteUrl, selection.boardId);
}

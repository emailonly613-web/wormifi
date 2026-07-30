export type GamePaceId = "harbor" | "classic" | "tempest";

export const DEFAULT_GAME_PACE_ID: GamePaceId = "harbor";
export const LEGACY_GAME_PACE_ID: GamePaceId = "classic";
export const PACE_QUERY_PARAMETER = "pace";

export interface GamePaceProfile {
  id: GamePaceId;
  name: string;
  shortLabel: string;
  description: string;
  baseSpeed: number;
  boostSpeed: number;
}

export const GAME_PACE_PROFILES: Readonly<Record<GamePaceId, GamePaceProfile>> =
  Object.freeze({
    harbor: Object.freeze({
      id: "harbor",
      name: "Harbor",
      shortLabel: "PATIENT DEFAULT",
      description: "A slower long-run pace with time to read, plan, and survive.",
      baseSpeed: 100,
      boostSpeed: 170,
    }),
    classic: Object.freeze({
      id: "classic",
      name: "Classic",
      shortLabel: "FAST",
      description: "The previous Wormifi pace, preserved as an opt-in faster room.",
      baseSpeed: 212,
      boostSpeed: 330,
    }),
    tempest: Object.freeze({
      id: "tempest",
      name: "Tempest",
      shortLabel: "HIGH PRESSURE",
      description: "Faster sailing for captains who want less reaction time.",
      baseSpeed: 235,
      boostSpeed: 365,
    }),
  });

export const GAME_PACE_OPTIONS: readonly GamePaceProfile[] = Object.freeze([
  GAME_PACE_PROFILES.harbor,
  GAME_PACE_PROFILES.classic,
  GAME_PACE_PROFILES.tempest,
]);

export interface ResolvedRoomPacePreference {
  paceId: GamePaceId;
  requestedPaceId: GamePaceId;
  existingRoomPaceId?: GamePaceId;
  locked: boolean;
  requestIgnored: boolean;
}

export function isGamePaceId(value: unknown): value is GamePaceId {
  return value === "harbor" || value === "classic" || value === "tempest";
}

export function normalizeGamePaceId(value: unknown): GamePaceId {
  return isGamePaceId(value) ? value : DEFAULT_GAME_PACE_ID;
}

export function getGamePaceProfile(value: unknown): GamePaceProfile {
  return GAME_PACE_PROFILES[normalizeGamePaceId(value)];
}

export function identifyGamePace(
  config: Readonly<{ baseSpeed: number; boostSpeed: number }>,
): GamePaceId {
  const match = GAME_PACE_OPTIONS.find((profile) =>
    profile.baseSpeed === config.baseSpeed && profile.boostSpeed === config.boostSpeed
  );
  if (!match) {
    throw new Error(
      `Game speeds ${config.baseSpeed}/${config.boostSpeed} do not match a published pace`,
    );
  }
  return match.id;
}

function queryParameters(input: string | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const trimmed = input.trim();
  if (trimmed.includes("://") || trimmed.startsWith("/")) {
    return new URL(trimmed, "https://wormifi.invalid").searchParams;
  }
  return new URLSearchParams(trimmed.startsWith("?") ? trimmed.slice(1) : trimmed);
}

export function readGamePacePreference(
  search: string | URLSearchParams,
): GamePaceId {
  return normalizeGamePaceId(queryParameters(search).get(PACE_QUERY_PARAMETER));
}

export function resolveRoomPacePreference(
  requestedPace: unknown,
  existingRoomPace: unknown = undefined,
): ResolvedRoomPacePreference {
  const requestedPaceId = normalizeGamePaceId(requestedPace);
  const existingRoomPaceId = isGamePaceId(existingRoomPace)
    ? existingRoomPace
    : undefined;
  return {
    paceId: existingRoomPaceId ?? requestedPaceId,
    requestedPaceId,
    existingRoomPaceId,
    locked: existingRoomPaceId !== undefined,
    requestIgnored: existingRoomPaceId !== undefined && existingRoomPaceId !== requestedPaceId,
  };
}

export function paceIdForJoin(
  selection: ResolvedRoomPacePreference,
): GamePaceId | undefined {
  return selection.locked ? undefined : selection.paceId;
}

export function buildGamePacePreferenceUrl(href: string, pace: unknown): string {
  const paceId = normalizeGamePaceId(pace);
  const url = new URL(href);
  url.searchParams.delete("paceId");
  if (paceId === DEFAULT_GAME_PACE_ID) {
    url.searchParams.delete(PACE_QUERY_PARAMETER);
  } else {
    url.searchParams.set(PACE_QUERY_PARAMETER, paceId);
  }
  return url.toString();
}

export function buildPaceAwareInviteUrl(
  baseInviteUrl: string,
  requestedPace: unknown,
  existingRoomPace: unknown = undefined,
): string {
  const selection = resolveRoomPacePreference(requestedPace, existingRoomPace);
  return buildGamePacePreferenceUrl(baseInviteUrl, selection.paceId);
}

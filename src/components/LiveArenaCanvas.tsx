import { useCallback, useEffect, useRef, useState } from "react";
import {
  decodeSnapshotFromWire,
  MIXED_ECHO_ORIGIN_ID,
  PROTOCOL_VERSION,
} from "../../server/src/protocol";
import type {
  ErrorMessage,
  PresenceMessage,
  PublicHeatRingState,
  PublicDropState,
  PublicPlayerPresence,
  PublicPlayerState,
  ServerMessage,
  SnapshotMessage,
  WelcomeMessage,
  WorldMessage,
} from "../../server/src/protocol";
import {
  DEFAULT_GAME_CONFIG,
  getBodyRadius,
  getPlayerRadius,
  getPlayerTurboReserveRatio,
  getPlayerTurboSecondsRemaining,
} from "../game/core";
import { remainingSprintBurstMs } from "../game/sprintControl";
import type {
  ActiveSpecialist,
  ChargingStationState,
  CollisionRadiusConfig,
  Vec2,
} from "../game/types";
import {
  createLivePresentationBuffer,
  getPresentedSnapshot,
  pushAuthoritativeSnapshot,
  resetLivePresentationBuffer,
  type LivePresentationBuffer,
} from "../game/livePresentation";
import {
  ArenaTutorial,
  SPRINT_SIZE_COST_PER_SECOND,
  useArenaTutorial,
} from "./ArenaTutorial";
import { ChargingStationStatus } from "./ChargingStationStatus";
import { RelicStatus } from "./RelicStatus";
import {
  drawChargingStationField,
  selectChargingStationPresentation,
  type ChargingStationPresentation,
} from "../game/chargingStationRender";
import { appendDeathReleaseParticles } from "../game/deathRelease";
import {
  ARENA_CANVAS_CONTEXT_OPTIONS,
  arenaBackingScale,
  drawArenaFloor,
  drawArenaVignette,
  drawContinuousPirateWorm,
  drawFacetedGem,
  drawNauticalChart,
  drawPirateShipBackdrop,
  drawRivalHoardGem,
  drawTreasureChest,
  drawTreasureShard,
  drawTurboReserveGauge,
} from "../game/treasureRender";
import {
  commonTreasureSprite,
  drawPirateAtlasSprite,
  drawPickupRewardPopup,
  GROUND_TREASURE_MIN_LOGICAL_SIZE,
  GROUND_TREASURE_RADIUS_SCALE,
  type GroundTreasureSpriteItem,
} from "../game/pirateSpriteAtlas";
import {
  createActiveRelicCanvasModel,
  drawGroundRelicPickup,
  drawRelicCarrierBadge,
  drawRelicCarrierEffect,
} from "../game/relicCanvasRender";
import {
  createRelicStatusModel,
  getActiveRelicPresentation,
  getGroundRelicPresentation,
  getRelicEffectText,
  isPirateRelicKind,
  resolveRelicPresentation,
} from "../game/relicPresentation";
import {
  getSpyglassDangerBearings,
  isTreasureMultiplierTier,
  type SpyglassDangerBearing,
} from "../game/relics";
import {
  getArenaCameraVisibleRadius,
  getArenaCameraZoom,
} from "../game/spatialFeel";
import { RARE_TREASURE_CHEST_MASS, treasurePointValue } from "../game/treasureEconomy";
import { ambientTreasureOpacity } from "../game/treasureFlow";
import { isWormMaterialPattern, wormMaterialForIdentity } from "../game/wormMaterials";
import {
  drawBoundaryGuardians,
  getBoundaryGuardianSpec,
  type BoundaryGuardianStrike,
} from "../game/boundaryGuardians";
import {
  wormateParentAppearanceFromThemeId,
  wormateParentOutfitForIdentity,
  wormateParentSkinForIdentity,
} from "../game/wormateParentCatalog";
import { drawWorldPickupField } from "../game/worldCosmeticRender";
import {
  getArenaVisualTheme,
  type WorldCosmeticState,
} from "../game/worldCosmetics";
import {
  fixedHelmAnchor,
  touchStartsHelm,
  type ControlScheme,
} from "../game/controlScheme";
import { roomIdentityLabel } from "../game/roomIdentity";
import { captainRoomTierFromRoomId } from "../game/captainRooms";
import {
  isGameBoardId,
  type GameBoardId,
} from "../game/boardPreference";
import {
  arenaBoundaryIntersectsViewport,
  clipCanvasToArenaCircle,
} from "../game/arenaBoundary";
import {
  getGamePaceProfile,
  isGamePaceId,
  type GamePaceId,
} from "../game/gamePace";
import {
  getCosmeticTheme,
  isCosmeticThemeId,
  type CosmeticThemeId,
} from "../game/cosmeticThemes";
import { materialGlowEnabled, materialMotionScale } from "../game/renderPreferences";
import {
  drawPhotoSkinCanvas,
  type PhotoSkinCanvasAppearance,
} from "../game/photoSkinCanvas";
import {
  PirateRadar,
  type RadarLandmark,
  type RadarPlayerMarker,
  type RadarStation,
} from "./PirateRadar";
import {
  advanceCameraMotion,
  createCameraMotionState,
  pointerSteeringDirection,
  type CameraMotionState,
} from "../game/cameraMotion";
import type { CaptainRunSummary } from "../game/captainProgression";

const EXPECTED_PROTOCOL_VERSION = PROTOCOL_VERSION;
const DEFAULT_ARENA_WS_URL = "ws://127.0.0.1:8080";
const INPUT_INTERVAL_MS = 50;
const HUD_REFRESH_INTERVAL_MS = 100;
const liveGroundTreasureFieldScratch: GroundTreasureSpriteItem[] = [];

type ConnectionPhase =
  | "connecting"
  | "joining"
  | "authoritative"
  | "reconnecting"
  | "error";

interface LiveArenaCanvasProps {
  playerName: string;
  running: boolean;
  session: number;
  roomId: string;
  publicMatchmaking?: boolean;
  boardId?: GameBoardId;
  paceId?: GamePaceId;
  themeId: CosmeticThemeId;
  photoSkin?: PhotoSkinCanvasAppearance;
  worldCosmetics: WorldCosmeticState;
  controlScheme: ControlScheme;
  onBoardResolved?: (boardId: GameBoardId) => void;
  onPaceResolved?: (paceId: GamePaceId) => void;
  onRoomResolved?: (roomId: string) => void;
  onLifeEnded?: (summary: CaptainRunSummary) => void;
  onExit: () => void;
}

interface LiveLeaderboardEntry {
  player: PublicPlayerState;
  rank: number;
}

interface LiveUiState {
  phase: ConnectionPhase;
  detail: string;
  roomId: string;
  playerId?: string;
  tick: number;
  humans: number;
  ai: number;
  players: number;
  score: number;
  mass: number;
  length: number;
  rank: number;
  rankTotal: number;
  nextRankGap?: number;
  leaderboard: LiveLeaderboardEntry[];
  position: Vec2;
  direction: Vec2;
  exactMass: number;
  collisionHeadRadius: number;
  collisionBodyRadius: number;
  collisionRadii: CollisionRadiusConfig;
  alive: boolean;
  boosting: boolean;
  activeRelic?: ActiveSpecialist;
  fixedStepSeconds: number;
  neutralSparks: number;
  popClusters: number;
  sprintDrops: number;
  rivalRemains: number;
  collectorBeacons: number;
  relicBeacons: number;
  chargingStation?: ChargingStationPresentation;
  lastError?: string;
}

interface AuthorityHandshake {
  roomId: string;
  playerId: string;
  welcomed: boolean;
  worldSynced: boolean;
  snapshotted: boolean;
  fixedStepSeconds: number;
}

interface LiveWorldState {
  roomId: string;
  arenaRadius: number;
  fixedStepSeconds: number;
  collisionRadii: CollisionRadiusConfig;
  drops: Map<string, PublicDropState>;
  board?: WorldMessage["board"];
  pace?: WorldMessage["pace"];
  chargingStations: Map<string, ChargingStationState>;
  heatRing?: PublicHeatRingState;
}

function getResponsivePresentedSnapshot(
  buffer: LivePresentationBuffer,
  now: number,
  playerId: string | undefined,
  direction: Readonly<Vec2>,
  world: LiveWorldState | null,
): SnapshotMessage | null {
  const authority = playerId
    ? buffer.latest?.players.find((player) => player.id === playerId)
    : undefined;
  if (!playerId || !authority || !world) return getPresentedSnapshot(buffer, now);
  return getPresentedSnapshot(buffer, now, {
    playerId,
    direction,
    baseSpeed: world.pace?.baseSpeed ?? DEFAULT_GAME_CONFIG.baseSpeed,
    boostSpeed: world.pace?.boostSpeed ?? DEFAULT_GAME_CONFIG.boostSpeed,
    arenaRadius: world.arenaRadius,
    headRadius: getPlayerRadius(authority, world.collisionRadii),
    bodyRadius: getBodyRadius(authority, world.collisionRadii),
  });
}

interface HeatRingUiState {
  phase: "idle" | "active" | "resolved" | "aborted";
  botCount: number;
  jewelCount: number;
  totalMass: number;
}

interface TouchGuide {
  pointerId: number;
  anchorX: number;
  anchorY: number;
  currentX: number;
  currentY: number;
}

interface LiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  streak?: boolean;
  rewardPoints?: number;
}

const palettes = [
  ["#68ffdc", "#2fa9ff", "#ccfff6"],
  ["#ffcc57", "#ff7a4d", "#fff1a9"],
  ["#ff6daa", "#b86bff", "#ffd0e4"],
  ["#b4ff63", "#45d88c", "#efffba"],
  ["#70d8ff", "#7774ff", "#d8f5ff"],
  ["#ff8a72", "#ff4f69", "#ffe0c8"],
];

const dropColors = ["#5af4d4", "#4ba7ff", "#ffcf58", "#ff6fa9", "#a9ff68", "#a777ff"];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export interface LiveRadarIntel {
  visiblePlayers: RadarPlayerMarker[];
  dangerBearings: SpyglassDangerBearing[];
}

/** Full-board population dots are the competitive-room contract. */
export function createLiveRadarIntel(
  snapshot: Pick<SnapshotMessage, "players" | "tick"> | null,
  playerId: string | undefined,
  visibleRadius: number,
): LiveRadarIntel {
  const carrier = snapshot?.players.find((player) => player.id === playerId);
  if (!snapshot || !carrier || !Number.isFinite(visibleRadius) || visibleRadius <= 0) {
    return { visiblePlayers: [], dangerBearings: [] };
  }
  const rivals = snapshot.players
    .filter((player) => player.id !== playerId && player.connected);
  const visiblePlayers = rivals
    .filter((player) => player.alive)
    .map((player) => ({
      id: player.id,
      kind: player.kind,
      position: player.position,
      alive: player.alive,
    }));
  return {
    visiblePlayers,
    dangerBearings: getSpyglassDangerBearings(
      carrier,
      rivals,
      snapshot.tick,
      visibleRadius,
    ),
  };
}

function liveRadarVisibleRadius(
  canvas: HTMLCanvasElement | null,
  mass: number,
  activeRelic: ActiveSpecialist | undefined,
  tick: number,
): number {
  const width = canvas?.clientWidth ?? 0;
  const height = canvas?.clientHeight ?? 0;
  return getArenaCameraVisibleRadius(width, height, mass, activeRelic, tick);
}

function stableNumber(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function touchKnobTransform(guide: TouchGuide) {
  const x = guide.currentX - guide.anchorX;
  const y = guide.currentY - guide.anchorY;
  const length = Math.hypot(x, y);
  const scale = length > 54 ? 54 / length : 1;
  return `translate(${x * scale}px, ${y * scale}px)`;
}

function nearestNetworkSpark(
  world: LiveWorldState,
  position: Vec2,
  direction?: Vec2,
  excludedId?: string,
) {
  return [...world.drops.values()]
    .filter((drop) =>
      drop.id !== excludedId &&
      drop.source === "arena" &&
      !drop.specialist &&
      drop.mass > 0,
    )
    .sort((first, second) => {
      const firstDistance = (first.position.x - position.x) ** 2 + (first.position.y - position.y) ** 2;
      const secondDistance = (second.position.x - position.x) ** 2 + (second.position.y - position.y) ** 2;
      const tier = (drop: PublicDropState, distance: number) => {
        if (!direction || distance < 1e-6) return 1;
        const root = Math.sqrt(distance);
        const dot = (
          (drop.position.x - position.x) * direction.x +
          (drop.position.y - position.y) * direction.y
        ) / root;
        return dot >= 0.25 ? 0 : dot >= -0.1 ? 1 : 2;
      };
      return (
        tier(first, firstDistance) * 1_000_000_000 + firstDistance -
        (tier(second, secondDistance) * 1_000_000_000 + secondDistance)
      ) || first.id.localeCompare(second.id);
    })[0];
}

function networkTutorialTargetIssue(
  player: PublicPlayerState,
  target: PublicDropState | undefined,
  collisionRadii: CollisionRadiusConfig,
): "removed" | "behind" | "too-far" | undefined {
  if (!target) return "removed";
  const deltaX = target.position.x - player.position.x;
  const deltaY = target.position.y - player.position.y;
  const distance = Math.hypot(deltaX, deltaY);
  const pickupDistance = getPlayerRadius(player, collisionRadii) + target.radius + 8;
  if (distance <= pickupDistance) return undefined;
  if (distance > 760) return "too-far";
  const headingDot = (deltaX * player.direction.x + deltaY * player.direction.y) / distance;
  return headingDot < -0.12 ? "behind" : undefined;
}

function configuredArenaUrl() {
  const configured = import.meta.env.VITE_ARENA_WS_URL?.trim();
  if (import.meta.env.DEV) {
    const developmentOverride = new URLSearchParams(window.location.search).get("arena_ws")?.trim();
    if (developmentOverride?.startsWith("ws://") || developmentOverride?.startsWith("wss://")) {
      return developmentOverride;
    }
  }
  if (configured) return configured;
  if (import.meta.env.DEV) return DEFAULT_ARENA_WS_URL;
  const socketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${socketProtocol}//${window.location.host}/arena`;
}

function reconnectStorageKey(url: string, roomId: string) {
  return `wormifi:arena-reconnect:${url}:${roomId}`;
}

function safeSessionGet(key: string) {
  try {
    return sessionStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private browsing policies can disable storage; the live socket still works.
  }
}

function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage is optional; authority never depends on it.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVec2(value: unknown): value is Vec2 {
  return isRecord(value) &&
    typeof value.x === "number" && Number.isFinite(value.x) &&
    typeof value.y === "number" && Number.isFinite(value.y);
}

function isActiveCollector(value: unknown) {
  if (!isRecord(value)) return false;
  const identityValid = value.relicKind === "gilded-ledger"
    ? isTreasureMultiplierTier(value.relicTier)
    : value.relicTier === undefined;
  return identityValid && value.kind === "collector" &&
    (value.relicKind === undefined || isPirateRelicKind(value.relicKind)) &&
    typeof value.activatedAtTick === "number" && Number.isSafeInteger(value.activatedAtTick) && value.activatedAtTick >= 0 &&
    typeof value.expiresAtTick === "number" && Number.isSafeInteger(value.expiresAtTick) && value.expiresAtTick >= value.activatedAtTick &&
    typeof value.durationTicks === "number" && Number.isSafeInteger(value.durationTicks) && value.durationTicks > 0 &&
    value.expiresAtTick - value.activatedAtTick === value.durationTicks;
}

function isPublicPlayer(value: unknown): value is PublicPlayerState {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.kind === "human" || value.kind === "bot") &&
    typeof value.connected === "boolean" &&
    typeof value.alive === "boolean" &&
    isVec2(value.position) &&
    isVec2(value.direction) &&
    Array.isArray(value.body) && value.body.every(isVec2) &&
    typeof value.mass === "number" && Number.isFinite(value.mass) &&
    typeof value.kills === "number" && Number.isFinite(value.kills) &&
    typeof value.score === "number" && Number.isFinite(value.score) &&
    typeof value.shieldTicksRemaining === "number" && Number.isFinite(value.shieldTicksRemaining) &&
    (value.boosting === undefined || typeof value.boosting === "boolean") &&
    (value.themeId === undefined || isCosmeticThemeId(value.themeId)) &&
    (value.specialist === undefined || isActiveCollector(value.specialist));
}

function isPublicPlayerPresence(value: unknown): value is PublicPlayerPresence {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.kind === "human" || value.kind === "bot") &&
    typeof value.connected === "boolean" &&
    typeof value.alive === "boolean" &&
    isVec2(value.position) &&
    typeof value.mass === "number" && Number.isFinite(value.mass) &&
    typeof value.kills === "number" && Number.isFinite(value.kills) &&
    typeof value.score === "number" && Number.isFinite(value.score);
}

function isPublicDrop(value: unknown): value is PublicDropState {
  if (!isRecord(value)) return false;
  const baseValid = typeof value.id === "string" &&
    isVec2(value.position) &&
    typeof value.mass === "number" && Number.isFinite(value.mass) && value.mass >= 0 &&
    typeof value.radius === "number" && Number.isFinite(value.radius) && value.radius > 0 &&
    (value.spawnedAtTick === undefined ||
      (typeof value.spawnedAtTick === "number" && Number.isSafeInteger(value.spawnedAtTick) && value.spawnedAtTick >= 0)) &&
    (value.expiresAtTick === undefined ||
      (typeof value.expiresAtTick === "number" && Number.isSafeInteger(value.expiresAtTick) &&
        (value.spawnedAtTick === undefined || value.expiresAtTick > value.spawnedAtTick))) &&
    (value.source === "arena" || value.source === "boost" || value.source === "death") &&
    (value.originPlayerId === undefined || (typeof value.originPlayerId === "string" && value.originPlayerId.length > 0)) &&
    (value.mixedOrigin === undefined || value.mixedOrigin === true);
  if (!baseValid) return false;
  if (value.relicKind !== undefined) {
    const tierValid = value.relicKind === "gilded-ledger"
      ? isTreasureMultiplierTier(value.relicTier)
      : value.relicTier === undefined;
    return tierValid && isPirateRelicKind(value.relicKind) &&
      value.source === "arena" &&
      value.mass === 0 &&
      value.originPlayerId === undefined &&
      value.specialist === undefined &&
      value.specialistDurationTicks === undefined &&
      typeof value.relicDurationTicks === "number" &&
      Number.isSafeInteger(value.relicDurationTicks) &&
      value.relicDurationTicks > 0;
  }
  if (value.relicDurationTicks !== undefined || value.relicTier !== undefined) return false;
  if (value.specialist === "collector") {
    return value.source === "arena" && value.mass === 0 && value.originPlayerId === undefined &&
      value.mixedOrigin === undefined &&
      typeof value.specialistDurationTicks === "number" &&
      Number.isSafeInteger(value.specialistDurationTicks) &&
      value.specialistDurationTicks > 0;
  }
  if (value.specialist !== undefined || value.specialistDurationTicks !== undefined) return false;
  if (value.source === "arena") {
    return value.originPlayerId === undefined && value.mixedOrigin === undefined;
  }
  return typeof value.originPlayerId === "string" && (
    value.mixedOrigin === true
      ? value.originPlayerId === MIXED_ECHO_ORIGIN_ID
      : value.originPlayerId !== MIXED_ECHO_ORIGIN_ID
  );
}

function isPublicHeatRing(value: unknown): value is PublicHeatRingState {
  if (!isRecord(value)) return false;
  const botIds = value.botIds;
  const ticks = [value.startsAtTick, value.reverseAtTick, value.earliestResolveTick, value.deadlineTick];
  if (!ticks.every((tick): tick is number =>
    typeof tick === "number" && Number.isSafeInteger(tick) && tick >= 0
  )) return false;
  const [startsAtTick, reverseAtTick, earliestResolveTick, deadlineTick] = ticks;
  return value.phase === "active" &&
    value.theme === "corsair" &&
    isVec2(value.center) &&
    typeof value.radius === "number" && Number.isFinite(value.radius) && value.radius > 0 &&
    typeof value.safeSpawnRadius === "number" && Number.isFinite(value.safeSpawnRadius) && value.safeSpawnRadius > 0 &&
    Array.isArray(botIds) && botIds.length === 2 &&
    botIds.every((id) => typeof id === "string" && id.length > 0) &&
    botIds[0] !== botIds[1] &&
    startsAtTick < reverseAtTick &&
    reverseAtTick < earliestResolveTick &&
    earliestResolveTick < deadlineTick;
}

function isStringTuple(value: unknown): value is [string, string] {
  return Array.isArray(value) && value.length === 2 &&
    value.every((entry) => typeof entry === "string" && entry.length > 0) &&
    value[0] !== value[1];
}

export function isAuthoritativeEvent(value: unknown) {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  const validTick = typeof value.tick === "number" && Number.isSafeInteger(value.tick) && value.tick >= 0;
  if (!validTick) return false;
  if (value.type === "playerSpawned") return typeof value.playerId === "string";
  if (value.type === "massShed" || value.type === "dropCollected") {
    return typeof value.playerId === "string" && typeof value.dropId === "string" &&
      typeof value.mass === "number" && Number.isFinite(value.mass) && value.mass >= 0;
  }
  if (value.type === "specialistActivated") {
    const tierValid = value.relicKind === "gilded-ledger"
      ? isTreasureMultiplierTier(value.relicTier)
      : value.relicTier === undefined;
    return tierValid && typeof value.playerId === "string" && typeof value.dropId === "string" &&
      value.specialist === "collector" &&
      (value.relicKind === undefined || isPirateRelicKind(value.relicKind)) &&
      typeof value.durationTicks === "number" && Number.isSafeInteger(value.durationTicks) && value.durationTicks > 0;
  }
  if (value.type === "specialistExpired") {
    const tierValid = value.relicKind === "gilded-ledger"
      ? isTreasureMultiplierTier(value.relicTier)
      : value.relicTier === undefined;
    return tierValid && typeof value.playerId === "string" &&
      value.specialist === "collector" &&
      (value.relicKind === undefined || isPirateRelicKind(value.relicKind));
  }
  if (value.type === "chargingStarted") {
    return typeof value.stationId === "string" && value.stationId.length > 0 &&
      typeof value.playerId === "string" && value.playerId.length > 0 &&
      (value.windingDirection === -1 || value.windingDirection === 1) &&
      typeof value.requiredTicks === "number" && Number.isSafeInteger(value.requiredTicks) &&
      value.requiredTicks > 0;
  }
  if (
    value.type === "chargingInterrupted" ||
    value.type === "chargingResumed"
  ) {
    return typeof value.stationId === "string" && value.stationId.length > 0 &&
      typeof value.playerId === "string" && value.playerId.length > 0 &&
      typeof value.progressTicks === "number" && Number.isSafeInteger(value.progressTicks) &&
      value.progressTicks >= 0;
  }
  if (value.type === "chargingReset") {
    return typeof value.stationId === "string" && value.stationId.length > 0 &&
      typeof value.playerId === "string" && value.playerId.length > 0 &&
      typeof value.massAwarded === "number" && Number.isFinite(value.massAwarded) &&
      value.massAwarded >= 0;
  }
  if (value.type === "chargingCompleted") {
    return typeof value.stationId === "string" && value.stationId.length > 0 &&
      typeof value.playerId === "string" && value.playerId.length > 0 &&
      typeof value.massAwarded === "number" && Number.isFinite(value.massAwarded) &&
      value.massAwarded > 0 &&
      typeof value.cooldownTicks === "number" && Number.isSafeInteger(value.cooldownTicks) &&
      value.cooldownTicks >= 0;
  }
  if (value.type === "playerDied") {
    return typeof value.playerId === "string" &&
      (value.cause === "collision" || value.cause === "boundary") &&
      (value.killerId === undefined || typeof value.killerId === "string") &&
      typeof value.collisionTime === "number" && Number.isFinite(value.collisionTime);
  }
  if (value.type === "heatRingStarted") {
    return isPublicHeatRing(value.heatRing);
  }
  if (value.type === "heatRingResolved") {
    if (!isStringTuple(value.botIds)) return false;
    const hasLegacyOutcome = value.winnerId === undefined && value.defeatedId === undefined;
    const hasSingleWinnerOutcome =
      typeof value.winnerId === "string" && value.botIds.includes(value.winnerId) &&
      typeof value.defeatedId === "string" && value.botIds.includes(value.defeatedId) &&
      value.winnerId !== value.defeatedId;
    return (hasLegacyOutcome || hasSingleWinnerOutcome) &&
      Array.isArray(value.dropIds) && value.dropIds.length > 0 &&
      value.dropIds.every((id) => typeof id === "string" && id.length > 0) &&
      new Set(value.dropIds).size === value.dropIds.length &&
      typeof value.totalMass === "number" && Number.isFinite(value.totalMass) && value.totalMass > 0;
  }
  if (value.type === "heatRingAborted") {
    return isStringTuple(value.botIds) && [
      "second-human",
      "first-human-disconnected",
      "unsafe-state",
      "early-death",
      "interrupted",
      "timeout",
    ].includes(String(value.reason));
  }
  return false;
}

function isWelcome(value: unknown): value is WelcomeMessage {
  if (!isRecord(value)) return false;
  return value.type === "welcome" &&
    value.authority === "server" &&
    value.protocolVersion === EXPECTED_PROTOCOL_VERSION &&
    typeof value.roomId === "string" &&
    typeof value.playerId === "string" &&
    typeof value.reconnectToken === "string" &&
    typeof value.reconnected === "boolean" &&
    typeof value.tick === "number" && Number.isSafeInteger(value.tick) &&
    typeof value.fixedStepSeconds === "number" && Number.isFinite(value.fixedStepSeconds) &&
    typeof value.lastAcceptedSequence === "number" && Number.isSafeInteger(value.lastAcceptedSequence);
}

function isSnapshot(value: unknown): value is SnapshotMessage {
  if (!isRecord(value)) return false;
  return value.type === "snapshot" &&
    value.authority === "server" &&
    value.protocolVersion === EXPECTED_PROTOCOL_VERSION &&
    typeof value.roomId === "string" &&
    typeof value.tick === "number" && Number.isSafeInteger(value.tick) &&
    typeof value.serverTimeMs === "number" && Number.isFinite(value.serverTimeMs) &&
    Array.isArray(value.players) && value.players.every(isPublicPlayer) &&
    Array.isArray(value.dropUpserts) && value.dropUpserts.every(isPublicDrop) &&
    Array.isArray(value.removedDropIds) && value.removedDropIds.every((id) => typeof id === "string") &&
    Array.isArray(value.events) && value.events.every(isAuthoritativeEvent);
}

function isPresence(value: unknown): value is PresenceMessage {
  if (!isRecord(value)) return false;
  return value.type === "presence" &&
    value.authority === "server" &&
    value.protocolVersion === EXPECTED_PROTOCOL_VERSION &&
    typeof value.roomId === "string" &&
    typeof value.tick === "number" && Number.isSafeInteger(value.tick) &&
    Array.isArray(value.players) && value.players.every(isPublicPlayerPresence);
}

function presencePlayerAsSnapshotPlayer(player: PublicPlayerPresence): PublicPlayerState {
  return {
    ...player,
    direction: { x: 1, y: 0 },
    body: [],
    shieldTicksRemaining: 0,
  };
}

/** Nearby full bodies override room-wide low-frequency roster entries. */
export function mergeSnapshotWithPresence(
  snapshot: SnapshotMessage,
  presence: PresenceMessage | null,
): SnapshotMessage {
  if (!presence || presence.roomId !== snapshot.roomId) return snapshot;
  const detailedPlayers = new Map(snapshot.players.map((player) => [player.id, player]));
  const players = presence.players.map((player) =>
    detailedPlayers.get(player.id) ?? presencePlayerAsSnapshotPlayer(player)
  );
  for (const player of snapshot.players) {
    if (!presence.players.some((candidate) => candidate.id === player.id)) players.push(player);
  }
  return { ...snapshot, players };
}

function isPublicBoard(
  value: unknown,
  roomId: unknown,
): value is NonNullable<WorldMessage["board"]> {
  return isRecord(value) &&
    typeof roomId === "string" &&
    (isGameBoardId(value.id) || captainRoomTierFromRoomId(roomId)?.boardId === value.id) &&
    typeof value.name === "string" &&
    Array.isArray(value.chargingStations);
}

function isPublicPace(value: unknown): value is NonNullable<WorldMessage["pace"]> {
  return isRecord(value) &&
    isGamePaceId(value.id) &&
    typeof value.name === "string" &&
    typeof value.baseSpeed === "number" && Number.isFinite(value.baseSpeed) && value.baseSpeed > 0 &&
    typeof value.boostSpeed === "number" && Number.isFinite(value.boostSpeed) &&
    value.boostSpeed > value.baseSpeed;
}

function isWorld(value: unknown): value is WorldMessage {
  if (!isRecord(value)) return false;
  const collisionRadii = value.collisionRadii;
  return value.type === "world" &&
    value.authority === "server" &&
    value.protocolVersion === EXPECTED_PROTOCOL_VERSION &&
    typeof value.roomId === "string" &&
    typeof value.tick === "number" && Number.isSafeInteger(value.tick) &&
    typeof value.arenaRadius === "number" && Number.isFinite(value.arenaRadius) &&
    isRecord(collisionRadii) &&
    typeof collisionRadii.baseRadius === "number" && Number.isFinite(collisionRadii.baseRadius) && collisionRadii.baseRadius > 0 &&
    typeof collisionRadii.massRadiusFactor === "number" && Number.isFinite(collisionRadii.massRadiusFactor) && collisionRadii.massRadiusFactor >= 0 &&
    typeof collisionRadii.bodyRadiusFactor === "number" && Number.isFinite(collisionRadii.bodyRadiusFactor) && collisionRadii.bodyRadiusFactor > 0 &&
    Array.isArray(value.drops) && value.drops.every(isPublicDrop) &&
    (value.board === undefined || isPublicBoard(value.board, value.roomId)) &&
    (value.pace === undefined || isPublicPace(value.pace)) &&
    (value.heatRing === undefined || isPublicHeatRing(value.heatRing));
}

function isServerError(value: unknown): value is ErrorMessage {
  return isRecord(value) && value.type === "error" &&
    typeof value.code === "string" && typeof value.message === "string";
}

function initialUi(roomId: string): LiveUiState {
  return {
    phase: "connecting",
    detail: "Opening a secure arena socket…",
    roomId,
    tick: 0,
    humans: 0,
    ai: 0,
    players: 0,
    score: 0,
    mass: DEFAULT_GAME_CONFIG.startMass,
    length: DEFAULT_GAME_CONFIG.startingBodySegments,
    rank: 1,
    rankTotal: 1,
    leaderboard: [],
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    exactMass: DEFAULT_GAME_CONFIG.startMass,
    collisionHeadRadius: 0,
    collisionBodyRadius: 0,
    collisionRadii: { baseRadius: 0, massRadiusFactor: 0, bodyRadiusFactor: 0 },
    alive: false,
    boosting: false,
    activeRelic: undefined,
    fixedStepSeconds: DEFAULT_GAME_CONFIG.fixedStepSeconds,
    neutralSparks: 0,
    popClusters: 0,
    sprintDrops: 0,
    rivalRemains: 0,
    collectorBeacons: 0,
    relicBeacons: 0,
  };
}

export function LiveArenaCanvas({
  playerName,
  running,
  session,
  roomId,
  publicMatchmaking = false,
  boardId,
  paceId,
  themeId,
  photoSkin,
  worldCosmetics,
  controlScheme,
  onBoardResolved,
  onPaceResolved,
  onRoomResolved,
  onLifeEnded,
  onExit,
}: LiveArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const snapshotRef = useRef<SnapshotMessage | null>(null);
  const presenceRef = useRef<PresenceMessage | null>(null);
  const presentationRef = useRef(createLivePresentationBuffer());
  const worldRef = useRef<LiveWorldState | null>(null);
  const handshakeRef = useRef<AuthorityHandshake | null>(null);
  const photoSkinRef = useRef(photoSkin);
  photoSkinRef.current = photoSkin;
  const onLifeEndedRef = useRef(onLifeEnded);
  onLifeEndedRef.current = onLifeEnded;
  const directionRef = useRef<Vec2>({ x: 1, y: 0 });
  const boostRef = useRef(false);
  const sprintStartedAtRef = useRef<number | undefined>(undefined);
  const sprintReleaseTimerRef = useRef<number | undefined>(undefined);
  const touchGuideRef = useRef<TouchGuide | null>(null);
  const tutorialSparkIdRef = useRef<string | null>(null);
  const tutorialRetargetRef = useRef<{
    count: number;
    reason?: "removed" | "behind" | "too-far";
  }>({ count: 0 });
  const tutorialTargetTrackingRef = useRef<{
    id?: string;
    closestDistance?: number;
  }>({});
  const deathNoticeTimerRef = useRef<number | undefined>(undefined);
  const actionCalloutTimerRef = useRef<number | undefined>(undefined);
  const sequenceRef = useRef(-1);
  const nextHudRefreshAtRef = useRef(0);
  const cameraRef = useRef<CameraMotionState>(createCameraMotionState());
  const particlesRef = useRef<LiveParticle[]>([]);
  const boundaryStrikeRef = useRef<BoundaryGuardianStrike | undefined>(undefined);
  const particleEmissionsRef = useRef(0);
  const previousFrameAtRef = useRef<number | undefined>(undefined);
  const pickupComboRef = useRef({ count: 0, lastTick: Number.NEGATIVE_INFINITY });
  const lastAwardedDeathTickRef = useRef(-1);
  const collectorPullEventsRef = useRef(0);
  const heatRingUiRef = useRef<HeatRingUiState>({
    phase: "idle",
    botCount: 0,
    jewelCount: 0,
    totalMass: 0,
  });
  const audioRef = useRef<AudioContext | null>(null);
  const reducedMotionRef = useRef(
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const debugHitboxesRef = useRef(new URLSearchParams(window.location.search).get("hitboxes") === "1");
  const [boosting, setBoosting] = useState(false);
  const [touchGuide, setTouchGuide] = useState<TouchGuide | null>(null);
  const [deathNotice, setDeathNotice] = useState<string | null>(null);
  const [actionCallout, setActionCallout] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(reducedMotionRef.current);
  const [mobileIntelPanel, setMobileIntelPanel] = useState<"none" | "map" | "scores">("none");
  const arenaUrl = configuredArenaUrl();
  const [ui, setUi] = useState<LiveUiState>(() => initialUi(roomId));
  const tutorial = useArenaTutorial(running, `${session}:${roomId}`);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = preference.matches;
      setReducedMotion(preference.matches);
    };
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    cameraRef.current = createCameraMotionState();
    setMobileIntelPanel("none");
  }, [roomId, session]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const focusStage = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (document.querySelector('[aria-modal="true"]')) return;
        stageRef.current?.focus({ preventScroll: true });
      });
    };
    focusStage();
    document.addEventListener("fullscreenchange", focusStage);
    document.addEventListener("webkitfullscreenchange", focusStage);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("fullscreenchange", focusStage);
      document.removeEventListener("webkitfullscreenchange", focusStage);
    };
  }, [running, session]);

  const ensureAudio = useCallback(() => {
    if (!running) return;
    const AudioContextCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    audioRef.current ??= new AudioContextCtor();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
  }, [running]);

  const playTone = useCallback((frequency: number, duration = 0.07, gainValue = 0.03) => {
    const audio = audioRef.current;
    if (!audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.12, audio.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }, []);

  const showActionCallout = useCallback((message: string, durationMs = 850) => {
    setActionCallout(message);
    if (actionCalloutTimerRef.current !== undefined) {
      window.clearTimeout(actionCalloutTimerRef.current);
    }
    actionCalloutTimerRef.current = window.setTimeout(() => setActionCallout(null), durationMs);
  }, []);

  const recordMeaningfulSteer = useCallback((direction: Vec2) => {
    ensureAudio();
    const world = worldRef.current;
    const snapshot = snapshotRef.current;
    const playerId = handshakeRef.current?.playerId;
    const player = snapshot?.players.find((candidate) => candidate.id === playerId);
    if (!world || !player) return;
    if (!tutorial.meaningfulSteer(direction, player.direction)) return;
    const target = nearestNetworkSpark(
      world,
      player.position,
      direction,
    );
    tutorialSparkIdRef.current = target?.id ?? null;
    tutorialTargetTrackingRef.current = {
      id: target?.id,
      closestDistance: target
        ? Math.hypot(
          target.position.x - player.position.x,
          target.position.y - player.position.y,
        )
        : undefined,
    };
  }, [ensureAudio, tutorial.meaningfulSteer]);

  useEffect(() => {
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
      sprintReleaseTimerRef.current = undefined;
    }
    sprintStartedAtRef.current = undefined;
    boostRef.current = false;
    setBoosting(false);
    tutorialSparkIdRef.current = null;
    tutorialRetargetRef.current = { count: 0 };
    tutorialTargetTrackingRef.current = {};
    particlesRef.current = [];
    boundaryStrikeRef.current = undefined;
    particleEmissionsRef.current = 0;
    pickupComboRef.current = { count: 0, lastTick: Number.NEGATIVE_INFINITY };
    collectorPullEventsRef.current = 0;
    heatRingUiRef.current = {
      phase: "idle",
      botCount: 0,
      jewelCount: 0,
      totalMass: 0,
    };
    nextHudRefreshAtRef.current = 0;
  }, [roomId, session]);

  const sendInputNow = useCallback((boost: boolean) => {
    const socket = socketRef.current;
    const handshake = handshakeRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !handshake?.welcomed) return;
    sequenceRef.current += 1;
    socket.send(JSON.stringify({
      type: "input",
      sequence: sequenceRef.current,
      clientTick: snapshotRef.current?.tick,
      direction: directionRef.current,
      boost,
    }));
  }, []);

  const finishSprint = useCallback(() => {
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
      sprintReleaseTimerRef.current = undefined;
    }
    sprintStartedAtRef.current = undefined;
    if (!boostRef.current) return;
    boostRef.current = false;
    setBoosting(false);
    tutorial.releasedSprint();
    sendInputNow(false);
  }, [sendInputNow, tutorial.releasedSprint]);

  const pressSprint = useCallback(() => {
    ensureAudio();
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
      sprintReleaseTimerRef.current = undefined;
    }
    if (boostRef.current) return;
    sprintStartedAtRef.current = performance.now();
    boostRef.current = true;
    setBoosting(true);
    tutorial.pressedSprint();
    sendInputNow(true);
  }, [ensureAudio, sendInputNow, tutorial.pressedSprint]);

  const releaseSprint = useCallback(() => {
    if (!boostRef.current) return;
    const remainingMs = remainingSprintBurstMs(
      sprintStartedAtRef.current,
      performance.now(),
    );
    if (remainingMs <= 0) {
      finishSprint();
      return;
    }
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
    }
    sprintReleaseTimerRef.current = window.setTimeout(finishSprint, remainingMs);
  }, [finishSprint]);

  const showDeathNotice = useCallback((message: string) => {
    setDeathNotice(message);
    if (deathNoticeTimerRef.current !== undefined) window.clearTimeout(deathNoticeTimerRef.current);
    deathNoticeTimerRef.current = window.setTimeout(() => setDeathNotice(null), 2_200);
  }, []);

  const updateFromSnapshot = useCallback((
    snapshot: SnapshotMessage,
    playerId: string,
    world: LiveWorldState,
  ) => {
    const connectedHumans = snapshot.players.filter((player) => player.kind === "human" && player.connected);
    const ai = snapshot.players.filter((player) => player.kind === "bot");
    const rankedPlayers = snapshot.players
      .filter((player) => player.alive)
      .sort((first, second) =>
        second.score - first.score ||
        second.mass - first.mass ||
        first.id.localeCompare(second.id),
      );
    const ownPlayer = snapshot.players.find((player) => player.id === playerId);
    const aliveRank = rankedPlayers.findIndex((player) => player.id === playerId);
    const rank = aliveRank >= 0
      ? aliveRank + 1
      : ownPlayer
        ? snapshot.players
          .slice()
          .sort((first, second) =>
            second.score - first.score ||
            second.mass - first.mass ||
            first.id.localeCompare(second.id),
          )
          .findIndex((player) => player.id === playerId) + 1
        : Math.max(1, snapshot.players.length);
    const leaderboard = rankedPlayers
      .slice(0, 10)
      .map((player, index) => ({ player, rank: index + 1 }));
    const nextRankGap = ownPlayer && aliveRank > 0
      ? Math.max(0, rankedPlayers[aliveRank - 1].score - ownPlayer.score)
      : undefined;
    const collisionHeadRadius = ownPlayer ? getPlayerRadius(ownPlayer, world.collisionRadii) : 0;
    const collisionBodyRadius = ownPlayer ? getBodyRadius(ownPlayer, world.collisionRadii) : 0;
    const activeRelic = ownPlayer?.specialist
      ? { ...ownPlayer.specialist }
      : undefined;
    const drops = [...world.drops.values()];
    const chargingViews = world.board?.chargingStations.map((station) => ({
      station,
      state: world.chargingStations.get(station.id),
    })) ?? [];
    setUi({
      phase: "authoritative",
      detail: "Server snapshot confirmed",
      roomId: snapshot.roomId,
      playerId,
      tick: snapshot.tick,
      humans: connectedHumans.length,
      ai: ai.length,
      players: snapshot.players.length,
      score: ownPlayer?.score ?? 0,
      mass: Math.round(ownPlayer?.mass ?? 0),
      length: ownPlayer?.body.length ?? 0,
      rank,
      rankTotal: Math.max(1, rankedPlayers.length),
      nextRankGap,
      leaderboard,
      position: ownPlayer ? { ...ownPlayer.position } : { x: 0, y: 0 },
      direction: ownPlayer ? { ...ownPlayer.direction } : { x: 1, y: 0 },
      exactMass: ownPlayer?.mass ?? 0,
      collisionHeadRadius,
      collisionBodyRadius,
      collisionRadii: world.collisionRadii,
      alive: ownPlayer?.alive ?? false,
      boosting: ownPlayer?.boosting === true,
      activeRelic,
      fixedStepSeconds: world.fixedStepSeconds,
      neutralSparks: drops.filter((drop) =>
        drop.source === "arena" && !getGroundRelicPresentation(drop)
      ).length,
      popClusters: drops.filter((drop) =>
        drop.source === "arena" &&
        !getGroundRelicPresentation(drop) &&
        drop.mass >= RARE_TREASURE_CHEST_MASS
      ).length,
      sprintDrops: drops.filter((drop) => drop.source === "boost").length,
      rivalRemains: drops.filter((drop) => drop.source === "death").length,
      collectorBeacons: drops.filter((drop) =>
        getGroundRelicPresentation(drop)?.relicKind === "loot-compass"
      ).length,
      relicBeacons: drops.filter((drop) =>
        Boolean(getGroundRelicPresentation(drop))
      ).length,
      chargingStation: selectChargingStationPresentation(
        chargingViews,
        world.fixedStepSeconds,
        playerId,
        ownPlayer?.position,
      ),
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    let disposed = false;
    let reconnectTimer: number | undefined;
    let attempts = 0;
    let roomRulesResolved = false;
    let assignedRoomId = roomId;
    let storageKey = reconnectStorageKey(arenaUrl, assignedRoomId);

    const connect = () => {
      if (disposed) return;
      const reconnecting = attempts > 0;
      handshakeRef.current = null;
      presenceRef.current = null;
      setUi((current) => ({
        ...current,
        phase: reconnecting ? "reconnecting" : "connecting",
        detail: reconnecting
          ? `Reconnecting to the authority · attempt ${attempts + 1}`
          : "Opening the authoritative arena socket…",
        lastError: undefined,
      }));

      let socket: WebSocket;
      try {
        socket = new WebSocket(arenaUrl);
      } catch (error) {
        setUi((current) => ({
          ...current,
          phase: "error",
          detail: "The configured arena address is invalid.",
          lastError: error instanceof Error ? error.message : "Invalid WebSocket URL",
        }));
        return;
      }
      socketRef.current = socket;
      let retriedWithoutToken = false;
      let retriedWithoutRoomRules = false;

      const sendJoin = (reconnectToken?: string, includeRoomRules = true) => {
        socket.send(JSON.stringify({
          type: "join",
          roomId: assignedRoomId,
          name: playerName || "Guest",
          ...(reconnectToken ? { reconnectToken } : {}),
          ...(includeRoomRules && !roomRulesResolved && boardId ? { boardId } : {}),
          ...(includeRoomRules && !roomRulesResolved && paceId ? { paceId } : {}),
          themeId,
          presenceV1: true,
          snapshotTupleV1: true,
          ...(!reconnectToken && publicMatchmaking ? { matchmakingV1: true } : {}),
        }));
      };

      socket.addEventListener("open", () => {
        if (disposed || socketRef.current !== socket) return;
        setUi((current) => ({
          ...current,
          phase: "joining",
          detail: "Socket open · waiting for server welcome and snapshot…",
        }));
        sendJoin(safeSessionGet(storageKey));
      });

      socket.addEventListener("message", (event) => {
        if (disposed || socketRef.current !== socket || typeof event.data !== "string") return;
        let message: unknown;
        try {
          message = decodeSnapshotFromWire(JSON.parse(event.data)) as ServerMessage | null;
          if (message === null) throw new Error("Invalid packed snapshot");
        } catch {
          setUi((current) => ({
            ...current,
            phase: "error",
            detail: "The arena sent an unreadable message.",
            lastError: "BAD_JSON_FROM_SERVER",
          }));
          return;
        }

        if (isWelcome(message) && (publicMatchmaking || message.roomId === roomId)) {
          assignedRoomId = message.roomId;
          storageKey = reconnectStorageKey(arenaUrl, assignedRoomId);
          safeSessionSet(storageKey, message.reconnectToken);
          onRoomResolved?.(message.roomId);
          sequenceRef.current = Math.max(sequenceRef.current, message.lastAcceptedSequence);
          handshakeRef.current = {
            roomId: message.roomId,
            playerId: message.playerId,
            welcomed: true,
            worldSynced: false,
            snapshotted: false,
            fixedStepSeconds: message.fixedStepSeconds,
          };
          setUi((current) => ({
            ...current,
            phase: "joining",
            detail: message.reconnected
              ? "Identity restored · validating a fresh server snapshot…"
              : "Server welcome confirmed · validating the first snapshot…",
            playerId: message.playerId,
          }));
          return;
        }

        if (isWorld(message)) {
          const handshake = handshakeRef.current;
          if (!handshake?.welcomed || message.roomId !== handshake.roomId) return;
          worldRef.current = {
            roomId: message.roomId,
            arenaRadius: message.arenaRadius,
            fixedStepSeconds: handshake.fixedStepSeconds,
            collisionRadii: { ...message.collisionRadii },
            drops: new Map(message.drops.map((drop) => [drop.id, drop])),
            board: message.board,
            pace: message.pace,
            chargingStations: new Map(),
            heatRing: message.heatRing,
          };
          roomRulesResolved = true;
          if (message.board && isGameBoardId(message.board.id)) {
            onBoardResolved?.(message.board.id);
          }
          if (message.pace && isGamePaceId(message.pace.id)) {
            onPaceResolved?.(message.pace.id);
          }
          if (message.heatRing) {
            heatRingUiRef.current = {
              phase: "active",
              botCount: message.heatRing.botIds.length,
              jewelCount: 0,
              totalMass: 0,
            };
            showActionCallout("CORSAIR HEAT RING · 2 LABELED AI DUEL AHEAD", 2_600);
          }
          handshake.worldSynced = true;
          setUi((current) => ({
            ...current,
            phase: "joining",
            detail: "World sync confirmed · validating a fresh player snapshot…",
          }));
          return;
        }

        if (isPresence(message)) {
          const handshake = handshakeRef.current;
          const world = worldRef.current;
          if (!handshake?.welcomed || !handshake.worldSynced || message.roomId !== handshake.roomId) return;
          if (!world || world.roomId !== message.roomId) return;
          presenceRef.current = message;
          const currentSnapshot = snapshotRef.current;
          if (currentSnapshot) {
            const merged = mergeSnapshotWithPresence(currentSnapshot, message);
            snapshotRef.current = merged;
            const now = performance.now();
            if (now >= nextHudRefreshAtRef.current) {
              nextHudRefreshAtRef.current = now + HUD_REFRESH_INTERVAL_MS;
              updateFromSnapshot(merged, handshake.playerId, world);
            }
          }
          return;
        }

        if (isSnapshot(message)) {
          const handshake = handshakeRef.current;
          const world = worldRef.current;
          if (!handshake?.welcomed || !handshake.worldSynced || message.roomId !== handshake.roomId) return;
          if (!world || world.roomId !== message.roomId) return;
          if (!message.players.some((player) => player.id === handshake.playerId)) return;
          const competitiveSnapshot = mergeSnapshotWithPresence(message, presenceRef.current);
          const removedDrops = new Map<string, PublicDropState>();
          for (const id of message.removedDropIds) {
            const drop = world.drops.get(id);
            if (drop) removedDrops.set(id, drop);
          }
          for (const id of message.removedDropIds) world.drops.delete(id);
          for (const drop of message.dropUpserts) world.drops.set(drop.id, drop);
          if (message.chargingStations) {
            world.chargingStations = new Map(
              message.chargingStations.map((station) => [station.stationId, station]),
            );
          }
          for (const gameEvent of message.events) {
            if (gameEvent.type === "heatRingStarted") {
              world.heatRing = gameEvent.heatRing;
              if (heatRingUiRef.current.phase !== "active") {
                heatRingUiRef.current = {
                  phase: "active",
                  botCount: gameEvent.heatRing.botIds.length,
                  jewelCount: 0,
                  totalMass: 0,
                };
                showActionCallout("CORSAIR HEAT RING · 2 LABELED AI DUEL AHEAD", 2_600);
              }
            }
            if (gameEvent.type === "heatRingResolved") {
              const realJewels = gameEvent.dropIds
                .map((id) => world.drops.get(id))
                .filter((drop): drop is PublicDropState =>
                  drop?.source === "death" &&
                  drop.mixedOrigin !== true &&
                  drop.originPlayerId !== undefined &&
                  (gameEvent.defeatedId
                    ? drop.originPlayerId === gameEvent.defeatedId
                    : gameEvent.botIds.includes(drop.originPlayerId))
                );
              const realMass = realJewels.reduce((sum, drop) => sum + drop.mass, 0);
              const reconciled = realJewels.length === gameEvent.dropIds.length &&
                Math.abs(realMass - gameEvent.totalMass) <= 1e-6;
              world.heatRing = undefined;
              heatRingUiRef.current = {
                phase: "resolved",
                botCount: gameEvent.botIds.length,
                jewelCount: reconciled ? realJewels.length : 0,
                totalMass: reconciled ? realMass : 0,
              };
              showActionCallout(
                reconciled
                  ? `${gameEvent.winnerId
                      ? `${competitiveSnapshot.players.find((player) => player.id === gameEvent.winnerId)?.name?.toUpperCase() ?? "RIVAL"} WINS · `
                      : ""}RIVAL HOARD RELEASED · ${realJewels.length} REAL JEWELS · ${Number(realMass.toFixed(1))} SIZE`
                  : "RIVAL HOARD RELEASED · VERIFYING REAL JEWELS",
                2_800,
              );
              playTone(420, 0.12, 0.04);
              window.setTimeout(() => playTone(690, 0.16, 0.035), 90);
              if (!reducedMotionRef.current) navigator.vibrate?.([14, 24, 28]);
            }
            if (gameEvent.type === "heatRingAborted") {
              world.heatRing = undefined;
              heatRingUiRef.current = {
                phase: "aborted",
                botCount: gameEvent.botIds.length,
                jewelCount: 0,
                totalMass: 0,
              };
              showActionCallout(
                gameEvent.reason === "second-human"
                  ? "CORSAIR DUEL CLEARED · HUMAN CREW ARRIVED"
                  : "CORSAIR DUEL CLEARED · SAFETY RESET",
                1_500,
              );
            }
            if (gameEvent.type === "dropCollected" && gameEvent.playerId === handshake.playerId) {
              tutorial.collectedSpark(gameEvent.dropId, tutorialSparkIdRef.current);
              if (gameEvent.mass > 0) {
                window.dispatchEvent(new Event("wormifi:treasure-collected"));
              }
              const ownPlayer = competitiveSnapshot.players.find((player) => player.id === handshake.playerId);
              const collectedDrop = removedDrops.get(gameEvent.dropId);
              const collectedPopCluster = collectedDrop?.source === "arena" &&
                collectedDrop.mass >= RARE_TREASURE_CHEST_MASS;
              const combo = message.tick - pickupComboRef.current.lastTick < 21
                ? Math.min(8, pickupComboRef.current.count + 1)
                : 1;
              pickupComboRef.current = { count: combo, lastTick: message.tick };
              if (ownPlayer) {
                const collectorPull =
                  getActiveRelicPresentation(ownPlayer.specialist)?.relicKind === "loot-compass" &&
                  ownPlayer.specialist !== undefined &&
                  ownPlayer.specialist.expiresAtTick > message.tick &&
                  collectedDrop &&
                  (collectedDrop.source === "arena" ||
                    (collectedDrop.source === "boost" &&
                      collectedDrop.mixedOrigin !== true &&
                      collectedDrop.originPlayerId === ownPlayer.id));
                if (collectorPull) {
                  collectorPullEventsRef.current += 1;
                  pushCollectorPull(
                    particlesRef.current,
                    collectedDrop.position,
                    ownPlayer.position,
                    reducedMotionRef.current ? 0 : 7,
                    dropColors[combo % dropColors.length],
                    message.tick,
                  );
                } else {
                  pushLiveBurst(
                    particlesRef.current,
                    collectedDrop?.position ?? ownPlayer.position,
                    reducedMotionRef.current ? 0 : 5,
                    [dropColors[combo % dropColors.length]],
                    message.tick,
                    0.72,
                  );
                }
                if (gameEvent.mass > 0) {
                  const rewardLife = reducedMotionRef.current ? 0.55 : 0.78;
                  particlesRef.current.push({
                    x: ownPlayer.position.x,
                    y: ownPlayer.position.y,
                    vx: 0,
                    vy: reducedMotionRef.current ? 0 : -44,
                    life: rewardLife,
                    maxLife: rewardLife,
                    radius: collectedPopCluster ? 34 : 26,
                    color: collectedPopCluster ? "#fff1a1" : "#eafffb",
                    // The server sends the final award after any active
                    // Treasure Multiplier, so the popup never double-counts.
                    rewardPoints: treasurePointValue(gameEvent.mass),
                  });
                }
              }
              if (combo <= 5 || combo === 8) playTone(280 + combo * 55, 0.055, 0.022);
              if (collectedPopCluster && combo !== 6 && combo !== 8) {
                showActionCallout("TREASURE CHEST · JACKPOT", 750);
                if (!reducedMotionRef.current) navigator.vibrate?.(12);
              }
              if (combo === 6 || combo === 8) {
                showActionCallout(`${collectedPopCluster ? "CHEST · " : ""}TREASURE STREAK ×${combo}`, 700);
                if (!reducedMotionRef.current) navigator.vibrate?.(8);
              }
            }
            if (gameEvent.type === "massShed" && gameEvent.playerId === handshake.playerId) {
              tutorial.spentSprint();
              playTone(165, 0.045, 0.012);
            }
            if (gameEvent.type === "specialistActivated" && gameEvent.playerId === handshake.playerId) {
              tutorial.sawCollector();
              const relic = resolveRelicPresentation(gameEvent.relicKind);
              const effectText = getRelicEffectText(relic, gameEvent.relicTier);
              const ownPlayer = competitiveSnapshot.players.find((player) => player.id === handshake.playerId);
              if (ownPlayer) {
                pushLiveBurst(
                  particlesRef.current,
                  ownPlayer.position,
                  reducedMotionRef.current ? 0 : 20,
                  [relic.carrierAccent, "#4bcfff", "#f2fff9"],
                  message.tick,
                  1.15,
                );
              }
              showActionCallout(`${relic.label.toUpperCase()} ON · ${effectText}`, 2_200);
              playTone(520, 0.11, 0.035);
              window.setTimeout(() => playTone(760, 0.14, 0.03), 80);
              if (!reducedMotionRef.current) navigator.vibrate?.([12, 24, 22]);
            }
            if (gameEvent.type === "specialistExpired" && gameEvent.playerId === handshake.playerId) {
              const relic = resolveRelicPresentation(gameEvent.relicKind);
              showActionCallout(`${relic.label.toUpperCase()} SPENT · FIND ANOTHER RELIC`, 900);
            }
            if (gameEvent.type === "chargingCompleted" && gameEvent.playerId === handshake.playerId) {
              const station = world.board?.chargingStations.find(
                (candidate) => candidate.id === gameEvent.stationId,
              );
              showActionCallout(
                station?.kind === "harbor"
                  ? `${station.name.toUpperCase()} PAD CASHED · +${Number(gameEvent.massAwarded.toFixed(1))} SIZE`
                  : `${station?.name.toUpperCase() ?? "CAPSTAN"} CHARGED · +${Number(gameEvent.massAwarded.toFixed(1))} SIZE`,
                2_000,
              );
              playTone(470, 0.1, 0.04);
              window.setTimeout(() => playTone(720, 0.16, 0.035), 85);
              if (!reducedMotionRef.current) navigator.vibrate?.([10, 18, 28]);
            }
            if (gameEvent.type === "playerDied") {
              const victim = competitiveSnapshot.players.find((player) => player.id === gameEvent.playerId) ??
                snapshotRef.current?.players.find((player) => player.id === gameEvent.playerId);
              if (gameEvent.cause === "boundary" && victim) {
                const strikeStartedAt = performance.now();
                boundaryStrikeRef.current = {
                  position: { ...victim.position },
                  startedAt: strikeStartedAt,
                  until: strikeStartedAt + 760,
                };
              }
              if (victim && !reducedMotionRef.current) {
                const particleCountBeforeRelease = particlesRef.current.length;
                appendDeathReleaseParticles(
                  particlesRef.current,
                  victim,
                  palettes[stableNumber(victim.id) % palettes.length],
                  message.tick,
                );
                particleEmissionsRef.current += Math.max(
                  0,
                  particlesRef.current.length - particleCountBeforeRelease,
                );
              }
              if (gameEvent.killerId === handshake.playerId && gameEvent.playerId !== handshake.playerId) {
                showActionCallout(`CHAIN CUT · ${victim?.name ?? "RIVAL"} RELEASED`, 2_200);
                playTone(510, 0.11, 0.055);
                if (!reducedMotionRef.current) navigator.vibrate?.([12, 18, 22]);
              }
              if (gameEvent.playerId === handshake.playerId) {
                const killer = gameEvent.killerId
                  ? competitiveSnapshot.players.find((player) => player.id === gameEvent.killerId)?.name
                  : undefined;
                pickupComboRef.current = { count: 0, lastTick: Number.NEGATIVE_INFINITY };
                showDeathNotice(
                  gameEvent.cause === "boundary"
                    ? "YOU CRASHED · YOUR HEAD HIT THE ARENA EDGE · RESPAWNING…"
                    : `YOU CRASHED · YOUR HEAD HIT ${killer ? `${killer.toUpperCase()}'S` : "A RIVAL"} CREW · RESPAWNING…`,
                );
                playTone(125, 0.2, 0.065);
                if (!reducedMotionRef.current) navigator.vibrate?.([35, 25, 80]);
                if (victim && lastAwardedDeathTickRef.current !== message.tick) {
                  lastAwardedDeathTickRef.current = message.tick;
                  const ranked = [...competitiveSnapshot.players]
                    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
                  const rank = Math.max(1, ranked.findIndex((player) => player.id === victim.id) + 1);
                  onLifeEndedRef.current?.({
                    source: "live",
                    score: victim.score,
                    kills: victim.kills,
                    rank,
                    peakMass: victim.mass,
                  });
                }
              }
            }
            if (
              gameEvent.type === "playerSpawned" &&
              gameEvent.playerId === handshake.playerId &&
              handshake.snapshotted
            ) {
              showDeathNotice("BACK IN · HEAD SAFE 1.5S · EVERY CREW BODY STAYS LETHAL");
            }
          }
          if (tutorial.stageRef.current === "spark") {
            const ownPlayer = competitiveSnapshot.players.find((player) => player.id === handshake.playerId);
            if (ownPlayer) {
              const previousId = tutorialSparkIdRef.current;
              const target = previousId ? world.drops.get(previousId) : undefined;
              let issue = networkTutorialTargetIssue(ownPlayer, target, world.collisionRadii);
              if (target) {
                const distance = Math.hypot(
                  target.position.x - ownPlayer.position.x,
                  target.position.y - ownPlayer.position.y,
                );
                if (tutorialTargetTrackingRef.current.id !== target.id) {
                  tutorialTargetTrackingRef.current = {
                    id: target.id,
                    closestDistance: distance,
                  };
                } else {
                  const closest = Math.min(
                    tutorialTargetTrackingRef.current.closestDistance ?? distance,
                    distance,
                  );
                  tutorialTargetTrackingRef.current.closestDistance = closest;
                  if (!issue && distance > closest + 48) issue = "behind";
                }
              }
              if (issue) {
                const nextTarget = nearestNetworkSpark(
                  world,
                  ownPlayer.position,
                  ownPlayer.direction,
                  previousId ?? undefined,
                );
                tutorialSparkIdRef.current = nextTarget?.id ?? null;
                tutorialTargetTrackingRef.current = {
                  id: nextTarget?.id,
                  closestDistance: nextTarget
                    ? Math.hypot(
                      nextTarget.position.x - ownPlayer.position.x,
                      nextTarget.position.y - ownPlayer.position.y,
                    )
                    : undefined,
                };
                if (previousId && nextTarget?.id !== previousId) {
                  tutorialRetargetRef.current = {
                    count: tutorialRetargetRef.current.count + 1,
                    reason: issue,
                  };
                }
              }
            }
          }
          const firstAuthoritativeSnapshot = !handshake.snapshotted;
          handshake.snapshotted = true;
          pushAuthoritativeSnapshot(
            presentationRef.current,
            message,
            performance.now(),
            world.fixedStepSeconds,
          );
          snapshotRef.current = competitiveSnapshot;
          attempts = 0;
          const now = performance.now();
          if (firstAuthoritativeSnapshot || now >= nextHudRefreshAtRef.current) {
            nextHudRefreshAtRef.current = now + HUD_REFRESH_INTERVAL_MS;
            updateFromSnapshot(competitiveSnapshot, handshake.playerId, world);
          }
          return;
        }

        if (isServerError(message)) {
          if (message.code === "INVALID_RECONNECT_TOKEN" && !retriedWithoutToken) {
            retriedWithoutToken = true;
            safeSessionRemove(storageKey);
            setUi((current) => ({
              ...current,
              phase: "joining",
              detail: "Old seat expired · requesting a clean server-owned seat…",
            }));
            sendJoin(undefined, !retriedWithoutRoomRules);
            return;
          }
          if (
            (message.code === "ROOM_BOARD_MISMATCH" || message.code === "ROOM_PACE_MISMATCH") &&
            (boardId || paceId) &&
            !retriedWithoutRoomRules &&
            !handshakeRef.current?.welcomed
          ) {
            retriedWithoutRoomRules = true;
            roomRulesResolved = true;
            setUi((current) => ({
              ...current,
              phase: "joining",
              detail: "Existing room found · accepting its locked board and speed…",
            }));
            sendJoin(safeSessionGet(storageKey), false);
            return;
          }
          setUi((current) => ({
            ...current,
            phase: handshakeRef.current?.snapshotted ? current.phase : "error",
            detail: handshakeRef.current?.snapshotted ? current.detail : "The arena rejected the join request.",
            lastError: `${message.code}: ${message.message}`,
          }));
        }
      });

      socket.addEventListener("close", () => {
        if (disposed || socketRef.current !== socket) return;
        socketRef.current = null;
        handshakeRef.current = null;
        attempts += 1;
        const delay = Math.min(8_000, 450 * 2 ** Math.min(attempts - 1, 5));
        setUi((current) => ({
          ...current,
          phase: "reconnecting",
          detail: `Connection paused · retrying in ${Math.ceil(delay / 1_000)}s…`,
        }));
        reconnectTimer = window.setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => {
        if (disposed || socketRef.current !== socket) return;
        setUi((current) => ({
          ...current,
          phase: handshakeRef.current?.snapshotted ? "reconnecting" : "error",
          detail: "The arena socket could not be reached.",
          lastError: `Unable to reach ${arenaUrl}`,
        }));
      });
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Player left");
      handshakeRef.current = null;
      snapshotRef.current = null;
      presenceRef.current = null;
      resetLivePresentationBuffer(presentationRef.current);
      worldRef.current = null;
    };
  }, [
    arenaUrl,
    themeId,
    playerName,
    roomId,
    running,
    session,
    onBoardResolved,
    onPaceResolved,
    onRoomResolved,
    publicMatchmaking,
    boardId,
    paceId,
    playTone,
    showActionCallout,
    showDeathNotice,
    tutorial.collectedSpark,
    tutorial.sawCollector,
    tutorial.spentSprint,
    tutorial.stageRef,
    updateFromSnapshot,
  ]);

  useEffect(() => () => {
    if (deathNoticeTimerRef.current !== undefined) window.clearTimeout(deathNoticeTimerRef.current);
    if (actionCalloutTimerRef.current !== undefined) window.clearTimeout(actionCalloutTimerRef.current);
    if (sprintReleaseTimerRef.current !== undefined) window.clearTimeout(sprintReleaseTimerRef.current);
    particlesRef.current = [];
    boundaryStrikeRef.current = undefined;
    particleEmissionsRef.current = 0;
    previousFrameAtRef.current = undefined;
    pickupComboRef.current = { count: 0, lastTick: Number.NEGATIVE_INFINITY };
    collectorPullEventsRef.current = 0;
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio && audio.state !== "closed") void audio.close();
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      sendInputNow(boostRef.current);
    }, INPUT_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [running, sendInputNow, session]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!running) return;
      const directionByKey: Record<string, Vec2> = {
        ArrowUp: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const direction = directionByKey[event.key];
      if (direction) {
        event.preventDefault();
        directionRef.current = direction;
        recordMeaningfulSteer(direction);
      }
      if (event.code === "Space" || event.key === "Shift") {
        event.preventDefault();
        pressSprint();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === "Shift") {
        releaseSprint();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressSprint, recordMeaningfulSteer, releaseSprint, running]);

  useEffect(() => {
    let animationFrame = 0;
    const frame = (now: number) => {
      const previousFrameAt = previousFrameAtRef.current ?? now;
      previousFrameAtRef.current = now;
      if (reducedMotionRef.current) {
        particlesRef.current = [];
      } else {
        updateLiveParticles(particlesRef.current, Math.min(0.05, (now - previousFrameAt) / 1_000));
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const presentedSnapshot = getResponsivePresentedSnapshot(
          presentationRef.current,
          now,
          ui.playerId,
          directionRef.current,
          worldRef.current,
        );
        renderLiveArena(
          canvas,
          presentedSnapshot,
          worldRef.current,
          ui.playerId,
          cameraRef.current,
          now,
          reducedMotionRef.current ? 0 : now,
          debugHitboxesRef.current,
          tutorialSparkIdRef.current,
          particlesRef.current,
          photoSkinRef.current,
          worldCosmetics,
          boundaryStrikeRef.current,
        );
      }
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrame);
  }, [ui.playerId, worldCosmetics]);

  const setPointerDirection = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const snapshot = getResponsivePresentedSnapshot(
      presentationRef.current,
      performance.now(),
      ui.playerId,
      directionRef.current,
      worldRef.current,
    );
    const player = snapshot?.players.find((candidate) => candidate.id === ui.playerId);
    const direction = pointerSteeringDirection(
      { x: clientX - rect.left, y: clientY - rect.top },
      rect,
      cameraRef.current.position,
      player?.alive ? player.position : undefined,
      getArenaCameraZoom(
        rect.width,
        rect.height,
        player?.mass ?? ui.exactMass,
        player?.specialist ?? ui.activeRelic,
        snapshot?.tick ?? ui.tick,
      ),
      8,
    );
    if (!direction) return;
    directionRef.current = direction;
    recordMeaningfulSteer(direction);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!running || (event.target as HTMLElement).closest("button")) return;
    const guide = touchGuideRef.current;
    if (event.pointerType === "touch" && guide?.pointerId === event.pointerId) {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      const x = currentX - guide.anchorX;
      const y = currentY - guide.anchorY;
      const length = Math.hypot(x, y);
      const nextGuide = { ...guide, currentX, currentY };
      touchGuideRef.current = nextGuide;
      setTouchGuide(nextGuide);
      if (length >= 12) {
        const direction = { x: x / length, y: y / length };
        directionRef.current = direction;
        recordMeaningfulSteer(direction);
      }
      return;
    }
    if (event.pointerType === "touch") return;
    setPointerDirection(event.clientX, event.clientY);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!running || (event.target as HTMLElement).closest("button")) return;
    if (event.pointerType === "touch") {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const touch = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const fixedAnchor = fixedHelmAnchor(rect.width, rect.height, controlScheme);
      if (!touchStartsHelm(touch, fixedAnchor)) return;
      const guide: TouchGuide = {
        pointerId: event.pointerId,
        anchorX: fixedAnchor?.x ?? touch.x,
        anchorY: fixedAnchor?.y ?? touch.y,
        currentX: touch.x,
        currentY: touch.y,
      };
      touchGuideRef.current = guide;
      setTouchGuide(guide);
    } else {
      setPointerDirection(event.clientX, event.clientY);
      pressSprint();
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.pointerType === "mouse") {
      releaseSprint();
    } else if (touchGuideRef.current?.pointerId === event.pointerId) {
      touchGuideRef.current = null;
      setTouchGuide(null);
    }
  };

  const authoritative = ui.phase === "authoritative";
  const activePace = worldRef.current?.pace ?? getGamePaceProfile(paceId);
  const sprintMultiplierLabel = `${(activePace.boostSpeed / activePace.baseSpeed).toFixed(1)}×`;
  const relicStatus = createRelicStatusModel(
    ui.activeRelic,
    ui.tick,
    ui.fixedStepSeconds,
  );
  const stormBatteryActive = relicStatus?.presentation.relicKind === "storm-battery";
  const turboReserveRatio = stormBatteryActive
    ? 1
    : getPlayerTurboReserveRatio({ mass: ui.exactMass }, DEFAULT_GAME_CONFIG);
  const turboSecondsRemaining = Math.max(
    getPlayerTurboSecondsRemaining({ mass: ui.exactMass }, DEFAULT_GAME_CONFIG),
    stormBatteryActive ? relicStatus.remainingSeconds : 0,
  );
  const turboCostLabel = stormBatteryActive
    ? "costs no size while Twin Turbo Lightning is active"
    : `burns ${SPRINT_SIZE_COST_PER_SECOND} size per second`;
  const radarWorld = worldRef.current;
  const radarLandmarks: RadarLandmark[] = radarWorld
    ? [
        ...[...radarWorld.drops.values()]
          .filter((drop) => drop.specialist === "collector")
          .map((drop) => ({
            id: drop.id,
            kind: "collector" as const,
            position: drop.position,
          })),
        ...(radarWorld.heatRing
          ? [{
              id: `heat-ring-${radarWorld.heatRing.startsAtTick}`,
              kind: "heat-ring" as const,
              position: radarWorld.heatRing.center,
              radius: radarWorld.heatRing.radius,
            }]
          : []),
      ]
    : [];
  const radarSnapshot = authoritative ? snapshotRef.current : null;
  const radarIntel = createLiveRadarIntel(
    radarSnapshot,
    ui.playerId,
    liveRadarVisibleRadius(
      canvasRef.current,
      ui.exactMass,
      ui.activeRelic,
      ui.tick,
    ),
  );
  const radarStations: RadarStation[] = radarWorld?.board
    ? radarWorld.board.chargingStations.map((station) => {
        const state = radarWorld.chargingStations.get(station.id);
        return {
          id: station.id,
          position: station.position,
          active: state?.phase === "charging" || state?.phase === "interrupted",
        };
      })
    : [];
  return (
    <div
      ref={stageRef}
      className={`arena-stage live-arena-stage controls-${controlScheme}`}
      data-testid="live-arena-canvas"
      data-authority={authoritative ? "server-confirmed" : "unconfirmed"}
      data-control-scheme={controlScheme}
      data-board-id={worldRef.current?.board?.id ?? boardId ?? ""}
      data-pace-id={worldRef.current?.pace?.id ?? paceId ?? ""}
      data-theme-id={themeId}
      data-pickup-theme-id={worldCosmetics.pickupThemeId}
      data-arena-visual-theme-id={worldCosmetics.arenaThemeId}
      data-boundary-moat-id={worldCosmetics.arenaThemeId}
      data-boundary-guardian-label={getBoundaryGuardianSpec(worldCosmetics.arenaThemeId).label}
      data-local-photo-skin={photoSkin?.renderPlan.localPhotosEnabled ? "true" : "false"}
      data-local-photo-images={photoSkin?.decodedImages.size ?? 0}
      data-heat-ring-phase={heatRingUiRef.current.phase}
      data-heat-ring-bots={heatRingUiRef.current.botCount}
      data-heat-ring-jewels={heatRingUiRef.current.jewelCount}
      data-heat-ring-mass={heatRingUiRef.current.totalMass}
      data-player-count={ui.players}
      data-human-count={ui.humans}
      data-player-id={ui.playerId ?? ""}
      data-server-tick={ui.tick}
      data-player-x={Math.round(ui.position.x)}
      data-player-y={Math.round(ui.position.y)}
      data-player-mass={ui.exactMass}
      data-turbo-reserve={turboReserveRatio.toFixed(3)}
      data-turbo-seconds={turboSecondsRemaining.toFixed(2)}
      data-player-length={ui.length}
      data-mobile-intel={mobileIntelPanel}
      data-collision-head-radius={ui.collisionHeadRadius.toFixed(3)}
      data-collision-body-radius={ui.collisionBodyRadius.toFixed(3)}
      data-collision-base-radius={ui.collisionRadii.baseRadius}
      data-collision-mass-factor={ui.collisionRadii.massRadiusFactor}
      data-collision-body-factor={ui.collisionRadii.bodyRadiusFactor}
      data-relic-kind={relicStatus?.presentation.relicKind ?? ""}
      data-relic-seconds={relicStatus?.remainingSeconds.toFixed(1) ?? "0.0"}
      data-collector-active={
        relicStatus?.presentation.relicKind === "loot-compass" ? "true" : "false"
      }
      data-collector-seconds={
        relicStatus?.presentation.relicKind === "loot-compass"
          ? relicStatus.remainingSeconds.toFixed(1)
          : "0.0"
      }
      data-charging-station-id={ui.chargingStation?.stationId ?? ""}
      data-charging-station-phase={ui.chargingStation?.phase ?? "none"}
      data-charging-station-progress={ui.chargingStation?.progressRatio ?? 0}
      data-neutral-spark-count={ui.neutralSparks}
      data-pop-cluster-count={ui.popClusters}
      data-sprint-drop-count={ui.sprintDrops}
      data-rival-remains-count={ui.rivalRemains}
      data-collector-beacon-count={ui.collectorBeacons}
      data-relic-beacon-count={ui.relicBeacons}
      data-player-alive={ui.alive ? "true" : "false"}
      data-boosting={ui.boosting ? "true" : "false"}
      data-tutorial-stage={tutorial.stage}
      data-tutorial-target-id={tutorialSparkIdRef.current ?? ""}
      data-tutorial-sprint-spent={tutorial.sprintSpent ? "true" : "false"}
      data-tutorial-retarget-count={tutorialRetargetRef.current.count}
      data-tutorial-retarget-reason={tutorialRetargetRef.current.reason ?? ""}
      data-live-particle-count={particlesRef.current.length}
      data-live-particle-emissions={particleEmissionsRef.current}
      data-collector-pull-events={collectorPullEventsRef.current}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-sensory-motion={reducedMotion ? "essential-only" : "full"}
      data-live-presentation="authoritative-interpolation"
      role="region"
      aria-label="Server-authoritative Wormifi live arena"
      aria-describedby="live-arena-keyboard-help"
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <nav
        className="mobile-intel-dock"
        aria-label="Phone arena panels"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          data-testid="mobile-map-toggle"
          aria-label={`Map and standings. Rank ${ui.rank} of ${ui.rankTotal}, score ${ui.score}, size ${ui.mass}.`}
          aria-pressed={mobileIntelPanel === "map"}
          onClick={() => setMobileIntelPanel((current) => current === "map" ? "none" : "map")}
        >
          MAP
        </button>
        <button
          type="button"
          data-testid="mobile-scores-toggle"
          aria-label={`${mobileIntelPanel === "scores" ? "Close" : "Open"} Top 10 size leaderboard`}
          aria-pressed={mobileIntelPanel === "scores"}
          onClick={() => setMobileIntelPanel((current) => current === "scores" ? "none" : "scores")}
        >
          TOP 10
        </button>
      </nav>
      {radarWorld && (
        <PirateRadar
          scopeLabel={roomIdentityLabel(ui.roomId)}
          roomId={ui.roomId}
          arenaRadius={radarWorld.arenaRadius}
          position={ui.position}
          direction={ui.direction}
          alive={!authoritative || ui.alive}
          landmarks={radarLandmarks}
          otherPlayers={radarIntel.visiblePlayers}
          stations={radarStations}
          dangerBearings={radarIntel.dangerBearings}
          competition={{
            rank: ui.rank,
            rankTotal: ui.rankTotal,
            score: ui.score,
            size: ui.mass,
            humans: ui.humans,
            ai: ui.ai,
            testIdPrefix: "live-hud",
          }}
        />
      )}
      <p className="sr-only" id="live-arena-keyboard-help">
        Use Arrow keys or W A S D to steer. Hold Space or Shift to sprint.
        Press Tab to reach the Exit and Sprint controls.
      </p>

      <div className="live-authority-card" data-phase={ui.phase} aria-live="polite">
        <span
          className={`live-authority-badge ${authoritative ? "confirmed" : "pending"}`}
          data-testid="live-status"
        >
          {authoritative ? "LIVE · SERVER AUTHORITATIVE" : ui.phase.toUpperCase()}
        </span>
        <span className="live-authority-detail">{ui.detail}</span>
        <span className="live-room-line">
          ROOM {ui.roomId} · <b data-testid="live-human-count">{ui.humans} HUMAN{ui.humans === 1 ? "" : "S"}</b> · {ui.ai} AI
        </span>
        {ui.lastError && <span className="live-error" data-testid="live-error">{ui.lastError}</span>}
      </div>

      <div className="game-hud live-game-hud">
        <aside className="leaderboard live-leaderboard mobile-intel-leaderboard" aria-label="Live score leaderboard">
          <h2>TOP 10 · LIVE RUN SCORE</h2>
          {/* The board is a name, a score and a rank. It does not need a line
              explaining that it is a name, a score and a rank. */}
          <ol>
            {ui.leaderboard.map(({ player, rank }) => (
              <li
                key={player.id}
                className={player.id === ui.playerId ? "player" : ""}
                data-rank={rank}
              >
                <span className="name">
                  {player.name}{player.id === ui.playerId ? " · YOU" : ""}
                  <em className={player.kind === "human" ? "human-tag" : "ai-tag"}>
                    {player.kind === "human" ? "HUMAN" : "AI"}
                  </em>
                </span>
                <span>{player.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
          <p className="leaderboard-rankline" data-testid="live-player-rank">
            <span>YOU</span>
            <strong>#{ui.rank}</strong>
            <span>/ {ui.rankTotal}</span>
          </p>
          {ui.nextRankGap !== undefined && (
            <p className="leaderboard-chase" data-testid="live-next-rank-gap">
              {ui.nextRankGap === 0
                ? "NEXT RANK · TIED"
                : `NEXT RANK +${ui.nextRankGap.toLocaleString()}`}
            </p>
          )}
        </aside>

        <RelicStatus
          active={ui.activeRelic}
          currentTick={ui.tick}
          fixedStepSeconds={ui.fixedStepSeconds}
          reducedMotion={reducedMotion}
          className="specialist-status active"
          testId="live-relic-status"
        />

        {ui.chargingStation && (
          <ChargingStationStatus
            status={ui.chargingStation}
            testId="live-charging-station-status"
          />
        )}

        {authoritative && (
          <ArenaTutorial
            stage={tutorial.stage}
            size={ui.mass}
            alreadyMoving
            controlScheme={controlScheme}
          />
        )}

        <div className="mode-disclosure live-disclosure">
          {authoritative
            ? `LIVE ARENA · ${ui.humans} CONNECTED HUMAN${ui.humans === 1 ? "" : "S"} · AI LABELED`
            : "LIVE ARENA · NOT LIVE UNTIL SERVER SNAPSHOT IS CONFIRMED"}
        </div>
      </div>

      {touchGuide && (
        <div
          className="touch-guide"
          data-testid="live-touch-guide"
          style={{ left: touchGuide.anchorX, top: touchGuide.anchorY }}
          aria-hidden="true"
        >
          <span style={{ transform: touchKnobTransform(touchGuide) }} />
        </div>
      )}

      {deathNotice && (
        <div
          className={`live-death-notice ${deathNotice.startsWith("BACK IN") ? "safe" : "impact"}`}
          data-testid="live-death-notice"
          role="status"
          aria-label={deathNotice}
        >
          <span className="collision-impact-mark" aria-hidden="true"><i /><i /><i /></span>
        </div>
      )}
      {!touchGuide && controlScheme !== "drag-anywhere" && (
        <div
          className={`touch-guide touch-guide-idle ${controlScheme}`}
          data-testid="live-fixed-touch-guide"
          aria-hidden="true"
        >
          <span />
        </div>
      )}

      {actionCallout && (
        <div className="sr-only" data-testid="live-action-callout" role="status">
          {actionCallout}
        </div>
      )}

      <button className="exit-button" data-testid="live-exit-button" aria-label="Exit live arena" onClick={onExit}>×</button>
      <button
        className={`boost-control ${boosting ? "active" : ""}`}
        data-testid="live-boost-control"
        disabled={!authoritative || ui.mass <= DEFAULT_GAME_CONFIG.minimumBoostMass}
        aria-label={`Turbo sprint, ${sprintMultiplierLabel} speed, ${turboCostLabel}, ${turboSecondsRemaining.toFixed(1)} seconds available`}
        onPointerDown={(event) => {
          event.stopPropagation();
          pressSprint();
          navigator.vibrate?.(8);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          releaseSprint();
        }}
        onPointerCancel={(event) => {
          event.stopPropagation();
          releaseSprint();
        }}
      >
        <span aria-hidden="true">⚡</span>
        <small aria-hidden="true">{sprintMultiplierLabel}</small>
      </button>
    </div>
  );
}

function pushLiveBurst(
  particles: LiveParticle[],
  position: Vec2,
  count: number,
  colors: readonly string[],
  seed: number,
  scale = 1,
) {
  if (count <= 0 || colors.length === 0) return;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + seed * 0.173;
    const speed = (62 + (index % 9) * 15) * scale;
    particles.push({
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.9 + (index % 5) * 0.08,
      maxLife: 1.25,
      radius: (3.4 + (index % 4) * 0.8) * scale,
      color: colors[index % colors.length],
    });
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function pushCollectorPull(
  particles: LiveParticle[],
  from: Vec2,
  to: Vec2,
  count: number,
  color: string,
  seed: number,
) {
  if (count <= 0) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  for (let index = 0; index < count; index += 1) {
    const lane = ((((index + seed) % 3) + 3) % 3 - 1) * 3.2;
    const headStart = index / Math.max(1, count - 1) * 0.16;
    particles.push({
      x: from.x + dx * headStart + normalX * lane,
      y: from.y + dy * headStart + normalY * lane,
      vx: dx * (2.35 + (index % 3) * 0.22),
      vy: dy * (2.35 + (index % 3) * 0.22),
      life: 0.34 + (index % 3) * 0.045,
      maxLife: 0.44,
      radius: 2.4 + (index % 2) * 0.8,
      color: index % 3 === 0 ? "#eafffb" : color,
      streak: true,
    });
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function updateLiveParticles(particles: LiveParticle[], deltaSeconds: number) {
  for (const particle of particles) {
    particle.life -= deltaSeconds;
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vx *= Math.pow(0.15, deltaSeconds);
    particle.vy *= Math.pow(0.15, deltaSeconds);
  }
  let writeIndex = 0;
  for (const particle of particles) {
    if (particle.life <= 0) continue;
    particles[writeIndex] = particle;
    writeIndex += 1;
  }
  particles.length = writeIndex;
}

function drawLiveParticles(
  context: CanvasRenderingContext2D,
  particles: readonly LiveParticle[],
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
) {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (const particle of particles) {
    const screen = worldToScreen(particle);
    if (screen.x < -40 || screen.y < -40 || screen.x > width + 40 || screen.y > height + 40) continue;
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.globalAlpha = alpha;
    if (particle.rewardPoints !== undefined) {
      drawPickupRewardPopup(
        context,
        particle.rewardPoints,
        screen.x,
        screen.y,
        Math.max(24, particle.radius * zoom),
        alpha,
      );
      continue;
    }
    if (particle.streak) {
      context.strokeStyle = particle.color;
      context.lineWidth = Math.max(1.2, particle.radius * zoom * alpha);
      context.beginPath();
      context.moveTo(screen.x, screen.y);
      context.lineTo(
        screen.x - particle.vx * 0.055 * zoom,
        screen.y - particle.vy * 0.055 * zoom,
      );
      context.stroke();
    }
    context.shadowBlur = 0;
    drawTreasureShard(
      context,
      screen.x,
      screen.y,
      Math.max(1.8, particle.radius * zoom * alpha),
      particle.color,
      particle.life * 8 + particle.y * 0.011,
    );
  }
  context.restore();
}
function renderLiveArena(
  canvas: HTMLCanvasElement,
  snapshot: SnapshotMessage | null,
  world: LiveWorldState | null,
  playerId: string | undefined,
  cameraMotion: CameraMotionState,
  frameNow: number,
  now: number,
  debugHitboxes: boolean,
  tutorialSparkId: string | null,
  particles: readonly LiveParticle[],
  photoSkin: PhotoSkinCanvasAppearance | undefined,
  worldCosmetics: WorldCosmeticState,
  boundaryStrike: BoundaryGuardianStrike | undefined,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;
  const pixelRatio = arenaBackingScale(
    width,
    height,
    window.devicePixelRatio || 1,
    // A full 24-actor room is at least as raster-heavy as the 1,050-drop
    // Practice scene. Keep its backing density in the same stable crowded
    // tier even while pickups make the exact drop count fluctuate.
    Math.max(world?.drops.size ?? 0, (snapshot?.players.length ?? 0) * 40),
  );
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const context = canvas.getContext(
    "2d",
    ARENA_CANVAS_CONTEXT_OPTIONS,
  ) as CanvasRenderingContext2D | null;
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const arenaTheme = getArenaVisualTheme(worldCosmetics.arenaThemeId);
  drawArenaFloor(context, width, height, ...arenaTheme.colors);

  const ownPlayer = snapshot?.players.find((player) => player.id === playerId);
  const camera = advanceCameraMotion(
    cameraMotion,
    ownPlayer?.alive ? ownPlayer.position : undefined,
    frameNow,
  );
  const zoom = getArenaCameraZoom(
    width,
    height,
    ownPlayer?.mass ?? 100,
    ownPlayer?.specialist,
    snapshot?.tick ?? 0,
  );
  const worldToScreen = (point: Vec2): Vec2 => ({
    x: width / 2 + (point.x - camera.x) * zoom,
    y: height / 2 + (point.y - camera.y) * zoom,
  });

  drawNetworkGrid(context, width, height, camera, zoom, now);
  drawPirateShipBackdrop(context, width, height);
  if (!snapshot || !world) {
    context.fillStyle = "rgba(213, 244, 255, 0.72)";
    context.font = "800 13px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("WAITING FOR AN AUTHORITATIVE SNAPSHOT", width / 2, height / 2);
    return;
  }
  if (world.heatRing) {
    drawHeatRingTelegraph(
      context,
      world.heatRing,
      worldToScreen,
      zoom,
      now,
      width,
      height,
    );
  }

  context.save();
  clipCanvasToArenaCircle(context, worldToScreen({ x: 0, y: 0 }), world.arenaRadius * zoom);
  drawChargingStationField(context, {
    views: world.board?.chargingStations.map((station) => ({
      station,
      state: world.chargingStations.get(station.id),
    })) ?? [],
    worldToScreen,
    zoom,
    width,
    height,
    fixedStepSeconds: world.fixedStepSeconds,
    viewerPlayerId: playerId,
    now,
  });

  const fieldItems = liveGroundTreasureFieldScratch;
  let fieldItemCount = 0;
  for (const drop of world.drops.values()) {
    if (
      drop.id === tutorialSparkId ||
      getGroundRelicPresentation(drop) ||
      drop.source === "boost" ||
      drop.source === "death" ||
      drop.mass >= RARE_TREASURE_CHEST_MASS
    ) continue;
    const screen = worldToScreen(drop.position);
    const cullMargin = 64;
    if (
      screen.x < -cullMargin ||
      screen.y < -cullMargin ||
      screen.x > width + cullMargin ||
      screen.y > height + cullMargin
    ) continue;
    const seed = stableNumber(drop.id);
    const item = fieldItems[fieldItemCount] ?? {
      id: drop.id,
      position: drop.position,
      radius: drop.radius,
      seed,
    };
    item.id = drop.id;
    item.position = drop.position;
    item.radius = drop.radius;
    item.seed = seed;
    item.opacity = ambientTreasureOpacity(drop, snapshot.tick, world.fixedStepSeconds);
    item.screenX = screen.x;
    item.screenY = screen.y;
    fieldItems[fieldItemCount] = item;
    fieldItemCount += 1;
  }
  fieldItems.length = fieldItemCount;
  drawWorldPickupField(
    context,
    fieldItems,
    worldToScreen,
    zoom,
    width,
    height,
    now,
    worldCosmetics.pickupThemeId,
  );

  for (const drop of world.drops.values()) {
    if (
      drop.id !== tutorialSparkId &&
      !getGroundRelicPresentation(drop) &&
      drop.source !== "boost" &&
      drop.source !== "death" &&
      drop.mass < RARE_TREASURE_CHEST_MASS
    ) continue;
    context.save();
    context.globalAlpha *= ambientTreasureOpacity(drop, snapshot.tick, world.fixedStepSeconds);
    drawNetworkDrop(
      context,
      drop,
      worldToScreen,
      zoom,
      width,
      height,
      now,
      world.fixedStepSeconds,
      drop.id === tutorialSparkId,
    );
    context.restore();
  }
  drawLiveParticles(context, particles, worldToScreen, zoom, width, height);
  const players = snapshot.players
    .filter((player) => player.alive)
    .sort((first, second) => first.mass - second.mass);
  const wormMaterialMotion = now === 0 ? 0 : materialMotionScale();
  const wormMaterialGlow = materialGlowEnabled();
  for (const player of players) {
    drawNetworkChain(
      context,
      player,
      snapshot.tick,
      world.fixedStepSeconds,
      playerId,
      world.heatRing?.botIds ?? [],
      world.collisionRadii,
      worldToScreen,
      zoom,
      width,
      height,
      now,
      debugHitboxes,
      player.id === playerId ? photoSkin : undefined,
      wormMaterialMotion,
      wormMaterialGlow,
    );
  }
  context.restore();
  drawLiveBoundary(
    context,
    world,
    worldToScreen,
    zoom,
    now,
    width,
    height,
    worldCosmetics,
    boundaryStrike,
  );

  drawArenaVignette(context, width, height);
}

function drawNetworkGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Vec2,
  zoom: number,
  now: number,
) {
  drawNauticalChart(context, width, height, camera, zoom, now);
}

function drawLiveBoundary(
  context: CanvasRenderingContext2D,
  world: LiveWorldState,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  now: number,
  width: number,
  height: number,
  worldCosmetics: WorldCosmeticState,
  boundaryStrike: BoundaryGuardianStrike | undefined,
) {
  const boundary = worldToScreen({ x: 0, y: 0 });
  const radius = world.arenaRadius * zoom;
  const lineWidth = Math.max(9, 28 * zoom);
  const shadowBlur = 26;
  if (!arenaBoundaryIntersectsViewport(
    boundary,
    radius,
    lineWidth,
    shadowBlur,
    width,
    height,
  )) return;
  drawBoundaryGuardians(context, {
    center: boundary,
    radius,
    zoom,
    width,
    height,
    now,
    reducedMotion: now === 0,
    themeId: worldCosmetics.arenaThemeId,
    strike: boundaryStrike,
  });
  const guardianSpec = getBoundaryGuardianSpec(worldCosmetics.arenaThemeId);
  context.save();
  context.globalAlpha = 0.68 + Math.sin(now * 0.004) * 0.1;
  context.strokeStyle = guardianSpec.wallColor;
  context.lineWidth = lineWidth;
  context.shadowColor = guardianSpec.wallGlowColor;
  context.shadowBlur = shadowBlur;
  context.setLineDash([28 * zoom, 18 * zoom]);
  context.beginPath();
  context.arc(boundary.x, boundary.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawHeatRingTelegraph(
  context: CanvasRenderingContext2D,
  heatRing: PublicHeatRingState,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  now: number,
  width: number,
  height: number,
) {
  const center = worldToScreen(heatRing.center);
  const radius = heatRing.radius * zoom;
  if (
    center.x + radius < -30 || center.x - radius > width + 30 ||
    center.y + radius < -30 || center.y - radius > height + 30
  ) return;
  context.save();
  context.strokeStyle = "rgba(255, 205, 94, .74)";
  context.lineWidth = Math.max(2, 4 * zoom);
  context.setLineDash([Math.max(9, 16 * zoom), Math.max(7, 11 * zoom)]);
  context.lineDashOffset = -now * 0.018;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = "rgba(93, 232, 216, .36)";
  context.lineWidth = Math.max(1, 2 * zoom);
  context.beginPath();
  context.arc(center.x, center.y, radius + Math.max(6, 10 * zoom), 0, Math.PI * 2);
  context.stroke();

  if (
    center.x >= 80 && center.x <= width - 80 &&
    center.y >= 130 && center.y <= height - 210
  ) {
    const sword = Math.max(11, 18 * zoom);
    context.translate(center.x, center.y);
    context.strokeStyle = "rgba(255, 231, 160, .9)";
    context.lineWidth = Math.max(2, 3 * zoom);
    context.beginPath();
    context.moveTo(-sword, -sword);
    context.lineTo(sword, sword);
    context.moveTo(sword, -sword);
    context.lineTo(-sword, sword);
    context.stroke();
  }
  context.restore();
}

function drawNetworkDrop(
  context: CanvasRenderingContext2D,
  drop: PublicDropState,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
  fixedStepSeconds: number,
  tutorialTarget: boolean,
) {
  const screen = worldToScreen(drop.position);
  const pulse = 0.92 + Math.sin(now * 0.004 + stableNumber(drop.id)) * 0.08;
  const radius = Math.max(2.2, drop.radius * zoom * pulse);
  if (screen.x < -radius * 2 || screen.y < -radius * 2 || screen.x > width + radius * 2 || screen.y > height + radius * 2) return;
  const color = drop.specialist
    ? "#65ffe2"
    : drop.originPlayerId && drop.mixedOrigin !== true
      ? palettes[stableNumber(drop.originPlayerId) % palettes.length][0]
      : dropColors[stableNumber(drop.id) % dropColors.length];
  context.save();
  context.translate(screen.x, screen.y);

  if (tutorialTarget) {
    const ringRadius = Math.max(20, radius * 2.7 + Math.sin(now * 0.008) * 3);
    context.save();
    context.strokeStyle = "rgba(255, 235, 125, .98)";
    context.lineWidth = 3;
    context.shadowColor = "#ffe05f";
    context.shadowBlur = 18;
    context.setLineDash([9, 5]);
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }

  if (getGroundRelicPresentation(drop)) {
    const beaconRadius = Math.max(10, radius * 1.25);
    drawGroundRelicPickup(context, drop, {
      beaconRadius,
      zoom,
      now,
      fixedStepSeconds,
    });
    context.restore();
    return;
  }

  if (drop.source === "boost") {
    // Sprint Drops keep their producer's color so ownership is readable.
    context.rotate((stableNumber(drop.id) % 628) / 100);
    context.shadowColor = color;
    context.shadowBlur = 12;
    context.globalAlpha = 0.32;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(-radius * 2.1, 0);
    context.lineTo(-radius * 0.3, -radius * 0.62);
    context.lineTo(-radius * 0.3, radius * 0.62);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.beginPath();
    context.moveTo(radius * 1.15, 0);
    context.quadraticCurveTo(radius * 0.2, -radius * 1.1, -radius * 0.75, 0);
    context.quadraticCurveTo(radius * 0.2, radius * 1.1, radius * 1.15, 0);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(255,255,255,.86)";
    context.beginPath();
    context.arc(radius * 0.32, -radius * 0.2, Math.max(0.8, radius * 0.18), 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  if (drop.source === "death") {
    // Real defeated-chain mass becomes a marked rival-hoard jewel.
    drawRivalHoardGem(context, radius, color, now, stableNumber(drop.id));
    context.restore();
    return;
  }
  if (drop.mass >= RARE_TREASURE_CHEST_MASS) {
    // High-value neutral mass is one authoritative treasure chest collider.
    drawTreasureChest(context, radius, color, now, stableNumber(drop.id));
    context.restore();
    return;
  }

  if (!drawPirateAtlasSprite(context, commonTreasureSprite(stableNumber(drop.id)), {
    x: 0,
    y: 0,
    size: Math.max(
      GROUND_TREASURE_MIN_LOGICAL_SIZE,
      radius * GROUND_TREASURE_RADIUS_SCALE,
    ),
    rotation: ((stableNumber(drop.id) % 17) - 8) * 0.035,
  })) {
    drawFacetedGem(context, radius, color, now, stableNumber(drop.id));
  }
  context.restore();
}

function drawNetworkChain(
  context: CanvasRenderingContext2D,
  player: PublicPlayerState,
  currentTick: number,
  fixedStepSeconds: number,
  localPlayerId: string | undefined,
  heatCorsairIds: readonly string[],
  collisionRadii: CollisionRadiusConfig,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
  debugHitboxes: boolean,
  photoSkin: PhotoSkinCanvasAppearance | undefined,
  materialMotion: number,
  materialGlow: boolean,
) {
  const head = worldToScreen(player.position);
  const points = [player.position, ...player.body].map(worldToScreen);
  const margin = 240;
  if (!points.some((point) => point.x > -margin && point.y > -margin && point.x < width + margin && point.y < height + margin)) return;
  const palette = player.themeId
    ? [...getCosmeticTheme(player.themeId).palette]
    : palettes[stableNumber(player.id) % palettes.length];
  const headRadius = getPlayerRadius(player, collisionRadii) * zoom;
  const bodyRadius = getBodyRadius(player, collisionRadii) * zoom;
  const identityNumber = stableNumber(player.id);
  const shielded = player.shieldTicksRemaining > 0;
  const isHuman = player.kind === "human";
  const isLocal = player.id === localPlayerId;
  const isHeatCorsair = heatCorsairIds.includes(player.id);
  const activeRelic = createActiveRelicCanvasModel(player.specialist, currentTick);
  const parentAppearance = player.themeId
    ? wormateParentAppearanceFromThemeId(player.themeId)
    : undefined;
  // A themeId that does not map to a parent skin - every legacy pirate theme,
  // for instance - used to leave these undefined, and the renderer then fell
  // through to the old procedural body. That is why a player wearing
  // "tideglass-corsair" appeared as flat capsules with a badge for a head while
  // the AI around them, which carry no themeId, rendered as full parent skins.
  // Parent-quality rendering is the floor for every worm, so an unmapped theme
  // falls back to the identity skin rather than out of the parent renderer.
  const parentSkinId = (player.themeId ? parentAppearance?.skinId : undefined)
    ?? wormateParentSkinForIdentity(identityNumber);
  const parentOutfit = (player.themeId ? parentAppearance?.outfit : undefined)
    ?? wormateParentOutfitForIdentity(identityNumber);

  if (activeRelic?.presentation.relicKind === "loot-compass") {
    drawCollectorVortex(context, head, headRadius, now, palette[0]);
  } else if (activeRelic) {
    drawRelicCarrierEffect(context, activeRelic, head, headRadius, now);
  }

  context.save();
  drawContinuousPirateWorm(context, {
    points,
    headRadius,
    bodyRadius,
    palette,
    direction: player.direction,
    shielded,
    identity: identityNumber,
    now,
    // themeId is the authored, multiplayer-safe cosmetic every player already
    // shares, so every captain's animated material is visible to the room —
    // never any photo data.
    pattern: player.themeId
      ? getCosmeticTheme(player.themeId).pattern
      : wormMaterialForIdentity(identityNumber),
    cinematicHeadPattern: isLocal && photoSkin && isWormMaterialPattern(photoSkin.renderPlan.faceTheme.pattern)
      ? photoSkin.renderPlan.faceTheme.pattern
      : undefined,
    cinematicHeadPalette: isLocal ? photoSkin?.renderPlan.faceTheme.palette : undefined,
    cinematicHeadHue: isLocal ? photoSkin?.renderPlan.faceTheme.headHue ?? 0 : 0,
    faceMode: isLocal ? photoSkin?.renderPlan.faceMode : undefined,
    eyeStyle: isLocal ? photoSkin?.renderPlan.eyeStyle : undefined,
    expressionStyle: isLocal ? photoSkin?.renderPlan.expressionStyle : undefined,
    magnetized: activeRelic?.presentation.relicKind === "loot-compass",
    materialMotion,
    // Every crew keeps its authored material; only the local captain spends
    // this device's shadow-blur budget on bloom in a crowded room.
    materialGlow: materialGlow && isLocal,
    boosting: player.boosting === true,
    cinematicHead: isLocal,
    parentSkinId,
    parentOutfit,
    viewportWidth: width,
    viewportHeight: height,
  });

  if (isLocal && photoSkin && points.length > 2) {
    drawPhotoSkinCanvas(context, {
      points: points.slice(1),
      bodyRadius,
      direction: player.direction,
      decodedImages: photoSkin.decodedImages,
      renderPlan: photoSkin.renderPlan,
    });
  }

  // No on-body reserve gauge. It was originally tied to the procedural
  // renderer, and once every worm draws a parent skin it painted a hard bar
  // straight through the body - it read as a rendering fault, not a meter. The
  // boost dial in the HUD already carries this, without defacing the skin.

  if (activeRelic && points[1]) {
    // Relic paint stays inside an existing body segment. It changes neither
    // the rendered chain silhouette nor the authoritative hit circles.
    drawRelicCarrierBadge(
      context,
      activeRelic,
      points[1].x,
      points[1].y,
      bodyRadius * 0.82,
      now,
    );
  }
  if (debugHitboxes) {
    context.save();
    context.globalAlpha = 0.18;
    context.strokeStyle = "#ffffff";
    context.lineWidth = bodyRadius * 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();
    context.globalAlpha = 1;
    context.setLineDash([3, 3]);
    context.strokeStyle = "rgba(255,255,255,0.82)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    context.stroke();
    for (const point of points.slice(1)) {
      context.beginPath();
      context.arc(point.x, point.y, bodyRadius, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  context.globalAlpha = 1;

  if (isHuman) {
    context.strokeStyle = isLocal ? "rgba(255,255,255,0.96)" : "rgba(104,255,220,0.88)";
    context.lineWidth = isLocal ? 3 : 2;
    context.setLineDash(isLocal ? [] : [5, 4]);
    context.beginPath();
    context.arc(head.x, head.y, headRadius * 1.27, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }
  if (shielded) {
    context.strokeStyle = "rgba(185,252,255,0.7)";
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.arc(head.x, head.y, headRadius * 1.48, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }
  context.restore();
}

function drawCollectorVortex(
  context: CanvasRenderingContext2D,
  head: Vec2,
  headRadius: number,
  now: number,
  color: string,
) {
  const fieldRadius = Math.max(30, headRadius * 2.65);
  context.save();
  context.translate(head.x, head.y);
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = color;
  context.shadowColor = "#79ffe6";
  context.shadowBlur = 12;
  for (let ring = 0; ring < 3; ring += 1) {
    const phase = now * (0.0012 + ring * 0.00018) + ring * 2.1;
    const radius = fieldRadius * (0.48 + ring * 0.24);
    context.globalAlpha = 0.32 - ring * 0.065;
    context.lineWidth = Math.max(1.1, headRadius * (0.12 - ring * 0.015));
    context.beginPath();
    context.arc(0, 0, radius, phase, phase + Math.PI * (0.92 + ring * 0.13));
    context.stroke();

  }
  for (let mote = 0; mote < 5; mote += 1) {
    const angle = now * 0.0015 + mote * (Math.PI * 2 / 5);
    const orbit = fieldRadius * (0.58 + (mote % 2) * 0.22);
    context.globalAlpha = 0.55;
    drawTreasureShard(
      context,
      Math.cos(angle) * orbit,
      Math.sin(angle) * orbit,
      Math.max(1.8, headRadius * 0.12),
      mote % 2 === 0 ? "#ffe89d" : color,
      angle,
    );
  }
  context.restore();
}

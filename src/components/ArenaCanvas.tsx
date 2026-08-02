import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "../App";
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
  DEFAULT_GAME_CONFIG,
  calculateScore,
  getPlayerRank,
  getPlayerRadius,
  getBodyRadius,
  getRankings,
  isPlayerBoosting,
  getPlayerTurboReserveRatio,
  getPlayerTurboSecondsRemaining,
} from "../game/core";
import {
  LOCAL_BOT_COUNT,
  LOCAL_PLAYER_ID,
  LOCAL_TARGET_DROP_COUNT,
  advanceLocalReplayPreparation,
  buildLocalArena,
  checksumLocalArena,
  createLocalReplayPreparation,
  finalizeLocalRun,
  sanitizeLocalInput,
  stepLocalArena,
  type LocalRunDraft,
  type LocalRunRecording,
} from "../game/localArena";
import {
  serializeChallengePayload,
  type ChallengePayload,
} from "../game/replay";
import type {
  ActiveSpecialist,
  BotInputProviderMap,
  DropState,
  GameEvent,
  GameState,
  PlayerState,
  Vec2,
} from "../game/types";
import {
  ARENA_CANVAS_CONTEXT_OPTIONS,
  arenaBackingScale,
  drawArenaFloor,
  drawArenaVignette,
  drawFacetedGem,
  drawContinuousPirateWorm,
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
  getGroundRelicPresentation,
  getRelicEffectText,
  resolveRelicPresentation,
} from "../game/relicPresentation";
import {
  getSpyglassDangerBearings,
  type SpyglassDangerBearing,
} from "../game/relics";
import {
  getArenaCameraVisibleRadius,
  getArenaCameraZoom,
} from "../game/spatialFeel";
import { RARE_TREASURE_CHEST_MASS, treasurePointValue } from "../game/treasureEconomy";
import { ambientTreasureOpacity } from "../game/treasureFlow";
import {
  fixedHelmAnchor,
  touchStartsHelm,
  type ControlScheme,
} from "../game/controlScheme";
import {
  PirateRadar,
  type RadarLandmark,
  type RadarPlayerMarker,
  type RadarStation,
} from "./PirateRadar";
import {
  GILDED_CORSAIR_PALETTE,
  isRewardedCorsairSkinEquipped,
} from "../game/rewardedSkin";
import {
  isWormMaterialPattern,
  wormMaterialForIdentity,
} from "../game/wormMaterials";
import {
  wormateParentOutfitForIdentity,
  wormateParentSkinForIdentity,
} from "../game/wormateParentCatalog";
import { materialGlowEnabled, materialMotionScale } from "../game/renderPreferences";
import { drawWorldPickupField } from "../game/worldCosmeticRender";
import {
  drawBoundaryGuardians,
  getBoundaryGuardianSpec,
  type BoundaryGuardianStrike,
} from "../game/boundaryGuardians";
import {
  getArenaVisualTheme,
  type ArenaVisualThemeId,
  type WorldCosmeticState,
  type PickupThemeId,
} from "../game/worldCosmetics";
import {
  drawPhotoSkinCanvas,
  type PhotoSkinCanvasAppearance,
} from "../game/photoSkinCanvas";
import type { GameBoardId } from "../game/boardPreference";
import { getGamePaceProfile, type GamePaceId } from "../game/gamePace";
import { remainingSprintBurstMs } from "../game/sprintControl";
import {
  advanceCameraMotion,
  createCameraMotionState,
  pointerSteeringDirection,
  snapCameraMotion,
  type CameraMotionState,
} from "../game/cameraMotion";
import type { CaptainRunSummary } from "../game/captainProgression";
import type { CaptainDepthRunUpdate } from "../game/captainLog";
import {
  arenaBoundaryIntersectsViewport,
  clipCanvasToArenaCircle,
} from "../game/arenaBoundary";

export { arenaBoundaryIntersectsViewport } from "../game/arenaBoundary";

const PLAYER_ID = LOCAL_PLAYER_ID;
const BOT_COUNT = LOCAL_BOT_COUNT;
const groundTreasureItemCache = new WeakMap<DropState, GroundTreasureSpriteItem>();
const groundTreasureFieldScratch: GroundTreasureSpriteItem[] = [];
const chainPointPool: Vec2[] = [];
const chainPointScratch: Vec2[] = [];
const chainBodyPointScratch: Vec2[] = [];
const RUSH_SECONDS = 90;

const palettes = [
  ["#68ffdc", "#2fa9ff", "#ccfff6"],
  ["#ffcc57", "#ff7a4d", "#fff1a9"],
  ["#ff6daa", "#b86bff", "#ffd0e4"],
  ["#b4ff63", "#45d88c", "#efffba"],
  ["#70d8ff", "#7774ff", "#d8f5ff"],
  ["#ff8a72", "#ff4f69", "#ffe0c8"],
];

const foodColors = ["#5af4d4", "#4ba7ff", "#ffcf58", "#ff6fa9", "#a9ff68", "#a777ff"];

interface ArenaCanvasProps {
  playerName: string;
  mode: GameMode;
  challenge: ChallengePayload | null;
  running: boolean;
  paused: boolean;
  session: number;
  boardId: GameBoardId;
  paceId: GamePaceId;
  photoSkin?: PhotoSkinCanvasAppearance;
  worldCosmetics: WorldCosmeticState;
  controlScheme: ControlScheme;
  onExit: () => void;
  onRestart: () => void;
  onRunEnded: (summary: CaptainRunSummary) => CaptainDepthRunUpdate | undefined;
  onOpenCaptainLog?: () => void;
}

interface HudState {
  score: number;
  mass: number;
  length: number;
  rank: number;
  rankTotal: number;
  remaining: number;
  leaderboard: ReturnType<typeof getRankings>;
  position: Vec2;
  activeRelic?: ActiveSpecialist;
  currentTick: number;
  fixedStepSeconds: number;
  chargingStation?: ChargingStationPresentation;
}

interface ArenaLeaderboardProps {
  entries: ReturnType<typeof getRankings>;
  rank: number;
  rankTotal: number;
}

const ArenaLeaderboard = memo(function ArenaLeaderboard({
  entries,
  rank,
  rankTotal,
}: ArenaLeaderboardProps) {
  return (
    <aside className="leaderboard mobile-intel-leaderboard" aria-label="AI size leaderboard">
      <h2>TOP 10 · SIZE</h2>
      <ol>
        {entries.map((entry, index) => (
          <li
            key={entry.playerId}
            className={entry.playerId === PLAYER_ID ? "player" : ""}
            data-rank={index + 1}
          >
            <span className="name">
              {entry.name}
              {entry.playerId !== PLAYER_ID && <em className="ai-tag">AI</em>}
            </span>
            <span>{Math.round(entry.mass)}</span>
          </li>
        ))}
      </ol>
      <p className="leaderboard-rankline" data-testid="player-rank">
        <span>YOU</span>
        <strong>#{rank}</strong>
        <span>/ {rankTotal}</span>
      </p>
    </aside>
  );
});

interface ResultState {
  heading: string;
  cause: string;
  score: number;
  peakMass: number;
  kills: number;
  rank: number;
  replayContext: string;
  recording: LocalRunRecording;
  captainUpdate?: CaptainDepthRunUpdate;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  rewardPoints?: number;
}

interface ArenaRenderRuntime {
  state: GameState;
  camera: CameraMotionState;
  particles: Particle[];
  impactUntil: number;
  shakeUntil: number;
  boundaryStrike?: BoundaryGuardianStrike;
  reducedMotion: boolean;
  debugHitboxes: boolean;
  tutorialSparkId?: string;
  tutorialRetargetCount?: number;
  tutorialRetargetReason?: "removed" | "behind" | "too-far";
  tutorialTargetTrackingId?: string;
  tutorialTargetClosestDistance?: number;
}

interface ArenaRuntime extends ArenaRenderRuntime {
  providers: BotInputProviderMap;
  startTick: number;
  lastHudTick: number;
  lastLeaderboardTick: number;
  lastFrame: number;
  accumulatorSeconds: number;
  resultCommitted: boolean;
  runEnded: boolean;
  pickupCombo: number;
  lastPickupTick: number;
  preStepChestIds: Set<string>;
  recording: LocalRunDraft;
}

interface LocalReplayRuntime extends ArenaRenderRuntime {
  providers: BotInputProviderMap;
  recording: LocalRunRecording;
  nextInputIndex: number;
  startTick: number;
  endTick: number;
  lastFrame: number;
  accumulatorSeconds: number;
  completed: boolean;
  context: string;
  terminalContext: string;
}

type LocalReplayPhase = "preparing" | "playing" | "complete" | "failed";

interface LocalReplayUiState {
  phase: LocalReplayPhase;
  tick: number;
  startTick: number;
  endTick: number;
  position: Vec2;
  context: string;
  checksum?: string;
}

interface TouchGuide {
  pointerId: number;
  anchorX: number;
  anchorY: number;
  currentX: number;
  currentY: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export interface LocalRadarIntel {
  visiblePlayers: RadarPlayerMarker[];
  dangerBearings: SpyglassDangerBearing[];
}

/** Full-board population dots are the competitive-room contract. */
export function createLocalRadarIntel(
  state: Pick<GameState, "players" | "tick">,
  playerId: string,
  visibleRadius: number,
): LocalRadarIntel {
  const carrier = state.players[playerId];
  if (!carrier || !Number.isFinite(visibleRadius) || visibleRadius <= 0) {
    return { visiblePlayers: [], dangerBearings: [] };
  }
  const rivals = Object.values(state.players)
    .filter((player) => player.id !== playerId);
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
      state.tick,
      visibleRadius,
    ),
  };
}

function localRadarVisibleRadius(
  canvas: HTMLCanvasElement | null,
  mass: number,
  activeRelic: ActiveSpecialist | undefined,
  tick: number,
): number {
  const width = canvas?.clientWidth ?? 0;
  const height = canvas?.clientHeight ?? 0;
  return getArenaCameraVisibleRadius(
    width,
    height,
    mass,
    activeRelic,
    tick,
  );
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

function paletteFor(id: string) {
  return palettes[stableNumber(id) % palettes.length];
}

function foodColor(drop: DropState) {
  if (drop.specialist) return "#65ffe2";
  if (drop.originPlayerId) return paletteFor(drop.originPlayerId)[0];
  return foodColors[stableNumber(drop.id) % foodColors.length];
}

function nearestNeutralSpark(
  state: GameState,
  position: Vec2,
  direction?: Vec2,
  excludedId?: string,
) {
  return state.drops
    .filter((drop) =>
      drop.id !== excludedId &&
      drop.source === "arena" &&
      !drop.specialist &&
      drop.mass > 0,
    )
    .sort((first, second) => {
      const firstDistance = (first.position.x - position.x) ** 2 + (first.position.y - position.y) ** 2;
      const secondDistance = (second.position.x - position.x) ** 2 + (second.position.y - position.y) ** 2;
      const alignmentTier = (drop: DropState, distance: number) => {
        if (!direction || distance < 1e-6) return 2;
        const distanceRoot = Math.sqrt(distance);
        const dot = (
          (drop.position.x - position.x) * direction.x +
          (drop.position.y - position.y) * direction.y
        ) / distanceRoot;
        if (drop.id.startsWith("starter-turn-") && dot >= 0.65) return 0;
        if (dot >= 0.72) return 1;
        return dot >= 0 ? 2 : 3;
      };
      const firstScore = alignmentTier(first, firstDistance) * 1_000_000_000 + firstDistance;
      const secondScore = alignmentTier(second, secondDistance) * 1_000_000_000 + secondDistance;
      return firstScore - secondScore || first.id.localeCompare(second.id);
    })[0];
}

function tutorialTargetIssue(
  state: GameState,
  player: PlayerState,
  target: DropState | undefined,
): "removed" | "behind" | "too-far" | undefined {
  if (!target) return "removed";
  const deltaX = target.position.x - player.position.x;
  const deltaY = target.position.y - player.position.y;
  const distance = Math.hypot(deltaX, deltaY);
  const pickupDistance = getPlayerRadius(player, state.config) + target.radius + 8;
  if (distance <= pickupDistance) return undefined;
  if (distance > 760) return "too-far";
  const headingDot = (deltaX * player.direction.x + deltaY * player.direction.y) / distance;
  return headingDot < -0.12 ? "behind" : undefined;
}

function formatClock(seconds: number) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function getInitialHud(): HudState {
  return {
    score: 0,
    mass: DEFAULT_GAME_CONFIG.startMass,
    length: DEFAULT_GAME_CONFIG.startingBodySegments,
    rank: BOT_COUNT + 1,
    rankTotal: BOT_COUNT + 1,
    remaining: RUSH_SECONDS,
    leaderboard: [],
    position: { x: 0, y: 0 },
    activeRelic: undefined,
    currentTick: 0,
    fixedStepSeconds: DEFAULT_GAME_CONFIG.fixedStepSeconds,
    chargingStation: undefined,
  };
}

export function ArenaCanvas({
  playerName,
  mode,
  challenge,
  running,
  paused,
  session,
  boardId,
  paceId,
  photoSkin,
  worldCosmetics,
  controlScheme,
  onExit,
  onRestart,
  onRunEnded,
  onOpenCaptainLog,
}: ArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ArenaRuntime | null>(null);
  const replayRuntimeRef = useRef<LocalReplayRuntime | null>(null);
  const directionRef = useRef<Vec2>({ x: 1, y: 0 });
  const boostRef = useRef(false);
  const sprintStartedAtRef = useRef<number | undefined>(undefined);
  const sprintReleaseTimerRef = useRef<number | undefined>(undefined);
  const touchGuideRef = useRef<TouchGuide | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement>(null);
  const onRunEndedRef = useRef(onRunEnded);
  const photoSkinRef = useRef(photoSkin);
  photoSkinRef.current = photoSkin;
  const [hud, setHud] = useState<HudState>(getInitialHud);
  const [result, setResult] = useState<ResultState | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [touchGuide, setTouchGuide] = useState<TouchGuide | null>(null);
  const [actionCallout, setActionCallout] = useState<string | null>(null);
  const [localReplay, setLocalReplay] = useState<LocalReplayUiState | null>(null);
  const [mobileIntelPanel, setMobileIntelPanel] = useState<"none" | "map" | "scores">("none");
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const tutorial = useArenaTutorial(running && !paused && !result, `${session}:${mode}`);

  useEffect(() => {
    onRunEndedRef.current = onRunEnded;
  }, [onRunEnded]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

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

  useEffect(() => {
    setMobileIntelPanel("none");
  }, [session]);

  useEffect(() => {
    if (!result || localReplay) return;
    const frame = window.requestAnimationFrame(() => {
      restartButtonRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [localReplay, result]);

  useEffect(() => {
    if (result || !running) return;
    const frame = window.requestAnimationFrame(() => {
      if (document.querySelector('[aria-modal="true"]')) return;
      stageRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [result, running]);

  const ensureAudio = useCallback(() => {
    if (!running || paused) return;
    const AudioContextCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    audioRef.current ??= new AudioContextCtor();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
  }, [paused, running]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audio.state === "closed") return;
    if (paused && audio.state === "running") {
      void audio.suspend();
      return;
    }
    if (!paused && running && audio.state === "suspended") void audio.resume();
  }, [paused, running]);

  const playTone = useCallback((frequency: number, duration = 0.07, gainValue = 0.035) => {
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

  const recordMeaningfulSteer = useCallback((direction: Vec2) => {
    const runtime = runtimeRef.current;
    const player = runtime?.state.players[PLAYER_ID];
    if (!runtime || !player) return;
    if (!tutorial.meaningfulSteer(direction, player.direction)) return;
    const target = nearestNeutralSpark(runtime.state, player.position, direction);
    runtime.tutorialSparkId = target?.id;
    runtime.tutorialTargetTrackingId = target?.id;
    runtime.tutorialTargetClosestDistance = target
      ? Math.hypot(
        target.position.x - player.position.x,
        target.position.y - player.position.y,
      )
      : undefined;
  }, [tutorial.meaningfulSteer]);

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
  }, [tutorial.releasedSprint]);

  const pressSprint = useCallback(() => {
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
      sprintReleaseTimerRef.current = undefined;
    }
    if (boostRef.current) return;
    sprintStartedAtRef.current = performance.now();
    boostRef.current = true;
    setBoosting(true);
    tutorial.pressedSprint();
  }, [tutorial.pressedSprint]);

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

  useEffect(() => {
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
      sprintReleaseTimerRef.current = undefined;
    }
    sprintStartedAtRef.current = undefined;
    const seed = running
      ? challenge?.seed ?? `wormifi-${session}-${mode}`
      : "wormifi-living-title";
    const built = buildLocalArena(seed, playerName, mode, boardId, paceId);
    runtimeRef.current = {
      ...built,
      startTick: built.state.tick,
      lastHudTick: -1,
      lastLeaderboardTick: -1,
      lastFrame: performance.now(),
      accumulatorSeconds: 0,
      camera: createCameraMotionState(),
      particles: [],
      resultCommitted: false,
      runEnded: false,
      pickupCombo: 0,
      lastPickupTick: -10_000,
      preStepChestIds: new Set(),
      impactUntil: 0,
      shakeUntil: 0,
      boundaryStrike: undefined,
      reducedMotion,
      debugHitboxes: new URLSearchParams(window.location.search).get("hitboxes") === "1",
      tutorialSparkId: undefined,
      tutorialRetargetCount: 0,
      tutorialRetargetReason: undefined,
      tutorialTargetTrackingId: undefined,
      tutorialTargetClosestDistance: undefined,
      recording: { seed, mode, playerName: playerName || "Guest", boardId, paceId, inputs: [] },
    };
    replayRuntimeRef.current = null;
    directionRef.current = { x: 1, y: 0 };
    boostRef.current = false;
    touchGuideRef.current = null;
    setBoosting(false);
    setTouchGuide(null);
    setActionCallout(null);
    setResult(null);
    setLocalReplay(null);
    setHud(getInitialHud());
  }, [boardId, challenge, mode, paceId, playerName, running, session]);

  useEffect(() => () => {
    if (sprintReleaseTimerRef.current !== undefined) {
      window.clearTimeout(sprintReleaseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.reducedMotion = reducedMotion;
    if (replayRuntimeRef.current) replayRuntimeRef.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!running || paused || result) return;
      const keyDirections: Record<string, Vec2> = {
        ArrowUp: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const direction = keyDirections[event.key];
      if (direction) {
        event.preventDefault();
        directionRef.current = direction;
        recordMeaningfulSteer(direction);
        ensureAudio();
      }
      if (event.code === "Space" || event.key === "Shift") {
        event.preventDefault();
        pressSprint();
        ensureAudio();
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
  }, [ensureAudio, paused, pressSprint, recordMeaningfulSteer, releaseSprint, result, running]);

  useEffect(() => {
    let animationFrame = 0;
    let cancelled = false;

    const commitResult = (player: PlayerState, cause: string, heading = "CHAIN RELEASED") => {
      const runtime = runtimeRef.current;
      if (!runtime || runtime.resultCommitted || !running) return;
      runtime.resultCommitted = true;
      runtime.runEnded = true;
      const rank = getPlayerRank(runtime.state, PLAYER_ID, "score", true) ?? BOT_COUNT + 1;
      const score = calculateScore(player, runtime.state.config);
      const challengeBeaten = challenge?.target.metric === "score" && score > challenge.target.value;
      const recording = finalizeLocalRun(runtime.recording, runtime.state);
      const captainUpdate = onRunEndedRef.current({
        source: mode,
        score,
        kills: player.stats.kills,
        rank,
        peakMass: player.stats.peakMass,
      });
      setResult({
        heading: challengeBeaten ? "TARGET BEATEN" : heading,
        cause,
        score,
        peakMass: Math.round(player.stats.peakMass),
        kills: player.stats.kills,
        rank,
        replayContext: player.deathCause
          ? `DEATH · ${cause}`
          : `RUN FINISH · ${cause}`,
        recording,
        captainUpdate,
      });
      if (sprintReleaseTimerRef.current !== undefined) {
        window.clearTimeout(sprintReleaseTimerRef.current);
        sprintReleaseTimerRef.current = undefined;
      }
      sprintStartedAtRef.current = undefined;
      boostRef.current = false;
      setBoosting(false);
      playTone(125, 0.24, 0.08);
      if (!runtime.reducedMotion) navigator.vibrate?.([35, 25, 80]);
    };

    const handleEvents = (
      runtime: ArenaRuntime,
      events: readonly GameEvent[],
      collectedChestIds: ReadonlySet<string>,
    ) => {
      const player = runtime.state.players[PLAYER_ID];
      for (const event of events) {
        if (
          event.type === "dropCollected" &&
          event.playerId === PLAYER_ID &&
          event.mass > 0 &&
          player
        ) {
          tutorial.collectedSpark(event.dropId, runtime.tutorialSparkId ?? null);
          window.dispatchEvent(new Event("wormifi:treasure-collected"));
          runtime.pickupCombo = runtime.state.tick - runtime.lastPickupTick < 21
            ? Math.min(8, runtime.pickupCombo + 1)
            : 1;
          runtime.lastPickupTick = runtime.state.tick;
          const color = foodColors[runtime.pickupCombo % foodColors.length];
          const collectedPopCluster = collectedChestIds.has(event.dropId);
          if (!runtime.reducedMotion) {
            const particleCount = event.mass >= RARE_TREASURE_CHEST_MASS ? 9 : 5;
            for (let index = 0; index < particleCount; index += 1) {
              const angle = (index / particleCount) * Math.PI * 2 + runtime.state.tick * 0.17;
              runtime.particles.push({
                x: player.position.x,
                y: player.position.y,
                vx: Math.cos(angle) * (65 + index * 8),
                vy: Math.sin(angle) * (65 + index * 8),
                life: 0.4,
                maxLife: 0.4,
                radius: 4 + index * 0.4,
                color,
              });
            }
          }
          const rewardLife = runtime.reducedMotion ? 0.55 : 0.78;
          runtime.particles.push({
            x: player.position.x,
            y: player.position.y,
            vx: 0,
            vy: runtime.reducedMotion ? 0 : -44,
            life: rewardLife,
            maxLife: rewardLife,
            radius: collectedPopCluster ? 34 : 26,
            color: collectedPopCluster ? "#fff1a1" : "#eafffb",
            // dropCollected.mass is the final authoritative award, including
            // an active 2x, 3x, 4x, 5x, or rare 10x Treasure Multiplier.
            rewardPoints: treasurePointValue(event.mass),
          });
          if (runtime.pickupCombo <= 5 || runtime.pickupCombo === 8) {
            playTone(280 + runtime.pickupCombo * 55, 0.055, 0.022);
          }
          if (collectedPopCluster && runtime.pickupCombo !== 6 && runtime.pickupCombo !== 8) {
            if (!runtime.reducedMotion) navigator.vibrate?.(12);
            setActionCallout("TREASURE CHEST · JACKPOT");
            window.setTimeout(() => setActionCallout(null), 750);
          }
          if (runtime.pickupCombo === 6 || runtime.pickupCombo === 8) {
            if (!runtime.reducedMotion) navigator.vibrate?.(8);
            setActionCallout(`${collectedPopCluster ? "CHEST · " : ""}TREASURE STREAK ×${runtime.pickupCombo}`);
            window.setTimeout(() => setActionCallout(null), 650);
          }
        }

        if (event.type === "massShed" && event.playerId === PLAYER_ID) {
          tutorial.spentSprint();
        }

        if (event.type === "specialistActivated" && event.playerId === PLAYER_ID) {
          tutorial.sawCollector();
          const relic = resolveRelicPresentation(event.relicKind);
          const effectText = getRelicEffectText(relic, event.relicTier);
          setActionCallout(`${relic.label.toUpperCase()} ON · ${effectText}`);
          window.setTimeout(() => setActionCallout(null), 900);
          playTone(520, 0.11, 0.035);
          window.setTimeout(() => playTone(760, 0.14, 0.03), 80);
          if (!runtime.reducedMotion) navigator.vibrate?.([12, 24, 22]);
        }

        if (event.type === "specialistExpired" && event.playerId === PLAYER_ID) {
          const relic = resolveRelicPresentation(event.relicKind);
          setActionCallout(`${relic.label.toUpperCase()} SPENT · FIND ANOTHER RELIC`);
          window.setTimeout(() => setActionCallout(null), 800);
        }

        if (event.type === "chargingCompleted" && event.playerId === PLAYER_ID) {
          const station = runtime.state.board.chargingStations.find(
            (candidate) => candidate.id === event.stationId,
          );
          setActionCallout(
            station?.kind === "harbor"
              ? `${station.name.toUpperCase()} PAD CASHED · +${Number(event.massAwarded.toFixed(1))} SIZE`
              : `${station?.name.toUpperCase() ?? "CAPSTAN"} CHARGED · +${Number(event.massAwarded.toFixed(1))} SIZE`,
          );
          window.setTimeout(() => setActionCallout(null), 2_000);
          playTone(470, 0.1, 0.04);
          window.setTimeout(() => playTone(720, 0.16, 0.035), 85);
          if (!runtime.reducedMotion) navigator.vibrate?.([10, 18, 28]);
        }

        if (event.type === "playerDied") {
          const victim = runtime.state.players[event.playerId];
          if (event.cause === "boundary" && victim) {
            const strikeStartedAt = performance.now();
            runtime.boundaryStrike = {
              position: { ...victim.position },
              startedAt: strikeStartedAt,
              until: strikeStartedAt + 760,
            };
          }
          if (victim && !runtime.reducedMotion) {
            appendDeathReleaseParticles(
              runtime.particles,
              victim,
              paletteFor(victim.id),
              runtime.state.tick,
            );
          }
          if (event.killerId === PLAYER_ID && event.playerId !== PLAYER_ID) {
            if (!runtime.reducedMotion) runtime.shakeUntil = performance.now() + 180;
            setActionCallout(`CHAIN CUT · ${victim?.name ?? "RIVAL"} RELEASED`);
            window.setTimeout(() => setActionCallout(null), 1_050);
            playTone(510, 0.11, 0.055);
            if (!runtime.reducedMotion) navigator.vibrate?.([12, 18, 22]);
          }
          if (event.playerId === PLAYER_ID && victim) {
            runtime.runEnded = true;
            if (!runtime.reducedMotion) {
              runtime.impactUntil = performance.now() + 160;
              runtime.shakeUntil = performance.now() + 220;
            }
            const killer = event.killerId ? runtime.state.players[event.killerId] : undefined;
            const cause = event.cause === "boundary"
              ? "The arena edge caught your Core."
              : `You hit ${killer?.name ?? "a rival"}’s living chain.`;
            window.setTimeout(() => commitResult(victim, cause), 220);
          }
        }
      }
    };

    const frame = (now: number) => {
      if (cancelled) return;
      const runtime = runtimeRef.current;
      const canvas = canvasRef.current;
      if (!runtime || !canvas) {
        animationFrame = requestAnimationFrame(frame);
        return;
      }

      const replay = replayRuntimeRef.current;
      if (paused) {
        runtime.lastFrame = now;
        runtime.accumulatorSeconds = 0;
        if (replay) {
          replay.lastFrame = now;
          replay.accumulatorSeconds = 0;
        }
        renderArena(canvas, replay ?? runtime, now, photoSkinRef.current, worldCosmetics);
        return;
      }

      if (replay) {
        const replayDelta = clamp((now - replay.lastFrame) / 1_000, 0, 0.06);
        replay.lastFrame = now;

        if (replay.nextInputIndex < replay.startTick) {
          const ready = advanceLocalReplayPreparation(replay, 12);
          const replayPlayer = replay.state.players[PLAYER_ID];
          setLocalReplay({
            phase: ready ? "playing" : "preparing",
            tick: replay.state.tick,
            startTick: replay.startTick,
            endTick: replay.endTick,
            position: replayPlayer ? { ...replayPlayer.position } : { x: 0, y: 0 },
            context: ready
              ? replay.context
              : `REBUILDING EXACT SEED + BOTS · ${replay.terminalContext}`,
          });
          if (ready) {
            replay.accumulatorSeconds = 0;
            replay.lastFrame = now;
            const focus = replay.state.players[PLAYER_ID]?.position;
            if (focus) snapCameraMotion(replay.camera, focus, now);
          }
        } else if (!replay.completed) {
          replay.accumulatorSeconds += replayDelta;
          const fixedStep = replay.state.config.fixedStepSeconds;
          while (
            replay.accumulatorSeconds + 1e-9 >= fixedStep &&
            replay.nextInputIndex < replay.recording.inputs.length
          ) {
            const input = replay.recording.inputs[replay.nextInputIndex];
            const replayStep = stepLocalArena(replay, input);
            replay.nextInputIndex += 1;
            replay.accumulatorSeconds -= fixedStep;
            if (Math.abs(replay.accumulatorSeconds) < 1e-9) {
              replay.accumulatorSeconds = 0;
            }
            for (const event of replayStep.events) {
              if (event.type !== "playerDied") continue;
              if (event.killerId === PLAYER_ID && event.playerId !== PLAYER_ID) {
                const victim = replay.state.players[event.playerId];
                replay.context = `CHAIN CUT · ${victim?.name ?? "RIVAL"} RELEASED`;
                if (!replay.reducedMotion) replay.shakeUntil = now + 180;
              }
              if (event.playerId === PLAYER_ID) {
                replay.context = replay.terminalContext;
                if (!replay.reducedMotion) {
                  replay.impactUntil = now + 280;
                  replay.shakeUntil = now + 440;
                }
              }
            }
          }

          if (replay.nextInputIndex >= replay.recording.inputs.length) {
            replay.completed = true;
            const checksum = checksumLocalArena(replay.state);
            const verified = checksum === replay.recording.terminalChecksum;
            replay.context = verified
              ? `CHECKSUM VERIFIED · ${replay.terminalContext}`
              : "CHECKSUM MISMATCH · REPLAY STOPPED";
            const replayPlayer = replay.state.players[PLAYER_ID];
            setLocalReplay({
              phase: verified ? "complete" : "failed",
              tick: replay.state.tick,
              startTick: replay.startTick,
              endTick: replay.endTick,
              position: replayPlayer ? { ...replayPlayer.position } : { x: 0, y: 0 },
              context: replay.context,
              checksum,
            });
          } else {
            const replayPlayer = replay.state.players[PLAYER_ID];
            setLocalReplay({
              phase: "playing",
              tick: replay.state.tick,
              startTick: replay.startTick,
              endTick: replay.endTick,
              position: replayPlayer ? { ...replayPlayer.position } : { x: 0, y: 0 },
              context: replay.context,
            });
          }
        }

        updateParticles(replay.particles, replayDelta);
        renderArena(canvas, replay, now, photoSkinRef.current, worldCosmetics);
        animationFrame = requestAnimationFrame(frame);
        return;
      }

      // The finished frame is already the exact visual state we want behind
      // the results dialog. Repainting that large canvas under a translucent
      // backdrop needlessly asks the browser to composite the same scene on
      // every display frame. Keep the scheduler alive so replay/restart state
      // can take over immediately, but leave the completed frame frozen.
      if (runtime.resultCommitted) {
        runtime.lastFrame = now;
        runtime.accumulatorSeconds = 0;
        animationFrame = requestAnimationFrame(frame);
        return;
      }

      const deltaSeconds = clamp((now - runtime.lastFrame) / 1_000, 0, 0.06);
      runtime.lastFrame = now;
      if (!runtime.runEnded) {
        const waitingForFirstTurn = running && tutorial.stageRef.current === "steer";
        const pausedForReducedPreview = !running && runtime.reducedMotion;
        if (waitingForFirstTurn || pausedForReducedPreview) runtime.accumulatorSeconds = 0;
        else runtime.accumulatorSeconds += deltaSeconds;
        const fixedStep = runtime.state.config.fixedStepSeconds;
        while (
          !waitingForFirstTurn &&
          !pausedForReducedPreview &&
          runtime.accumulatorSeconds + 1e-9 >= fixedStep &&
          !runtime.runEnded
        ) {
          const player = runtime.state.players[PLAYER_ID];
          if (!player?.alive) {
            runtime.runEnded = true;
            break;
          }
          if (!running) {
            const angle = runtime.state.tick * 0.003 +
              Math.sin(runtime.state.tick * 0.0017) * 0.8;
            directionRef.current = { x: Math.cos(angle), y: Math.sin(angle) };
          }
          const input = sanitizeLocalInput(
            runtime.state.tick + 1,
            directionRef.current,
            running && boostRef.current,
            player.direction,
          );
          if (running) runtime.recording.inputs.push(input);
          const collectedChestIds = runtime.preStepChestIds;
          collectedChestIds.clear();
          for (const drop of runtime.state.drops) {
            if (drop.source === "arena" && drop.mass >= RARE_TREASURE_CHEST_MASS) {
              collectedChestIds.add(drop.id);
            }
          }
          const step = stepLocalArena(runtime, input);
          runtime.accumulatorSeconds -= fixedStep;
          if (Math.abs(runtime.accumulatorSeconds) < 1e-9) {
            runtime.accumulatorSeconds = 0;
          }
          handleEvents(runtime, step.events, collectedChestIds);
          if (tutorial.stageRef.current === "spark") {
            const target = runtime.state.drops.find((drop) => drop.id === runtime.tutorialSparkId);
            let issue = tutorialTargetIssue(runtime.state, player, target);
            if (target) {
              const distance = Math.hypot(
                target.position.x - player.position.x,
                target.position.y - player.position.y,
              );
              if (runtime.tutorialTargetTrackingId !== target.id) {
                runtime.tutorialTargetTrackingId = target.id;
                runtime.tutorialTargetClosestDistance = distance;
              } else {
                const closest = Math.min(
                  runtime.tutorialTargetClosestDistance ?? distance,
                  distance,
                );
                runtime.tutorialTargetClosestDistance = closest;
                // Turn arcs can pass beside a Spark while it remains only
                // slightly lateral. Growing distance after closest approach is
                // the second, geometry-independent signal that it was missed.
                if (!issue && distance > closest + 48) issue = "behind";
              }
            }
            if (issue) {
              const previousId = runtime.tutorialSparkId;
              const nextTarget = nearestNeutralSpark(
                runtime.state,
                player.position,
                player.direction,
                previousId,
              );
              runtime.tutorialSparkId = nextTarget?.id;
              runtime.tutorialTargetTrackingId = nextTarget?.id;
              runtime.tutorialTargetClosestDistance = nextTarget
                ? Math.hypot(
                  nextTarget.position.x - player.position.x,
                  nextTarget.position.y - player.position.y,
                )
                : undefined;
              if (previousId && nextTarget?.id !== previousId) {
                runtime.tutorialRetargetCount = (runtime.tutorialRetargetCount ?? 0) + 1;
                runtime.tutorialRetargetReason = issue;
              }
            }
          }
        }
      }

      const currentPlayer = runtime.state.players[PLAYER_ID];
      const elapsed = (runtime.state.tick - runtime.startTick) * runtime.state.config.fixedStepSeconds;
      const remaining = mode === "rush" ? Math.max(0, RUSH_SECONDS - elapsed) : Number.POSITIVE_INFINITY;
      if (running && mode === "rush" && remaining <= 0 && currentPlayer && !runtime.resultCommitted) {
        commitResult(currentPlayer, "The 90-second rush is complete.", "RUSH COMPLETE");
      }

      updateParticles(runtime.particles, deltaSeconds);
      renderArena(canvas, runtime, now, photoSkinRef.current, worldCosmetics);

      if (
        runtime.state.tick % 5 === 0 &&
        runtime.state.tick !== runtime.lastHudTick &&
        currentPlayer
      ) {
        runtime.lastHudTick = runtime.state.tick;
        const chargingViews = runtime.state.board.chargingStations.map((station) => ({
          station,
          state: runtime.state.chargingStations[station.id],
        }));
        const refreshLeaderboard =
          runtime.state.tick % 12 === 0 &&
          runtime.state.tick !== runtime.lastLeaderboardTick;
        if (refreshLeaderboard) runtime.lastLeaderboardTick = runtime.state.tick;
        setHud((current) => ({
          score: calculateScore(currentPlayer, runtime.state.config),
          mass: Math.round(currentPlayer.mass),
          length: currentPlayer.body.length,
          rank: getPlayerRank(runtime.state, PLAYER_ID) ?? BOT_COUNT + 1,
          rankTotal: Object.values(runtime.state.players).filter((player) => player.alive).length,
          remaining,
          leaderboard: refreshLeaderboard
            ? getRankings(runtime.state).slice(0, 10)
            : current.leaderboard,
          position: { ...currentPlayer.position },
          activeRelic: currentPlayer.specialist
            ? { ...currentPlayer.specialist }
            : undefined,
          currentTick: runtime.state.tick,
          fixedStepSeconds: runtime.state.config.fixedStepSeconds,
          chargingStation: selectChargingStationPresentation(
            chargingViews,
            runtime.state.config.fixedStepSeconds,
            PLAYER_ID,
            currentPlayer.position,
          ),
        }));
      }

      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [
    challenge,
    mode,
    paused,
    playTone,
    running,
    session,
    tutorial.collectedSpark,
    tutorial.sawCollector,
    tutorial.spentSprint,
    tutorial.stageRef,
    worldCosmetics,
  ]);

  const setPointerDirection = (clientX: number, clientY: number) => {
    if (paused) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const runtime = runtimeRef.current;
    const player = runtime?.state.players[PLAYER_ID];
    const direction = pointerSteeringDirection(
      { x: clientX - rect.left, y: clientY - rect.top },
      rect,
      runtime?.camera.position ?? { x: 0, y: 0 },
      player?.alive ? player.position : undefined,
      runtime && player
        ? getArenaCameraZoom(
          rect.width,
          rect.height,
          player.mass,
          player.specialist,
          runtime.state.tick,
        )
        : 1,
      10,
    );
    if (!direction) return;
    directionRef.current = direction;
    if (running) recordMeaningfulSteer(direction);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!running || paused || result) return;
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
    if (!running || paused || result) return;
    if ((event.target as HTMLElement).closest("button")) return;
    ensureAudio();
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
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "mouse") {
      pressSprint();
    }
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

  const startLocalReplay = () => {
    if (!result) return;
    try {
      const prepared = createLocalReplayPreparation(result.recording, 6);
      const replayPlayer = prepared.state.players[PLAYER_ID];
      const replay: LocalReplayRuntime = {
        ...prepared,
        lastFrame: performance.now(),
        accumulatorSeconds: 0,
        completed: false,
        camera: replayPlayer
          ? createCameraMotionState(replayPlayer.position, performance.now())
          : createCameraMotionState(),
        particles: [],
        impactUntil: 0,
        shakeUntil: 0,
        reducedMotion,
        debugHitboxes: false,
        context: `FINAL MOMENTS · ${result.replayContext}`,
        terminalContext: result.replayContext,
      };
      replayRuntimeRef.current = replay;
      setLocalReplay({
        phase: prepared.startTick > 0 ? "preparing" : "playing",
        tick: prepared.state.tick,
        startTick: prepared.startTick,
        endTick: prepared.endTick,
        position: replayPlayer ? { ...replayPlayer.position } : { x: 0, y: 0 },
        context: prepared.startTick > 0
          ? `REBUILDING EXACT SEED + BOTS · ${result.replayContext}`
          : `FINAL MOMENTS · ${result.replayContext}`,
      });
      setActionCallout(null);
    } catch {
      replayRuntimeRef.current = null;
      const originalPlayer = runtimeRef.current?.state.players[PLAYER_ID];
      setLocalReplay({
        phase: "failed",
        tick: result.recording.terminalTick,
        startTick: result.recording.terminalTick,
        endTick: result.recording.terminalTick,
        position: originalPlayer ? { ...originalPlayer.position } : { x: 0, y: 0 },
        context: "REPLAY GAP · RECORDED RUN COULD NOT BE REBUILT",
      });
    }
  };

  const returnToResults = () => {
    replayRuntimeRef.current = null;
    if (runtimeRef.current) runtimeRef.current.lastFrame = performance.now();
    setLocalReplay(null);
  };

  const buildChallengeShare = () => {
    const safeRival = (playerName || "Guest")
      .trim()
      .replace(/[^A-Za-z0-9._-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 40) || "Guest";
    const token = serializeChallengePayload({
      seed: runtimeRef.current?.state.initialSeed ?? `wormifi-${session}-${mode}`,
      mode: mode === "endless" ? "live" : mode,
      paceId,
      target: {
        metric: "score",
        value: result?.score ?? hud.score,
        playerId: safeRival,
      },
      playerLook: {
        coreId: "living-core-v1",
        followerId: "crew-mix-v1",
        trailId: "neon-story-v1",
        paletteId: `palette-${stableNumber(PLAYER_ID) % palettes.length}`,
      },
    });
    const url = `${window.location.origin}/?c=${encodeURIComponent(token)}`;
    return {
      title: "Beat my Wormifi run",
      text: `I scored ${result?.score ?? hud.score} in Wormifi. Can your living chain beat mine?`,
      url,
    };
  };

  const createHighlightImage = async (): Promise<File | undefined> => {
    const source = canvasRef.current;
    if (!source || source.width <= 0 || source.height <= 0) return undefined;

    const output = document.createElement("canvas");
    output.width = 1_080;
    output.height = 1_080;
    const context = output.getContext("2d");
    if (!context) return undefined;

    const scale = Math.max(output.width / source.width, output.height / source.height);
    const drawWidth = source.width * scale;
    const drawHeight = source.height * scale;
    context.drawImage(
      source,
      (output.width - drawWidth) / 2,
      (output.height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    const shade = context.createLinearGradient(0, 560, 0, output.height);
    shade.addColorStop(0, "rgba(2, 10, 26, 0)");
    shade.addColorStop(0.56, "rgba(2, 10, 26, .86)");
    shade.addColorStop(1, "rgba(2, 10, 26, .98)");
    context.fillStyle = shade;
    context.fillRect(0, 0, output.width, output.height);

    context.textAlign = "center";
    context.fillStyle = "#74f5df";
    context.font = "900 74px Inter, system-ui, sans-serif";
    context.fillText("WORMIFI", output.width / 2, 790);
    context.fillStyle = "#ffffff";
    context.font = "900 112px Inter, system-ui, sans-serif";
    context.fillText((result?.score ?? hud.score).toLocaleString(), output.width / 2, 910);
    context.fillStyle = "#ffd66f";
    context.font = "800 34px Inter, system-ui, sans-serif";
    context.fillText("SCORE · CAN YOU BEAT THIS RUN?", output.width / 2, 972);
    context.fillStyle = "rgba(225, 247, 255, .8)";
    context.font = "700 25px Inter, system-ui, sans-serif";
    context.fillText("WORMIFI.COM", output.width / 2, 1023);

    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
    return blob
      ? new File([blob], "wormifi-highlight.png", { type: "image/png" })
      : undefined;
  };

  const shareChallenge = async () => {
    const shareData: ShareData = buildChallengeShare();
    try {
      let highlight: File | undefined;
      try {
        highlight = await createHighlightImage();
      } catch {
        // A private imported skin can make a browser decline canvas export.
        // The playable rivalry link must still remain shareable.
      }
      if (
        highlight &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [highlight] })
      ) {
        shareData.files = [highlight];
      }
      if (navigator.share) {
        await navigator.share(shareData);
        setToast(shareData.files ? "Highlight ready to share" : "Challenge ready to share");
        window.setTimeout(() => setToast(null), 1_800);
      }
      else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setToast("Challenge copied");
        window.setTimeout(() => setToast(null), 1_800);
      }
    } catch {
      // The native share sheet can be dismissed intentionally; no error UI is needed.
    }
  };

  const resultShare = result ? buildChallengeShare() : undefined;

  const tutorialSpark = runtimeRef.current?.state.drops.find(
    (drop) => drop.id === runtimeRef.current?.tutorialSparkId,
  );
  const radarRuntime = replayRuntimeRef.current ?? runtimeRef.current;
  const radarPlayer = radarRuntime?.state.players[PLAYER_ID];
  const radarLandmarks: RadarLandmark[] = radarRuntime
    ? radarRuntime.state.drops
      .filter((drop) => drop.specialist === "collector")
      .map((drop) => ({
        id: drop.id,
        kind: "collector" as const,
        position: drop.position,
      }))
    : [];
  const radarIntel = radarRuntime && radarPlayer
    ? createLocalRadarIntel(
        radarRuntime.state,
        PLAYER_ID,
        localRadarVisibleRadius(
          canvasRef.current,
          radarPlayer.mass,
          radarPlayer.specialist,
          radarRuntime.state.tick,
        ),
      )
    : { visiblePlayers: [], dangerBearings: [] };
  const radarStations: RadarStation[] = radarRuntime
    ? radarRuntime.state.board.chargingStations.map((station) => {
        const state = radarRuntime.state.chargingStations[station.id];
        return {
          id: station.id,
          position: station.position,
          active: state?.phase === "charging" || state?.phase === "interrupted",
        };
      })
    : [];
  const relicStatus = createRelicStatusModel(
    hud.activeRelic,
    hud.currentTick,
    hud.fixedStepSeconds,
  );
  const activePace = getGamePaceProfile(paceId);
  const sprintMultiplierLabel = `${(activePace.boostSpeed / activePace.baseSpeed).toFixed(1)}×`;
  const turboPlayer = runtimeRef.current?.state.players[PLAYER_ID] ?? { mass: hud.mass };
  const turboConfig = runtimeRef.current?.state.config ?? DEFAULT_GAME_CONFIG;
  const stormBatteryActive = relicStatus?.presentation.relicKind === "storm-battery";
  const turboReserveRatio = stormBatteryActive
    ? 1
    : getPlayerTurboReserveRatio(turboPlayer, turboConfig);
  const turboSecondsRemaining = Math.max(
    getPlayerTurboSecondsRemaining(turboPlayer, turboConfig),
    stormBatteryActive ? relicStatus.remainingSeconds : 0,
  );
  const turboCostLabel = stormBatteryActive
    ? "costs no size while Twin Turbo Lightning is active"
    : `costs ${SPRINT_SIZE_COST_PER_SECOND} size per second`;

  return (
    <div
      ref={stageRef}
      className={`arena-stage controls-${controlScheme}`}
      data-testid="arena-canvas"
      role="region"
      aria-label={running ? "Active Wormifi pirate sea-serpent arena" : "Wormifi pirate sea-serpent arena preview"}
      aria-describedby={running ? "arena-keyboard-help" : undefined}
      tabIndex={running ? 0 : -1}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-control-scheme={controlScheme}
      data-board-id={boardId}
      data-pace-id={paceId}
      data-theme-id={photoSkin?.renderPlan.theme.id ?? ""}
      data-pickup-theme-id={worldCosmetics.pickupThemeId}
      data-arena-visual-theme-id={worldCosmetics.arenaThemeId}
      data-boundary-moat-id={worldCosmetics.arenaThemeId}
      data-boundary-guardian-label={getBoundaryGuardianSpec(worldCosmetics.arenaThemeId).label}
      data-local-photo-skin={photoSkin?.renderPlan.localPhotosEnabled ? "true" : "false"}
      data-local-photo-images={photoSkin?.decodedImages.size ?? 0}
      data-platform-paused={paused ? "true" : "false"}
      data-sensory-motion={reducedMotion ? "essential-only" : "full"}
      data-player-x={Math.round(hud.position.x)}
      data-player-y={Math.round(hud.position.y)}
      data-player-mass={hud.mass}
      data-turbo-reserve={turboReserveRatio.toFixed(3)}
      data-turbo-seconds={turboSecondsRemaining.toFixed(2)}
      data-player-length={hud.length}
      data-mobile-intel={mobileIntelPanel}
      data-boosting={boosting ? "true" : "false"}
      data-relic-kind={relicStatus?.presentation.relicKind ?? ""}
      data-relic-seconds={relicStatus?.remainingSeconds.toFixed(1) ?? "0.0"}
      data-collector-seconds={
        relicStatus?.presentation.relicKind === "loot-compass"
          ? relicStatus.remainingSeconds.toFixed(1)
          : "0.0"
      }
      data-charging-station-id={hud.chargingStation?.stationId ?? ""}
      data-charging-station-phase={hud.chargingStation?.phase ?? "none"}
      data-charging-station-progress={hud.chargingStation?.progressRatio ?? 0}
      data-tutorial-stage={tutorial.stage}
      data-tutorial-target-id={tutorialSpark?.id ?? ""}
      data-tutorial-target-x={tutorialSpark?.position.x ?? ""}
      data-tutorial-target-y={tutorialSpark?.position.y ?? ""}
      data-tutorial-sprint-spent={tutorial.sprintSpent ? "true" : "false"}
      data-tutorial-retarget-count={runtimeRef.current?.tutorialRetargetCount ?? 0}
      data-tutorial-retarget-reason={runtimeRef.current?.tutorialRetargetReason ?? ""}
      data-replay-state={localReplay?.phase ?? "off"}
      data-replay-tick={localReplay?.tick ?? ""}
      data-replay-player-x={localReplay ? Math.round(localReplay.position.x) : ""}
      data-replay-player-y={localReplay ? Math.round(localReplay.position.y) : ""}
      data-replay-checksum={localReplay?.checksum ?? ""}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      {running && (
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
            aria-label={`Map and standings. Rank ${hud.rank} of ${hud.rankTotal}, score ${hud.score}, size ${hud.mass}.`}
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
      )}
      {running && radarRuntime && radarPlayer && (
        <PirateRadar
          scopeLabel={mode === "practice" ? "PRACTICE" : challenge ? "RIVALRY" : "SOLO"}
          arenaRadius={radarRuntime.state.config.arenaRadius}
          position={radarPlayer.position}
          direction={radarPlayer.direction}
          alive={radarPlayer.alive}
          landmarks={radarLandmarks}
          otherPlayers={radarIntel.visiblePlayers}
          stations={radarStations}
          dangerBearings={radarIntel.dangerBearings}
          downLabel={localReplay ? "REPLAY · LAST POSITION" : result ? "RUN ENDED" : "CHAIN RELEASED"}
          competition={{
            rank: hud.rank,
            rankTotal: Object.values(radarRuntime.state.players).filter((player) => player.alive).length,
            score: hud.score,
            size: hud.mass,
            humans: Object.values(radarRuntime.state.players).filter((player) => player.kind === "human").length,
            ai: Object.values(radarRuntime.state.players).filter((player) => player.kind === "bot").length,
            testIdPrefix: "hud",
          }}
        />
      )}
      {running && !localReplay && (
        <>
          <span className="sr-only" data-testid="player-chain">Player living chain is active</span>
          <p className="sr-only" id="arena-keyboard-help">
            Use Arrow keys or W A S D to steer. Hold Space or Shift to sprint.
            Press Tab to reach the Exit and Sprint controls.
          </p>
          <div className="game-hud">
            {mode === "rush" && (
              <div className="hud-top hud-top--clock-only">
                <div
                  className={`rush-clock ${hud.remaining <= 10 ? "urgent" : ""}`}
                  role="timer"
                  aria-label={`${Math.ceil(hud.remaining)} seconds remaining`}
                >
                  {formatClock(hud.remaining)}
                </div>
              </div>
            )}

            <ArenaLeaderboard
              entries={hud.leaderboard}
              rank={hud.rank}
              rankTotal={hud.rankTotal}
            />

            <RelicStatus
              active={hud.activeRelic}
              currentTick={hud.currentTick}
              fixedStepSeconds={hud.fixedStepSeconds}
              reducedMotion={reducedMotion}
              className="specialist-status active"
              testId="relic-status"
            />

            {hud.chargingStation && (
              <ChargingStationStatus
                status={hud.chargingStation}
                testId="charging-station-status"
              />
            )}

            <ArenaTutorial stage={tutorial.stage} size={hud.mass} controlScheme={controlScheme} />

            {challenge && (
              <div className="challenge-target" data-testid="challenge-target">
                RIVALRY TARGET <strong>{challenge.target.value.toLocaleString()}</strong>
              </div>
            )}

            <div className="mode-disclosure">
              {mode === "practice" ? "PRACTICE · LABELED BOTS" : "PREVIEW ARENA · AI RIVALS DISCLOSED"}
            </div>
          </div>

          {touchGuide && (
            <div
              className="touch-guide"
              data-testid="touch-guide"
              style={{ left: touchGuide.anchorX, top: touchGuide.anchorY }}
            >
              <span
                style={{
                  transform: touchKnobTransform(touchGuide),
                }}
              />
            </div>
          )}
          {!touchGuide && controlScheme !== "drag-anywhere" && (
            <div
              className={`touch-guide touch-guide-idle ${controlScheme}`}
              data-testid="fixed-touch-guide"
              aria-hidden="true"
            >
              <span />
            </div>
          )}

          <button className="exit-button" data-testid="exit-button" aria-label="Exit to Wormifi menu" onClick={onExit}>×</button>
          <button
            className={`boost-control ${boosting ? "active" : ""}`}
            data-testid="boost-control"
            disabled={paused || hud.mass <= DEFAULT_GAME_CONFIG.minimumBoostMass || Boolean(result)}
            onPointerDown={(event) => {
              event.stopPropagation();
              ensureAudio();
              pressSprint();
              if (!reducedMotion) navigator.vibrate?.(8);
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              releaseSprint();
            }}
            onPointerCancel={releaseSprint}
            aria-label={`Turbo sprint — ${sprintMultiplierLabel} speed, ${turboCostLabel}, ${turboSecondsRemaining.toFixed(1)} seconds available`}
          >
            <span aria-hidden="true">⚡</span>
            <small aria-hidden="true">{sprintMultiplierLabel}</small>
          </button>
        </>
      )}

      {result && !localReplay && (
        <div className="results-backdrop">
          <section
            className="results-panel"
            data-testid="results-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-heading"
            aria-describedby="result-cause"
          >
            <span className="results-kicker">RIVALRY LINK READY</span>
            <h2 id="result-heading">{result.heading}</h2>
            <p className="death-cause" id="result-cause">{result.cause}</p>
            <dl className="result-stats">
              <div><dt>SCORE</dt><dd>{result.score.toLocaleString()}</dd></div>
              <div><dt>PEAK SIZE</dt><dd>{result.peakMass}</dd></div>
              <div><dt>SCORE RANK</dt><dd>#{result.rank}</dd></div>
              <div><dt>CHAIN CUTS</dt><dd>{result.kills}</dd></div>
            </dl>
            {result.captainUpdate && (
              <aside className="captain-depth-update" data-testid="captain-depth-update">
                <header>
                  <span aria-hidden="true">✦</span>
                  <div>
                    <b>CAPTAIN&apos;S LOG UPDATED</b>
                    <small>{result.captainUpdate.verifiedXpPending
                      ? "VERIFIED LIVE XP SYNCING"
                      : result.captainUpdate.xpAwarded > 0
                        ? `+${result.captainUpdate.xpAwarded} XP · LEVEL ${result.captainUpdate.level}${result.captainUpdate.leveledUp ? " REACHED" : ""}`
                        : `LEVEL ${result.captainUpdate.level} · COMPLETE A STRONGER RUN FOR XP`}</small>
                  </div>
                </header>
                {(result.captainUpdate.newlyEarnedMasteries.length > 0 || result.captainUpdate.newlyCompletedOrders.length > 0) && (
                  <div className="captain-depth-update__earned">
                    {result.captainUpdate.newlyEarnedMasteries.map((mastery) => (
                      <span key={`mastery-${mastery}`}>★ {mastery} MEDAL</span>
                    ))}
                    {result.captainUpdate.newlyCompletedOrders.map((order) => (
                      <span key={`order-${order}`}>✓ {order} CLEARED</span>
                    ))}
                  </div>
                )}
                {result.captainUpdate.nextOrder && (
                  <p>NEXT ORDER · <strong>{result.captainUpdate.nextOrder}</strong></p>
                )}
              </aside>
            )}
            {resultShare && (
              <aside className="result-share-card" data-testid="result-share-highlight">
                <div className="result-share-heading">
                  <span className="result-highlight-mark" aria-hidden="true"><i /><i /><i /></span>
                  <span>
                    <b>SHARE THIS RUN</b>
                    <small>FINAL FRAME + PLAYABLE CHALLENGE LINK</small>
                  </span>
                </div>
                <nav className="result-social-links" aria-label="Share result on social media">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(resultShare.text)}&url=${encodeURIComponent(resultShare.url)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Share result on X"
                  >𝕏</a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resultShare.url)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Share result on Facebook"
                  >f</a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${resultShare.text} ${resultShare.url}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Share result on WhatsApp"
                  >◉</a>
                  <button
                    className="share-button"
                    aria-label="Share challenge highlight"
                    onClick={() => void shareChallenge()}
                  >
                    <b>↗ SHARE HIGHLIGHT</b>
                    <small>IMAGE + SCORE + RIVALRY LINK</small>
                  </button>
                </nav>
              </aside>
            )}
            <div className="result-actions">
              <button
                className="replay-button"
                data-testid="watch-local-replay"
                onClick={startLocalReplay}
              >
                <span>WATCH FINAL 6S</span>
                <small>LOCAL REPLAY · RECORDED INPUTS</small>
              </button>
              <button
                ref={restartButtonRef}
                className="restart-button"
                data-testid="restart-button"
                onClick={onRestart}
              >
                PLAY AGAIN
              </button>
              {onOpenCaptainLog && (
                <button
                  className="captain-log-button"
                  data-testid="view-captain-log"
                  onClick={onOpenCaptainLog}
                >
                  VIEW CAPTAIN&apos;S LOG
                </button>
              )}
              <button className="menu-button" onClick={onExit}>CHANGE MODE</button>
            </div>
          </section>
        </div>
      )}

      {localReplay && (
        <section
          className={`local-replay-panel ${localReplay.phase}`}
          data-testid="local-replay-panel"
          data-phase={localReplay.phase}
          aria-live="polite"
        >
          <span className="local-replay-kicker">LOCAL REPLAY · NO LIVE PLAYERS</span>
          <strong>
            {localReplay.phase === "preparing"
              ? "PREPARING LOCAL REPLAY"
              : localReplay.phase === "playing"
                ? "PLAYING FINAL 6 SECONDS"
                : localReplay.phase === "complete"
                  ? "REPLAY COMPLETE · VERIFIED"
                  : "REPLAY STOPPED · NOT VERIFIED"}
          </strong>
          <p>{localReplay.context}</p>
          <div className="local-replay-progress" aria-hidden="true">
            <span
              style={{
                width: `${clamp(
                  localReplay.phase === "preparing"
                    ? localReplay.tick / Math.max(1, localReplay.startTick)
                    : (localReplay.tick - localReplay.startTick) /
                      Math.max(1, localReplay.endTick - localReplay.startTick),
                  0,
                  1,
                ) * 100}%`,
              }}
            />
          </div>
          <small>
            TICK {localReplay.tick} / {localReplay.endTick}
            {localReplay.checksum ? ` · CHECKSUM ${localReplay.checksum}` : ""}
          </small>
          <button data-testid="return-to-results" onClick={returnToResults}>
            RETURN TO RESULTS
          </button>
        </section>
      )}

      {running && actionCallout && (
        <div className="sr-only" role="status" aria-live="polite">{actionCallout}</div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function updateParticles(particles: Particle[], deltaSeconds: number) {
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

function renderArena(
  canvas: HTMLCanvasElement,
  runtime: ArenaRenderRuntime,
  now: number,
  photoSkin: PhotoSkinCanvasAppearance | undefined,
  worldCosmetics: WorldCosmeticState,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;
  const pixelRatio = arenaBackingScale(
    width,
    height,
    window.devicePixelRatio || 1,
    // Use the mode's stable design density, not the momentary count. Death
    // fountains can push the field across a threshold for a few ticks; canvas
    // backing stores must never resize mid-fight because of that transient.
    LOCAL_TARGET_DROP_COUNT,
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
  const effectTime = runtime.reducedMotion ? 0 : now;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!runtime.reducedMotion && runtime.shakeUntil > now) {
    const intensity = clamp((runtime.shakeUntil - now) / 220, 0, 1) * 3;
    context.translate(
      Math.sin(now * 0.19) * intensity,
      Math.cos(now * 0.23) * intensity,
    );
  }

  const arenaTheme = getArenaVisualTheme(worldCosmetics.arenaThemeId);
  drawArenaFloor(context, width, height, ...arenaTheme.colors);

  const player = runtime.state.players[PLAYER_ID];
  const camera = advanceCameraMotion(
    runtime.camera,
    player?.alive ? player.position : undefined,
    now,
  );
  // One shared framing rule keeps desktop, phone, Practice, replay, Live, and
  // radar knowledge aligned with the same inhabited open-zone composition.
  const zoom = getArenaCameraZoom(
    width,
    height,
    player?.mass ?? 100,
    player?.specialist,
    runtime.state.tick,
  );
  const worldToScreen = (point: Vec2, output: Vec2 = { x: 0, y: 0 }): Vec2 => {
    output.x = width / 2 + (point.x - camera.x) * zoom;
    output.y = height / 2 + (point.y - camera.y) * zoom;
    return output;
  };

  drawArenaTexture(context, width, height, camera, zoom, effectTime);
  drawPirateShipBackdrop(context, width, height);
  context.save();
  clipCanvasToArenaCircle(
    context,
    worldToScreen({ x: 0, y: 0 }),
    runtime.state.config.arenaRadius * zoom,
  );
  drawChargingStationField(context, {
    views: runtime.state.board.chargingStations.map((station) => ({
      station,
      state: runtime.state.chargingStations[station.id],
    })),
    worldToScreen,
    zoom,
    width,
    height,
    fixedStepSeconds: runtime.state.config.fixedStepSeconds,
    viewerPlayerId: PLAYER_ID,
    now: effectTime,
  });
  drawDrops(
    context,
    runtime.state,
    worldToScreen,
    camera,
    zoom,
    width,
    height,
    effectTime,
    runtime.tutorialSparkId,
    worldCosmetics.pickupThemeId,
  );

  const players = Object.values(runtime.state.players)
    .filter((entry) => entry.alive)
    .sort((first, second) => first.mass - second.mass);
  const wormMaterialMotion = runtime.reducedMotion ? 0 : materialMotionScale();
  const wormMaterialGlow = materialGlowEnabled();
  for (const entry of players) {
    drawLivingChain(
      context,
      entry,
      runtime.state,
      worldToScreen,
      zoom,
      width,
      height,
      effectTime,
      runtime.debugHitboxes,
      entry.id === PLAYER_ID ? photoSkin : undefined,
      wormMaterialMotion,
      wormMaterialGlow,
    );
  }

  for (const particle of runtime.particles) {
    const screen = worldToScreen(particle);
    if (
      screen.x < -40 ||
      screen.y < -40 ||
      screen.x > width + 40 ||
      screen.y > height + 40
    ) continue;
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
    context.shadowBlur = 0;
    drawTreasureShard(
      context,
      screen.x,
      screen.y,
      Math.max(1.8, particle.radius * zoom * alpha),
      particle.color,
      particle.life * 7 + particle.x * 0.013,
    );
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.restore();
  // The physical wall is the topmost arena geometry. Treasure, death releases,
  // creatures, and their glow can approach it but never paint over or escape.
  drawBoundary(
    context,
    runtime,
    worldToScreen,
    zoom,
    effectTime,
    width,
    height,
    worldCosmetics.arenaThemeId,
  );

  drawArenaVignette(context, width, height);

  if (!runtime.reducedMotion && runtime.impactUntil > now) {
    const alpha = clamp((runtime.impactUntil - now) / 160, 0, 1);
    context.fillStyle = `rgba(255, 67, 121, ${alpha * 0.12})`;
    context.fillRect(0, 0, width, height);
  }
}

function drawArenaTexture(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Vec2,
  zoom: number,
  now: number,
) {
  drawNauticalChart(context, width, height, camera, zoom, now);
}

function drawBoundary(
  context: CanvasRenderingContext2D,
  runtime: ArenaRenderRuntime,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  now: number,
  width: number,
  height: number,
  themeId: ArenaVisualThemeId,
) {
  const center = worldToScreen({ x: 0, y: 0 });
  const radius = runtime.state.config.arenaRadius * zoom;
  const lineWidth = Math.max(9, 28 * zoom);
  // The 1,050-drop stress field already has a strong solid wall. Avoid a large
  // animated blur filter there; it is costly in pixels and adds no rule signal.
  const shadowBlur = runtime.state.drops.length >= 900 ? 0 : 26;
  if (!arenaBoundaryIntersectsViewport(
    center,
    radius,
    lineWidth,
    shadowBlur,
    width,
    height,
  )) return;
  drawBoundaryGuardians(context, {
    center,
    radius,
    zoom,
    width,
    height,
    now,
    reducedMotion: runtime.reducedMotion,
    themeId,
    strike: runtime.boundaryStrike,
  });
  const guardianSpec = getBoundaryGuardianSpec(themeId);
  context.save();
  context.globalAlpha = 0.68 + Math.sin(now * 0.004) * 0.1;
  context.strokeStyle = guardianSpec.wallColor;
  context.lineWidth = lineWidth;
  context.shadowColor = guardianSpec.wallGlowColor;
  context.shadowBlur = shadowBlur;
  context.setLineDash([28 * zoom, 18 * zoom]);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawDrops(
  context: CanvasRenderingContext2D,
  state: GameState,
  worldToScreen: (point: Vec2) => Vec2,
  camera: Readonly<Vec2>,
  zoom: number,
  width: number,
  height: number,
  now: number,
  tutorialSparkId?: string,
  pickupThemeId: PickupThemeId = "pirate-hoard",
) {
  // Reuse both the list and each stable ground-item descriptor. Practice can
  // hold 1,050 drops, so rebuilding these objects every frame creates GC
  // pauses even when the actual Canvas callback is inexpensive.
  const fieldItems = groundTreasureFieldScratch;
  fieldItems.length = 0;
  for (const drop of state.drops) {
    if (
      drop.id === tutorialSparkId ||
      getGroundRelicPresentation(drop) ||
      drop.source === "boost" ||
      drop.source === "death" ||
      drop.mass >= RARE_TREASURE_CHEST_MASS
    ) continue;
    // Use the exact camera transform directly for the dense ordinary field.
    // Returning a {x,y} object here for every one of 1,050 drops on every
    // frame was the last large source of short-lived Practice allocations.
    const screenX = width / 2 + (drop.position.x - camera.x) * zoom;
    const screenY = height / 2 + (drop.position.y - camera.y) * zoom;
    const cullMargin = 64;
    if (
      screenX < -cullMargin ||
      screenY < -cullMargin ||
      screenX > width + cullMargin ||
      screenY > height + cullMargin
    ) continue;
    let item = groundTreasureItemCache.get(drop);
    if (!item) {
      item = {
        id: drop.id,
        position: drop.position,
        radius: drop.radius,
        seed: stableNumber(drop.id),
      };
      groundTreasureItemCache.set(drop, item);
    }
    // Refresh mutable geometry so this cache stays correct if a later arena
    // update retains the DropState object but changes its fields.
    if (item.id !== drop.id) {
      item.id = drop.id;
      item.seed = stableNumber(drop.id);
    }
    item.position = drop.position;
    item.radius = drop.radius;
    item.opacity = ambientTreasureOpacity(drop, state.tick, state.config.fixedStepSeconds);
    item.screenX = screenX;
    item.screenY = screenY;
    fieldItems.push(item);
  }
  drawWorldPickupField(
    context,
    fieldItems,
    worldToScreen,
    zoom,
    width,
    height,
    now,
    pickupThemeId,
  );

  for (const drop of state.drops) {
    const groundRelic = getGroundRelicPresentation(drop);
    if (
      drop.id !== tutorialSparkId &&
      !groundRelic &&
      drop.source !== "boost" &&
      drop.source !== "death" &&
      drop.mass < RARE_TREASURE_CHEST_MASS
    ) {
      continue;
    }
    const screen = worldToScreen(drop.position);
    const pulse = 0.92 + Math.sin(now * 0.004 + stableNumber(drop.id)) * 0.08;
    const radius = Math.max(2.2, drop.radius * zoom * pulse);
    if (screen.x < -radius * 2 || screen.y < -radius * 2 || screen.x > width + radius * 2 || screen.y > height + radius * 2) continue;
    const color = foodColor(drop);
    context.save();
    context.globalAlpha *= ambientTreasureOpacity(drop, state.tick, state.config.fixedStepSeconds);
    context.translate(screen.x, screen.y);

    if (drop.id === tutorialSparkId) {
      context.save();
      context.rotate(-now * 0.0014);
      context.strokeStyle = "rgba(255,255,255,.96)";
      context.lineWidth = Math.max(1.6, radius * 0.16);
      context.setLineDash([radius * 0.9, radius * 0.48]);
      context.shadowColor = "#8affea";
      context.shadowBlur = 16;
      context.beginPath();
      context.arc(0, 0, Math.max(12, radius * 2.15), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    if (groundRelic) {
      const beaconRadius = Math.max(10, radius * 1.25);
      drawGroundRelicPickup(context, drop, {
        beaconRadius,
        zoom,
        now,
        fixedStepSeconds: state.config.fixedStepSeconds,
      });
      context.restore();
      continue;
    }

    if (drop.source === "boost") {
      // Boost Echoes are a producer-colored shed trail, not neutral food.
      const angle = (stableNumber(drop.id) % 628) / 100;
      context.rotate(angle);
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
      continue;
    }

    if (drop.source === "death") {
      // Real defeated-chain mass becomes a marked rival-hoard jewel.
      drawRivalHoardGem(context, radius, color, now, stableNumber(drop.id));
      context.restore();
      continue;
    }

    if (drop.mass >= RARE_TREASURE_CHEST_MASS) {
      // One authoritative collider is rendered as a high-value treasure chest.
      drawTreasureChest(context, radius, color, now, stableNumber(drop.id));
      context.restore();
      continue;
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
}

function drawLivingChain(
  context: CanvasRenderingContext2D,
  player: PlayerState,
  state: GameState,
  worldToScreen: (point: Vec2, output?: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
  debugHitboxes: boolean,
  photoSkin: PhotoSkinCanvasAppearance | undefined,
  materialMotion: number,
  materialGlow: boolean,
) {
  const margin = 240;
  const pointCount = player.body.length + 1;
  while (chainPointPool.length < pointCount) chainPointPool.push({ x: 0, y: 0 });
  chainPointScratch.length = pointCount;
  chainBodyPointScratch.length = player.body.length;
  const headScreen = worldToScreen(player.position, chainPointPool[0]);
  chainPointScratch[0] = headScreen;
  let hasVisiblePoint =
    headScreen.x > -margin && headScreen.y > -margin &&
    headScreen.x < width + margin && headScreen.y < height + margin;
  for (let index = 0; index < player.body.length; index += 1) {
    const screen = worldToScreen(player.body[index], chainPointPool[index + 1]);
    chainPointScratch[index + 1] = screen;
    chainBodyPointScratch[index] = screen;
    if (
      screen.x > -margin && screen.y > -margin &&
      screen.x < width + margin && screen.y < height + margin
    ) hasVisiblePoint = true;
  }
  if (!hasVisiblePoint) return;

  const palette = photoSkin
    ? [...photoSkin.renderPlan.theme.palette]
    : player.id === PLAYER_ID && isRewardedCorsairSkinEquipped()
      ? [...GILDED_CORSAIR_PALETTE]
      : paletteFor(player.id);
  const headRadius = getPlayerRadius(player, state.config) * zoom;
  const followerRadius = getBodyRadius(player, state.config) * zoom;
  const identity = stableNumber(player.id);
  const shielded = player.shieldTicksRemaining > 0;
  const points = chainPointScratch;
  const activeRelic = createActiveRelicCanvasModel(player.specialist, state.tick);
  // A photo skin whose theme does not map to a parent skin left these undefined
  // and dropped the worm to the old procedural body. Parent-quality rendering is
  // the floor for every worm, so fall back to the identity skin instead of out of
  // the parent renderer entirely.
  const parentSkinId = (photoSkin ? photoSkin.renderPlan.parentSkinId : undefined)
    ?? wormateParentSkinForIdentity(identity);
  const parentOutfit = (photoSkin ? photoSkin.renderPlan.parentOutfit : undefined)
    ?? wormateParentOutfitForIdentity(identity);

  if (activeRelic?.presentation.relicKind === "loot-compass") {
    drawCollectorField(context, headScreen, headRadius, now, palette[0]);
  } else if (activeRelic) {
    drawRelicCarrierEffect(context, activeRelic, headScreen, headRadius, now);
  }

  context.save();
  drawContinuousPirateWorm(context, {
    points,
    headRadius,
    bodyRadius: followerRadius,
    palette,
    direction: player.direction,
    shielded,
    identity,
    now,
    // The authored animated material rides only on the worm whose theme is
    // known — the local captain. Bots keep the plain surface, which doubles as
    // an at-a-glance "that one is me" read in crowded scenes.
    pattern: photoSkin && isWormMaterialPattern(photoSkin.renderPlan.theme.pattern)
      ? photoSkin.renderPlan.theme.pattern
      : wormMaterialForIdentity(identity),
    cinematicHeadPattern: photoSkin && isWormMaterialPattern(photoSkin.renderPlan.faceTheme.pattern)
      ? photoSkin.renderPlan.faceTheme.pattern
      : undefined,
    cinematicHeadPalette: photoSkin?.renderPlan.faceTheme.palette,
    cinematicHeadHue: photoSkin?.renderPlan.faceTheme.headHue ?? 0,
    faceMode: photoSkin?.renderPlan.faceMode,
    eyeStyle: photoSkin?.renderPlan.eyeStyle,
    expressionStyle: photoSkin?.renderPlan.expressionStyle,
    magnetized: activeRelic?.presentation.relicKind === "loot-compass",
    materialMotion,
    // Preserve authored patterns on every visible crew, but spend expensive
    // bloom only on this device's captain. Rival skin remains fully readable.
    materialGlow: materialGlow && player.id === PLAYER_ID,
    boosting: isPlayerBoosting(player, state.config),
    cinematicHead: player.id === PLAYER_ID,
    parentSkinId,
    parentOutfit,
    viewportWidth: width,
    viewportHeight: height,
  });

  if (photoSkin && points.length > 2) {
    drawPhotoSkinCanvas(context, {
      points: chainBodyPointScratch,
      bodyRadius: followerRadius,
      direction: player.direction,
      decodedImages: photoSkin.decodedImages,
      renderPlan: photoSkin.renderPlan,
    });
  }

  // No on-body reserve gauge - see the note in LiveArenaCanvas. The HUD boost
  // dial carries this without painting a bar through the skin.

  if (activeRelic && points[1]) {
    // Relic paint stays entirely inside an existing solid segment. It changes
    // presentation only; the crew silhouette and hitbox stay exact.
    const crew = points[1];
    drawRelicCarrierBadge(
      context,
      activeRelic,
      crew.x,
      crew.y,
      followerRadius * 0.82,
      now,
    );
  }

  if (debugHitboxes) {
    context.save();
    context.globalAlpha = 0.18;
    context.strokeStyle = "#ffffff";
    context.lineWidth = followerRadius * 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of chainBodyPointScratch) context.lineTo(point.x, point.y);
    context.stroke();
    context.globalAlpha = 1;
    context.setLineDash([3, 3]);
    context.strokeStyle = "rgba(255,255,255,0.76)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(headScreen.x, headScreen.y, headRadius, 0, Math.PI * 2);
    context.stroke();
    for (const point of chainBodyPointScratch) {
      context.beginPath();
      context.arc(point.x, point.y, followerRadius, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  context.globalAlpha = 1;
  if (shielded) {
    context.strokeStyle = "rgba(185, 252, 255, 0.82)";
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.arc(headScreen.x, headScreen.y, headRadius * 1.42, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }
  context.restore();
}

function drawCollectorField(
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

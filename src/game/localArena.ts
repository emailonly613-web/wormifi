import { spawnBotRoster } from "./bots";
import {
  getGameBoardProfile,
  type GameBoardId,
} from "./chargingStations";
import {
  createGameState,
  getBodyRadius,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "./core";
import { nextRandomState } from "./random";
import {
  INITIAL_PIRATE_RELIC_KINDS,
  PirateRelicDirector,
} from "./relicDirector";
import type {
  BotInputProviderMap,
  GameState,
  GameStepResult,
  PlayerInput,
  Vec2,
} from "./types";

export type LocalArenaMode = "rush" | "endless" | "practice";

export const LOCAL_PLAYER_ID = "player-you";
export const LOCAL_BOT_COUNT = 28;
export const LOCAL_TARGET_DROP_COUNT = 1_050;
export const LOCAL_STARTER_RIVAL_IDS = Object.freeze([
  "bot-01",
  "bot-02",
] as const);
const localRelicDirectors = new WeakMap<GameState, PirateRelicDirector>();

/**
 * Two parallel pirate rivals open inside even the narrow portrait camera.
 * They are close enough to make the arena feel inhabited, but their complete
 * solid chains stay outside the launch corridor and initially sail with the
 * player instead of cutting across an unlearned control path.
 */
const LOCAL_STARTER_RIVAL_POSES = Object.freeze([
  {
    id: LOCAL_STARTER_RIVAL_IDS[0],
    position: { x: -115, y: -110 },
    direction: { x: 1, y: 0 },
  },
  {
    id: LOCAL_STARTER_RIVAL_IDS[1],
    position: { x: 115, y: -110 },
    direction: { x: 1, y: 0 },
  },
] as const);

export interface LocalArenaSession {
  state: GameState;
  providers: BotInputProviderMap;
  /** Present on sessions created by buildLocalArena; optional for old wrappers. */
  boardId?: GameBoardId;
}

export interface BuiltLocalArenaSession extends LocalArenaSession {
  boardId: GameBoardId;
}

export interface RecordedLocalInput {
  tick: number;
  direction: Vec2;
  boost: boolean;
}

interface LocalRunRecordingFields {
  seed: string | number;
  mode: LocalArenaMode;
  playerName: string;
  inputs: RecordedLocalInput[];
  terminalTick: number;
  terminalChecksum: string;
}

/** Existing version-1 recordings predate board selection and mean Open Seas. */
export interface LegacyLocalRunRecording extends LocalRunRecordingFields {
  version: 1;
}

/** Every newly finalized recording binds replay to one known board. */
export interface LocalRunRecording extends LocalRunRecordingFields {
  version: 2;
  boardId: GameBoardId;
}

export type SupportedLocalRunRecording =
  | LegacyLocalRunRecording
  | LocalRunRecording;

export interface LocalRunDraft {
  seed: string | number;
  mode: LocalArenaMode;
  playerName: string;
  /** Optional for existing callers; finalizeLocalRun derives it from state. */
  boardId?: GameBoardId;
  inputs: RecordedLocalInput[];
}

export interface PreparedLocalReplay extends BuiltLocalArenaSession {
  /** Legacy input is normalized once so browser replay runtimes stay current. */
  recording: LocalRunRecording;
  nextInputIndex: number;
  startTick: number;
  endTick: number;
}

type LocalReplayPreparationProgress = Omit<
  PreparedLocalReplay,
  "boardId" | "relicDirector"
> & {
  /** Older browser wrappers do not surface these redundant runtime fields. */
  boardId?: GameBoardId;
  relicDirector?: PirateRelicDirector;
};

function normalizeDirection(direction: Vec2, fallback: Vec2): Vec2 {
  const lengthSquared = direction.x * direction.x + direction.y * direction.y;
  if (!Number.isFinite(lengthSquared) || lengthSquared <= 1e-9) {
    return { ...fallback };
  }
  const inverseLength = 1 / Math.sqrt(lengthSquared);
  return {
    x: direction.x * inverseLength,
    y: direction.y * inverseLength,
  };
}

/**
 * Captures the exact finite, normalized input that the deterministic core will
 * accept on this tick. Pointer coordinates and browser frame timings never
 * enter the replay contract.
 */
export function sanitizeLocalInput(
  tick: number,
  direction: Vec2,
  boost: boolean,
  fallbackDirection: Vec2,
): RecordedLocalInput {
  if (!Number.isSafeInteger(tick) || tick < 1) {
    throw new Error("Recorded local input requires a positive integer tick");
  }
  return {
    tick,
    direction: normalizeDirection(direction, fallbackDirection),
    boost: Boolean(boost),
  };
}

function seedArenaDrops(
  state: GameState,
  target: number,
): void {
  const safeRadius = state.config.arenaRadius - 70;
  const sharedPosition = { x: 0, y: 0 };
  const sharedOptions = {
    position: sharedPosition,
    mass: 0,
    radius: 0,
    source: "arena" as const,
  };
  while (state.drops.length < target) {
    const pointAngleState = nextRandomState(state.randomState);
    const pointRadiusState = nextRandomState(pointAngleState);
    const pointAngle = pointAngleState / 0x1_0000_0000 * Math.PI * 2;
    const pointDistance = Math.sqrt(pointRadiusState / 0x1_0000_0000) * safeRadius;
    const massAngleState = nextRandomState(pointRadiusState);
    const massRadiusState = nextRandomState(massAngleState);
    const massAngle = massAngleState / 0x1_0000_0000 * Math.PI * 2;
    const massDistance = Math.sqrt(massRadiusState / 0x1_0000_0000);
    const massX = Math.cos(massAngle) * massDistance;
    const massY = Math.sin(massAngle) * massDistance;
    state.randomState = massRadiusState;
    sharedPosition.x = Math.cos(pointAngle) * pointDistance;
    sharedPosition.y = Math.sin(pointAngle) * pointDistance;
    sharedOptions.mass = 1.5 + Math.abs(massX) * 4.5;
    sharedOptions.radius = 4 + Math.abs(massY) * 3;
    spawnDrop(state, sharedOptions);
  }
}

function requireGameBoardProfile(boardId: unknown): {
  boardId: GameBoardId;
  profile: NonNullable<ReturnType<typeof getGameBoardProfile>>;
} {
  if (typeof boardId !== "string") {
    throw new Error("Local arena board id must be a known board");
  }
  const profile = getGameBoardProfile(boardId);
  if (!profile || profile.id !== boardId) {
    throw new Error(`Unknown local arena board: ${boardId}`);
  }
  return { boardId: boardId as GameBoardId, profile };
}

function composeLocalStarterEncounter(state: GameState): void {
  for (const pose of LOCAL_STARTER_RIVAL_POSES) {
    const rival = state.players[pose.id];
    if (!rival?.alive || rival.kind !== "bot") {
      throw new Error(`Local starter rival ${pose.id} is unavailable`);
    }

    const spacing =
      getBodyRadius(rival, state.config) *
      2 *
      state.config.segmentSpacingFactor;
    const position = { ...pose.position };
    const direction = { ...pose.direction };
    const body = rival.body.map((_, index) => ({
      x: position.x - direction.x * spacing * (index + 1),
      y: position.y - direction.y * spacing * (index + 1),
    }));

    rival.position = position;
    rival.previousPosition = { ...position };
    rival.direction = direction;
    rival.body = body;
    rival.previousBody = body.map((segment) => ({ ...segment }));
    rival.lastInput = {
      ...rival.lastInput,
      direction: { ...direction },
      boost: false,
    };
  }
}

export function buildLocalArena(
  seed: string | number,
  playerName: string,
  mode: LocalArenaMode,
  boardId: GameBoardId = "open-seas",
): BuiltLocalArenaSession {
  const selectedBoard = requireGameBoardProfile(boardId);
  const state = createLocalGameState(seed, mode, selectedBoard.boardId);

  spawnPlayer(state, {
    id: LOCAL_PLAYER_ID,
    name: playerName || "Guest",
    kind: "human",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    shieldSeconds: state.config.spawnShieldSeconds,
  });

  const roster = spawnBotRoster(state, LOCAL_BOT_COUNT);
  composeLocalStarterEncounter(state);
  spawnDrop(state, {
    id: "collector-beacon-launch",
    // Keep the starter Relic in view without merging its canvas label into the
    // centered captain name / safe-head copy on narrow mobile screens.
    position: { x: 150, y: 210 },
    mass: 0,
    radius: 10,
    source: "arena",
    specialist: "collector",
    specialistDurationSeconds: 12,
  });
  for (const [id, position] of [
    // At start mass the 90-degree turn radius is ~50px. These targets sit on
    // the resulting tangent, rather than on an impossible centerline.
    ["starter-turn-up", { x: 55, y: -300 }],
    ["starter-turn-down", { x: 55, y: 300 }],
    ["starter-turn-left", { x: -300, y: 0 }],
  ] as const) {
    spawnDrop(state, {
      id,
      position,
      mass: 4.5,
      radius: 7.5,
      source: "arena",
    });
  }
  for (let index = 0; index < 9; index += 1) {
    spawnDrop(state, {
      id: `starter-spark-${index + 1}`,
      position: {
        x: 72 + index * 54,
        y: Math.sin(index * 1.25) * 46,
      },
      mass: 4.5,
      radius: 7.5,
      source: "arena",
    });
  }
  seedArenaDrops(state, LOCAL_TARGET_DROP_COUNT);
  const relicDirector = new PirateRelicDirector(
    state,
    INITIAL_PIRATE_RELIC_KINDS,
  );
  localRelicDirectors.set(state, relicDirector);
  return {
    state,
    providers: roster.providers,
    boardId: selectedBoard.boardId,
  };
}

function createLocalGameState(
  seed: string | number,
  mode: LocalArenaMode,
  boardId: GameBoardId,
) {
  // Kept here so live play and local replay cannot silently drift apart.
  const selectedBoard = requireGameBoardProfile(boardId);
  return createGameState(seed, {
    arenaRadius: mode === "rush" ? 1_420 : mode === "practice" ? 1_620 : 2_050,
    spawnRadiusFactor: 0.78,
    spawnAttempts: 20,
    maximumDeathDrops: 64,
    dropRadius: 5.2,
  }, selectedBoard.profile);
}

function maintainLocalArena(session: LocalArenaSession): void {
  for (const bot of Object.values(session.state.players)) {
    if (bot.kind !== "bot" || bot.alive || bot.diedAtTick === undefined) continue;
    if (session.state.tick - bot.diedAtTick < 48) continue;
    const savedName = bot.name;
    delete session.state.players[bot.id];
    spawnPlayer(session.state, {
      id: bot.id,
      name: savedName,
      kind: "bot",
      shieldSeconds: session.state.config.spawnShieldSeconds,
    });
  }

  if (session.state.drops.length < LOCAL_TARGET_DROP_COUNT - 90) {
    seedArenaDrops(session.state, LOCAL_TARGET_DROP_COUNT);
  }
}

export function stepLocalArena(
  session: LocalArenaSession,
  recordedInput?: RecordedLocalInput,
): GameStepResult {
  const nextTick = session.state.tick + 1;
  if (recordedInput && recordedInput.tick !== nextTick) {
    throw new Error(
      `Replay input tick ${recordedInput.tick} does not match next tick ${nextTick}`,
    );
  }

  const playerInput: PlayerInput | undefined = recordedInput
    ? {
        sequence: recordedInput.tick,
        clientTick: recordedInput.tick - 1,
        direction: { ...recordedInput.direction },
        boost: recordedInput.boost,
      }
    : undefined;
  const result = stepGame(
    session.state,
    playerInput ? { [LOCAL_PLAYER_ID]: playerInput } : {},
    session.providers,
  );
  localRelicDirectors.get(session.state)?.reconcile(result.events);
  maintainLocalArena(session);
  return result;
}

function canonicalState(state: GameState): unknown {
  return {
    // Open Seas intentionally retains the exact v1 checksum shape. Opt-in
    // boards bind both static geometry and dynamic station truth into v2.
    ...(state.board.id === "open-seas"
      ? {}
      : {
          board: state.board,
          chargingStations: Object.values(state.chargingStations)
            .sort((first, second) => first.stationId.localeCompare(second.stationId)),
        }),
    seed: state.initialSeed,
    randomState: state.randomState,
    tick: state.tick,
    nextEntityNumber: state.nextEntityNumber,
    players: Object.values(state.players)
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((player) => ({
        id: player.id,
        name: player.name,
        kind: player.kind,
        position: player.position,
        previousPosition: player.previousPosition,
        direction: player.direction,
        body: player.body,
        previousBody: player.previousBody,
        mass: player.mass,
        alive: player.alive,
        shieldTicksRemaining: player.shieldTicksRemaining,
        spawnedAtTick: player.spawnedAtTick,
        diedAtTick: player.diedAtTick,
        killedBy: player.killedBy,
        deathCause: player.deathCause,
        lastInput: player.lastInput,
        shedMassRemainder: player.shedMassRemainder,
        specialist: player.specialist,
        stats: player.stats,
      })),
    // Drop order is simulation-significant because collection resolves in order.
    drops: state.drops,
  };
}

export function checksumLocalArena(state: GameState): string {
  const canonical = JSON.stringify(canonicalState(state));
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function finalizeLocalRun(draft: LocalRunDraft, state: GameState): LocalRunRecording {
  const selectedBoard = requireGameBoardProfile(state.board.id);
  if (draft.boardId !== undefined && draft.boardId !== selectedBoard.boardId) {
    throw new Error(
      `Local recording board ${draft.boardId} does not match state board ${selectedBoard.boardId}`,
    );
  }
  return {
    version: 2,
    boardId: selectedBoard.boardId,
    seed: draft.seed,
    mode: draft.mode,
    playerName: draft.playerName,
    inputs: draft.inputs.map((input) => ({
      tick: input.tick,
      direction: { ...input.direction },
      boost: input.boost,
    })),
    terminalTick: state.tick,
    terminalChecksum: checksumLocalArena(state),
  };
}

export function getLocalRunBoardId(
  recording: SupportedLocalRunRecording,
): GameBoardId {
  if (recording.version === 1) {
    const unexpectedBoard = (recording as LegacyLocalRunRecording & {
      boardId?: unknown;
    }).boardId;
    if (unexpectedBoard !== undefined) {
      throw new Error("Version-1 local recordings cannot declare a board");
    }
    return "open-seas";
  }
  if (recording.version === 2) {
    return requireGameBoardProfile(recording.boardId).boardId;
  }
  throw new Error("Local replay recording has an unsupported version");
}

function validateRecording(recording: SupportedLocalRunRecording): GameBoardId {
  const boardId = getLocalRunBoardId(recording);
  if (recording.inputs.length !== recording.terminalTick) {
    throw new Error("Local replay recording has an invalid length contract");
  }
  for (let index = 0; index < recording.inputs.length; index += 1) {
    if (recording.inputs[index].tick !== index + 1) {
      throw new Error("Local replay input ticks must be contiguous");
    }
  }
  return boardId;
}

function normalizeSupportedRecording(
  recording: SupportedLocalRunRecording,
  boardId: GameBoardId,
): LocalRunRecording {
  if (recording.version === 2) return recording;
  return {
    version: 2,
    boardId,
    seed: recording.seed,
    mode: recording.mode,
    playerName: recording.playerName,
    inputs: recording.inputs,
    terminalTick: recording.terminalTick,
    terminalChecksum: recording.terminalChecksum,
  };
}

export function prepareLocalReplay(
  recording: SupportedLocalRunRecording,
  highlightSeconds = 6,
): PreparedLocalReplay {
  const prepared = createLocalReplayPreparation(recording, highlightSeconds);
  while (!advanceLocalReplayPreparation(prepared, 1_000)) {
    // The synchronous helper is reserved for deterministic tests and offline
    // verification. The browser UI uses bounded chunks and yields each frame.
  }
  return prepared;
}

export function createLocalReplayPreparation(
  recording: SupportedLocalRunRecording,
  highlightSeconds = 6,
): PreparedLocalReplay {
  const boardId = validateRecording(recording);
  const normalizedRecording = normalizeSupportedRecording(recording, boardId);
  if (!Number.isFinite(highlightSeconds) || highlightSeconds <= 0) {
    throw new Error("Local replay highlight duration must be positive");
  }
  const session = buildLocalArena(
    recording.seed,
    recording.playerName,
    recording.mode,
    boardId,
  );
  const highlightTicks = Math.ceil(
    highlightSeconds / session.state.config.fixedStepSeconds,
  );
  const startTick = Math.max(0, recording.terminalTick - highlightTicks);

  return {
    ...session,
    boardId,
    recording: normalizedRecording,
    nextInputIndex: 0,
    startTick,
    endTick: recording.terminalTick,
  };
}

export function advanceLocalReplayPreparation(
  prepared: LocalReplayPreparationProgress,
  maximumTicks: number,
): boolean {
  if (!Number.isSafeInteger(maximumTicks) || maximumTicks < 1) {
    throw new Error("Replay preparation tick budget must be a positive integer");
  }
  const stopIndex = Math.min(
    prepared.startTick,
    prepared.nextInputIndex + maximumTicks,
  );
  while (prepared.nextInputIndex < stopIndex) {
    stepLocalArena(
      prepared,
      prepared.recording.inputs[prepared.nextInputIndex],
    );
    prepared.nextInputIndex += 1;
  }
  return prepared.nextInputIndex >= prepared.startTick;
}

export function rebuildLocalRun(recording: SupportedLocalRunRecording): {
  state: GameState;
  checksum: string;
  boardId: GameBoardId;
} {
  const boardId = validateRecording(recording);
  const session = buildLocalArena(
    recording.seed,
    recording.playerName,
    recording.mode,
    boardId,
  );
  for (const input of recording.inputs) stepLocalArena(session, input);
  const checksum = checksumLocalArena(session.state);
  if (checksum !== recording.terminalChecksum) {
    throw new Error(
      `Local replay checksum mismatch for board ${boardId}`,
    );
  }
  return { state: session.state, checksum, boardId };
}

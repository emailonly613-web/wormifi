import { spawnBotRoster } from "./bots";
import { createGameState, spawnDrop, spawnPlayer, stepGame } from "./core";
import { randomPointInCircle } from "./random";
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

export interface LocalArenaSession {
  state: GameState;
  providers: BotInputProviderMap;
}

export interface RecordedLocalInput {
  tick: number;
  direction: Vec2;
  boost: boolean;
}

export interface LocalRunRecording {
  version: 1;
  seed: string | number;
  mode: LocalArenaMode;
  playerName: string;
  inputs: RecordedLocalInput[];
  terminalTick: number;
  terminalChecksum: string;
}

export interface LocalRunDraft {
  seed: string | number;
  mode: LocalArenaMode;
  playerName: string;
  inputs: RecordedLocalInput[];
}

export interface PreparedLocalReplay extends LocalArenaSession {
  recording: LocalRunRecording;
  nextInputIndex: number;
  startTick: number;
  endTick: number;
}

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

function seedArenaDrops(state: GameState, target: number): void {
  const safeRadius = state.config.arenaRadius - 70;
  while (state.drops.length < target) {
    const point = randomPointInCircle(state.randomState, safeRadius);
    state.randomState = point.state;
    const massRoll = randomPointInCircle(state.randomState, 1);
    state.randomState = massRoll.state;
    spawnDrop(state, {
      position: point.value,
      mass: 1.5 + Math.abs(massRoll.value.x) * 4.5,
      radius: 4 + Math.abs(massRoll.value.y) * 3,
      source: "arena",
    });
  }
}

export function buildLocalArena(
  seed: string | number,
  playerName: string,
  mode: LocalArenaMode,
): LocalArenaSession {
  const state = createLocalGameState(seed, mode);

  spawnPlayer(state, {
    id: LOCAL_PLAYER_ID,
    name: playerName || "Guest",
    kind: "human",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    shieldSeconds: 4,
  });

  const roster = spawnBotRoster(state, LOCAL_BOT_COUNT);
  spawnDrop(state, {
    id: "collector-beacon-launch",
    position: { x: 165, y: 0 },
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
  return { state, providers: roster.providers };
}

function createLocalGameState(seed: string | number, mode: LocalArenaMode) {
  // Kept here so live play and local replay cannot silently drift apart.
  return createGameState(seed, {
    arenaRadius: mode === "rush" ? 1_420 : mode === "practice" ? 1_620 : 2_050,
    spawnRadiusFactor: 0.78,
    spawnAttempts: 20,
    maximumDeathDrops: 64,
    dropRadius: 5.2,
  });
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
      shieldSeconds: 2.5,
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
  maintainLocalArena(session);
  return result;
}

function canonicalState(state: GameState): unknown {
  return {
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
  return {
    version: 1,
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

function validateRecording(recording: LocalRunRecording): void {
  if (recording.version !== 1 || recording.inputs.length !== recording.terminalTick) {
    throw new Error("Local replay recording has an invalid length contract");
  }
  for (let index = 0; index < recording.inputs.length; index += 1) {
    if (recording.inputs[index].tick !== index + 1) {
      throw new Error("Local replay input ticks must be contiguous");
    }
  }
}

export function prepareLocalReplay(
  recording: LocalRunRecording,
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
  recording: LocalRunRecording,
  highlightSeconds = 6,
): PreparedLocalReplay {
  validateRecording(recording);
  if (!Number.isFinite(highlightSeconds) || highlightSeconds <= 0) {
    throw new Error("Local replay highlight duration must be positive");
  }
  const session = buildLocalArena(
    recording.seed,
    recording.playerName,
    recording.mode,
  );
  const highlightTicks = Math.ceil(
    highlightSeconds / session.state.config.fixedStepSeconds,
  );
  const startTick = Math.max(0, recording.terminalTick - highlightTicks);

  return {
    ...session,
    recording,
    nextInputIndex: 0,
    startTick,
    endTick: recording.terminalTick,
  };
}

export function advanceLocalReplayPreparation(
  prepared: PreparedLocalReplay,
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

export function rebuildLocalRun(recording: LocalRunRecording): {
  state: GameState;
  checksum: string;
} {
  validateRecording(recording);
  const session = buildLocalArena(
    recording.seed,
    recording.playerName,
    recording.mode,
  );
  for (const input of recording.inputs) stepLocalArena(session, input);
  return { state: session.state, checksum: checksumLocalArena(session.state) };
}

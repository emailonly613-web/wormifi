import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import type WebSocket from "ws";

import {
  calculateScore,
  createGameState,
  getPlayerRank,
  isPlayerBoosting,
  isSpecialistActive,
  spawnDrop,
  spawnPlayer,
  stepGame,
} from "../../src/game/core.ts";
import { spawnBotRoster } from "../../src/game/bots.ts";
import { randomPointInCircle } from "../../src/game/random.ts";
import {
  DEFAULT_COSMETIC_THEME_ID,
  type CosmeticThemeId,
} from "../../src/game/cosmeticThemes.ts";
import type {
  BotInputProvider,
  GameBoardConfig,
  GameEvent,
  GameState,
  PlayerInput,
  PlayerInputMap,
} from "../../src/game/types.ts";
import {
  HeatRingController,
  type HeatRingConfig,
} from "./heat-ring.ts";
import { PirateRelicDirector } from "./relic-director.ts";
import { SERVER_BUILD_REVISION } from "./build-info.ts";
import {
  MIXED_ECHO_ORIGIN_ID,
  PROTOCOL_VERSION,
  packPresenceForWire,
  packPublicPlayerTupleForWire,
  packSnapshotForWire,
  packSnapshotTupleForWire,
  type AuthoritativeEvent,
  type ErrorMessage,
  type InputMessage,
  type JoinMessage,
  type PresenceMessage,
  type PublicDropState,
  type PublicPlayerPresence,
  type PublicPlayerState,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "./protocol.ts";
import {
  DEFAULT_GAME_PACE_ID,
  getGamePaceProfile,
  type GamePaceId,
} from "../../src/game/gamePace.ts";
import {
  LIVE_SPATIAL_PROFILE,
  RECOMMENDED_PLAYER_INTEREST_RADIUS,
} from "../../src/game/spatialFeel.ts";
import { selectNeutralTreasureMass } from "../../src/game/treasureEconomy.ts";
import {
  ambientTreasureLifetimeTicks,
  expireAmbientTreasure,
} from "../../src/game/treasureFlow.ts";

const MAX_SNAPSHOT_BUFFER_BYTES = 256 * 1024;
const SCHEDULER_WAKE_MS = 4;
const MAX_CATCH_UP_STEPS = 4;
export const DEFAULT_PRESENCE_HZ = 2;
// Must cover the camera's MAX_VISIBLE_WORLD_RADIUS with margin (test-pinned):
// a fully zoomed-out player sees to 1,500 world units, so anything nearer
// than 1,600 is already in their snapshot before it can enter the frame.
export const DEFAULT_PLAYER_INTEREST_RADIUS = RECOMMENDED_PLAYER_INTEREST_RADIUS;

/** Published room cadence: replacement appears five seconds after effect expiry. */
export const COLLECTOR_BEACON_RESPAWN_SECONDS = 5;
export const COLLECTOR_BEACON_RADIUS = 9;

interface Session {
  token: string;
  playerId: string;
  name: string;
  themeId: CosmeticThemeId;
  presenceV1: boolean;
  snapshotTupleV1: boolean;
  socket?: WebSocket;
  lastAcceptedSequence: number;
  latestInput?: PlayerInput;
  disconnectedAtMs?: number;
  accountId?: string;
  lifeId: string;
}

interface BenchedBot {
  id: string;
  name: string;
  provider: BotInputProvider;
}

export interface ArenaRoomOptions {
  targetPopulation?: number;
  /** Maximum reserved human seats, including reconnect-grace sessions. */
  maxHumanPlayers?: number;
  fixedStepHz?: number;
  snapshotHz?: number;
  /** Low-frequency complete roster used for rank, population, and radar dots. */
  presenceHz?: number;
  /** Full body paths are sent only when they intersect this radius from a human. */
  playerInterestRadius?: number;
  reconnectGraceMs?: number;
  arenaRadius?: number;
  targetDropCount?: number;
  /** Opt-in board profile. Omit it to preserve the station-free open arena. */
  board?: Readonly<GameBoardConfig>;
  /** Server-authoritative room-wide movement profile. */
  paceId?: GamePaceId;
  heatRing?: false | Partial<HeatRingConfig>;
  now?: () => number;
  onAuthoritativeLifeEnded?: (result: AuthoritativeLifeResult) => void;
}

export interface AuthenticatedArenaJoin {
  accountId?: string;
}

export interface AuthoritativeLifeResult {
  accountId: string;
  idempotencyKey: string;
  roomId: string;
  lifeId: string;
  finalScore: number;
  kills: number;
  rank: number;
  peakMass: number;
  rulesetVersion: string;
  occurredAtMs: number;
}

export interface JoinResult {
  session?: Session;
  error?: ErrorMessage;
}

function playerIntersectsInterestCircle(
  player: PublicPlayerState,
  center: Readonly<{ x: number; y: number }>,
  radiusSquared: number,
): boolean {
  const headX = player.position.x - center.x;
  const headY = player.position.y - center.y;
  if (headX * headX + headY * headY <= radiusSquared) return true;
  return player.body.some((segment) => {
    const x = segment.x - center.x;
    const y = segment.y - center.y;
    return x * x + y * y <= radiusSquared;
  });
}

function eventPlayerIds(event: AuthoritativeEvent): string[] {
  if (event.type === "heatRingStarted") return [...event.heatRing.botIds];
  if (event.type === "heatRingResolved" || event.type === "heatRingAborted") {
    return [...event.botIds];
  }
  return event.type === "playerDied" && event.killerId
    ? [event.playerId, event.killerId]
    : [event.playerId];
}

export interface SnapshotInterestIndex {
  cellSize: number;
  playerIdsByCell: ReadonlyMap<string, ReadonlySet<string>>;
}

function interestCellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

/**
 * Index every sampled head/body point once per snapshot. Querying the cells
 * overlapped by a player's interest circle preserves the exact final distance
 * check while avoiding an all-bodies scan for every connected captain.
 */
export function createSnapshotInterestIndex(
  snapshot: SnapshotMessage,
  cellSize: number,
): SnapshotInterestIndex | undefined {
  if (!Number.isFinite(cellSize) || cellSize <= 0) return undefined;
  const playerIdsByCell = new Map<string, Set<string>>();
  for (const player of snapshot.players) {
    const occupiedCells = new Set<string>();
    const addPoint = (point: Readonly<{ x: number; y: number }>) => {
      occupiedCells.add(interestCellKey(
        Math.floor(point.x / cellSize),
        Math.floor(point.y / cellSize),
      ));
    };
    addPoint(player.position);
    for (const point of player.body) addPoint(point);
    for (const key of occupiedCells) {
      const ids = playerIdsByCell.get(key) ?? new Set<string>();
      ids.add(player.id);
      playerIdsByCell.set(key, ids);
    }
  }
  return { cellSize, playerIdsByCell };
}

function interestCandidates(
  index: SnapshotInterestIndex,
  center: Readonly<{ x: number; y: number }>,
  radius: number,
): Set<string> {
  const ids = new Set<string>();
  const minimumX = Math.floor((center.x - radius) / index.cellSize);
  const maximumX = Math.floor((center.x + radius) / index.cellSize);
  const minimumY = Math.floor((center.y - radius) / index.cellSize);
  const maximumY = Math.floor((center.y + radius) / index.cellSize);
  for (let x = minimumX; x <= maximumX; x += 1) {
    for (let y = minimumY; y <= maximumY; y += 1) {
      const cell = index.playerIdsByCell.get(interestCellKey(x, y));
      if (!cell) continue;
      for (const id of cell) ids.add(id);
    }
  }
  return ids;
}

/**
 * Preserve complete authority for the local collision neighborhood while the
 * low-frequency PresenceMessage owns full-room rank/radar/population truth.
 */
export function scopeSnapshotForPlayer(
  snapshot: SnapshotMessage,
  playerId: string,
  interestRadius = DEFAULT_PLAYER_INTEREST_RADIUS,
  interestIndex?: SnapshotInterestIndex,
): SnapshotMessage {
  if (interestRadius === Number.POSITIVE_INFINITY) return snapshot;
  const ownPlayer = snapshot.players.find((player) => player.id === playerId);
  if (!ownPlayer || !Number.isFinite(interestRadius) || interestRadius <= 0) {
    return { ...snapshot, players: ownPlayer ? [ownPlayer] : [] };
  }
  const radiusSquared = interestRadius * interestRadius;
  const candidateIds = interestIndex
    ? interestCandidates(interestIndex, ownPlayer.position, interestRadius)
    : undefined;
  const includedIds = new Set(
    snapshot.players
      .filter((player) =>
        player.id === playerId ||
        (candidateIds?.has(player.id) ?? true) &&
          playerIntersectsInterestCircle(player, ownPlayer.position, radiusSquared)
      )
      .map((player) => player.id),
  );
  const events = snapshot.events.filter((event) => {
    const ids = eventPlayerIds(event);
    return ids.includes(playerId) || ids.some((id) => includedIds.has(id));
  });
  for (const event of events) {
    if (eventPlayerIds(event).includes(playerId)) {
      for (const id of eventPlayerIds(event)) includedIds.add(id);
    }
  }
  return {
    ...snapshot,
    players: snapshot.players.filter((player) => includedIds.has(player.id)),
    events,
  };
}

export class ArenaRoom {
  readonly state: GameState;
  readonly paceId: GamePaceId;

  private readonly targetPopulation: number;
  private readonly maxHumanPlayers: number;
  private readonly fixedStepHz: number;
  private readonly snapshotEveryTicks: number;
  private readonly presenceEveryTicks: number;
  private readonly playerInterestRadius: number;
  private readonly reconnectGraceMs: number;
  private readonly targetDropCount: number;
  private readonly heatRingOptions: false | Partial<HeatRingConfig> | undefined;
  private readonly collectorBeaconRespawnTicks: number;
  private readonly pirateRelics: PirateRelicDirector;
  private readonly now: () => number;
  private readonly onAuthoritativeLifeEnded?: (result: AuthoritativeLifeResult) => void;
  private readonly sessionsByToken = new Map<string, Session>();
  private readonly sessionsByPlayer = new Map<string, Session>();
  private readonly botPool: BenchedBot[] = [];
  private readonly botProviders: Record<string, BotInputProvider> = {};
  private pendingEvents: AuthoritativeEvent[] = [];
  private readonly broadcastDrops = new Map<string, PublicDropState>();
  private timer?: NodeJS.Timeout;
  private schedulerLastMs = 0;
  private schedulerAccumulatorMs = 0;
  private lastSnapshotTick = 0;
  private lastPresenceTick = 0;
  private humanNumber = 0;
  private collectorBeaconNumber = 0;
  private nextCollectorBeaconTick?: number;
  private heatRingUsed = false;
  private heatRing?: HeatRingController;

  constructor(
    readonly id: string,
    options: ArenaRoomOptions = {},
    private readonly onIdle?: (room: ArenaRoom) => void,
  ) {
    this.targetPopulation = Math.max(
      0,
      Math.floor(options.targetPopulation ?? LIVE_SPATIAL_PROFILE.targetPopulation),
    );
    this.maxHumanPlayers = Math.max(1, Math.floor(options.maxHumanPlayers ?? 24));
    this.fixedStepHz = Math.max(1, Math.floor(options.fixedStepHz ?? 30));
    const snapshotHz = Math.max(1, Math.floor(options.snapshotHz ?? 15));
    this.snapshotEveryTicks = Math.max(1, Math.round(this.fixedStepHz / snapshotHz));
    const presenceHz = Math.max(1, Math.floor(options.presenceHz ?? DEFAULT_PRESENCE_HZ));
    this.presenceEveryTicks = Math.max(1, Math.round(this.fixedStepHz / presenceHz));
    this.playerInterestRadius = Math.max(
      100,
      options.playerInterestRadius ?? Number.POSITIVE_INFINITY,
    );
    this.reconnectGraceMs = Math.max(100, options.reconnectGraceMs ?? 15_000);
    this.targetDropCount = Math.max(
      0,
      Math.floor(options.targetDropCount ?? LIVE_SPATIAL_PROFILE.targetDropCount),
    );
    this.heatRingOptions = options.heatRing;
    this.collectorBeaconRespawnTicks = Math.max(
      1,
      Math.ceil(COLLECTOR_BEACON_RESPAWN_SECONDS * this.fixedStepHz),
    );
    this.now = options.now ?? Date.now;
    this.onAuthoritativeLifeEnded = options.onAuthoritativeLifeEnded;
    this.paceId = options.paceId ?? DEFAULT_GAME_PACE_ID;
    const pace = getGamePaceProfile(this.paceId);
    this.state = createGameState(
      `room:${id}`,
      {
        fixedStepSeconds: 1 / this.fixedStepHz,
        arenaRadius: Math.max(
          600,
          options.arenaRadius ?? LIVE_SPATIAL_PROFILE.arenaRadius,
        ),
        baseSpeed: pace.baseSpeed,
        boostSpeed: pace.boostSpeed,
        spawnShieldSeconds: 1.5,
        maximumDeathDrops: 64,
        dropRadius: 5.2,
      },
      options.board,
    );

    const roster = spawnBotRoster(this.state, this.targetPopulation);
    Object.assign(this.botProviders, roster.providers);
    this.seedArenaDrops();
    this.spawnCollectorBeacon();
    this.pirateRelics = new PirateRelicDirector(this.state);
    for (const drop of this.publicDrops()) this.broadcastDrops.set(drop.id, drop);
  }

  start(): void {
    if (this.timer) return;
    this.schedulerLastMs = performance.now();
    this.schedulerAccumulatorMs = 0;
    this.lastSnapshotTick = this.state.tick;
    this.lastPresenceTick = this.state.tick;
    this.timer = setInterval(() => this.schedulerWake(), SCHEDULER_WAKE_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.schedulerAccumulatorMs = 0;
    for (const session of this.sessionsByToken.values()) {
      session.socket?.close(1001, "Room stopped");
    }
    this.sessionsByToken.clear();
    this.sessionsByPlayer.clear();
  }

  /** Reconnect-grace reservations count as occupied human seats. */
  canAcceptNewHuman(): boolean {
    return this.sessionsByToken.size < this.maxHumanPlayers;
  }

  join(
    socket: WebSocket,
    message: JoinMessage,
    identity: AuthenticatedArenaJoin = {},
  ): JoinResult {
    if (message.reconnectToken) {
      const existing = this.sessionsByToken.get(message.reconnectToken);
      if (!existing || this.isExpired(existing)) {
        return {
          error: {
            type: "error",
            code: "INVALID_RECONNECT_TOKEN",
            message: "That reconnect token is invalid or expired.",
          },
        };
      }
      if (existing.socket && existing.socket.readyState === existing.socket.OPEN) {
        return {
          error: { type: "error", code: "TOKEN_IN_USE", message: "That player is already connected." },
        };
      }
      if (existing.accountId && existing.accountId !== identity.accountId) {
        return {
          error: {
            type: "error",
            code: "INVALID_RECONNECT_TOKEN",
            message: "That reconnect token is invalid or expired.",
          },
        };
      }

      existing.socket = socket;
      existing.accountId ??= identity.accountId;
      existing.disconnectedAtMs = undefined;
      const player = this.state.players[existing.playerId];
      existing.name = message.name || existing.name;
      if (message.themeId) existing.themeId = message.themeId;
      if (message.presenceV1 === true) existing.presenceV1 = true;
      if (message.snapshotTupleV1 === true) existing.snapshotTupleV1 = true;
      if (player) player.name = existing.name;
      this.sendWelcome(existing, true);
      this.sendWorld(existing);
      this.broadcastPresence();
      this.broadcastSnapshot();
      return { session: existing };
    }

    // Reconnect-grace sessions retain their seat. This fails closed instead of
    // spawning an unbounded human while a disconnected captain can still return.
    if (this.sessionsByToken.size >= this.maxHumanPlayers) {
      return {
        error: {
          type: "error",
          code: "ROOM_FULL",
          message: `This room is full (${this.maxHumanPlayers} human captains). Try another room or reconnect with your existing token.`,
        },
      };
    }

    if (this.heatRing?.active) {
      this.pendingEvents.push(...this.heatRing.abort("second-human"));
    }
    this.benchOneBot();
    this.humanNumber += 1;
    const playerId = `human-${this.humanNumber}`;
    const token = randomBytes(24).toString("base64url");
    spawnPlayer(this.state, {
      id: playerId,
      name: message.name ?? `Guest ${this.humanNumber}`,
      kind: "human",
      shieldSeconds: this.state.config.spawnShieldSeconds,
    });

    const session: Session = {
      token,
      playerId,
      name: message.name ?? `Guest ${this.humanNumber}`,
      themeId: message.themeId ?? DEFAULT_COSMETIC_THEME_ID,
      presenceV1: message.presenceV1 === true,
      snapshotTupleV1: message.snapshotTupleV1 === true,
      socket,
      lastAcceptedSequence: -1,
      accountId: identity.accountId,
      lifeId: randomBytes(16).toString("base64url"),
    };
    this.sessionsByToken.set(token, session);
    this.sessionsByPlayer.set(playerId, session);
    if (!this.heatRingUsed) {
      this.heatRingUsed = true;
      this.heatRing = HeatRingController.prepare(
        this.state,
        playerId,
        this.botProviders,
        this.heatRingOptions,
      );
      if (this.heatRing) this.pendingEvents.push(this.heatRing.startedEvent());
    }
    this.sendWelcome(session, false);
    this.sendWorld(session);
    this.broadcastPresence();
    this.broadcastSnapshot();
    return { session };
  }

  disconnect(session: Session, socket: WebSocket): void {
    if (session.socket !== socket) return;
    session.socket = undefined;
    session.disconnectedAtMs = this.now();
    if (this.heatRing?.active && session.playerId === this.heatRing.firstHumanId) {
      this.pendingEvents.push(...this.heatRing.abort("first-human-disconnected"));
    }

    const player = this.state.players[session.playerId];
    if (player) {
      session.lastAcceptedSequence += 1;
      session.latestInput = {
        sequence: session.lastAcceptedSequence,
        clientTick: this.state.tick,
        direction: { ...player.direction },
        boost: false,
      };
    }
  }

  acceptInput(session: Session, input: InputMessage): ErrorMessage | undefined {
    if (input.sequence <= session.lastAcceptedSequence) {
      return {
        type: "error",
        code: "STALE_INPUT",
        message: "Input sequence must increase monotonically.",
      };
    }
    if (input.sequence - session.lastAcceptedSequence > 10_000) {
      return {
        type: "error",
        code: "RATE_LIMITED",
        message: "Input sequence jump is too large.",
      };
    }

    session.lastAcceptedSequence = input.sequence;
    session.latestInput = {
      sequence: input.sequence,
      clientTick: input.clientTick,
      direction: { ...input.direction },
      boost: input.boost,
    };
    return undefined;
  }

  send(session: Session, message: ServerMessage): void {
    const socket = session.socket;
    if (socket?.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  }

  private sendEncoded(session: Session, encoded: string, allowBackpressureSkip = false): void {
    const socket = session.socket;
    if (socket?.readyState !== 1) return;
    if (allowBackpressureSkip && socket.bufferedAmount > MAX_SNAPSHOT_BUFFER_BYTES) return;
    socket.send(encoded);
  }

  private schedulerWake(): void {
    const now = performance.now();
    const stepMilliseconds = 1_000 / this.fixedStepHz;
    const elapsed = Math.max(0, Math.min(250, now - this.schedulerLastMs));
    this.schedulerLastMs = now;
    this.schedulerAccumulatorMs += elapsed;

    let steps = 0;
    while (this.schedulerAccumulatorMs >= stepMilliseconds && steps < MAX_CATCH_UP_STEPS) {
      if (this.simulationStep()) return;
      this.schedulerAccumulatorMs -= stepMilliseconds;
      steps += 1;
      // Preserve the published snapshot cadence across a delayed scheduler
      // wake. Publishing only after the full catch-up batch silently collapsed
      // multiple due frames even though the authoritative ticks were retained.
      if (this.state.tick - this.lastSnapshotTick >= this.snapshotEveryTicks) {
        this.lastSnapshotTick = this.state.tick;
        if (this.state.tick - this.lastPresenceTick >= this.presenceEveryTicks) {
          this.lastPresenceTick = this.state.tick;
          this.broadcastPresence();
        }
        this.broadcastSnapshot();
      }
    }
    if (steps === MAX_CATCH_UP_STEPS) {
      this.schedulerAccumulatorMs = Math.min(this.schedulerAccumulatorMs, stepMilliseconds);
    }
  }

  /** Returns true when this step retired the room through its idle callback. */
  private simulationStep(): boolean {
    if (this.expireDisconnectedSessions()) return true;
    if (this.heatRing?.active) {
      this.pendingEvents.push(...this.heatRing.validateBeforeStep());
    }
    this.respawnReleasedPlayers();
    const humanInputs: Record<string, PlayerInput> = {};
    for (const session of this.sessionsByToken.values()) {
      if (session.latestInput && this.state.players[session.playerId]?.alive) {
        humanInputs[session.playerId] = session.latestInput;
      }
    }

    const previousDropIds = this.heatRing?.active
      ? new Set(this.state.drops.map((drop) => drop.id))
      : new Set<string>();
    const result = stepGame(
      this.state,
      humanInputs as PlayerInputMap,
      this.botProviders,
    );
    this.recordAuthoritativeLifeEnds(result.events);
    this.pendingEvents.push(...result.events);
    if (this.heatRing?.active) {
      this.pendingEvents.push(...this.heatRing.reconcileStep(result.events, previousDropIds));
    }
    this.reconcileCollectorBeacon(result.events);
    this.pirateRelics.reconcile(result.events);
    const relocatedTreasure = expireAmbientTreasure(this.state);
    if (relocatedTreasure > 0) this.seedArenaDrops();
    // Refill in bounded batches. The shared deficit is part of the spatial and
    // payload contract: 600 is the target and 552 is the lowest ordinary
    // refill point, leaving room for transient body-shaped death hoards.
    if (
      this.state.drops.length <
      this.targetDropCount - LIVE_SPATIAL_PROFILE.maximumDropRefillDeficit
    ) this.seedArenaDrops();
    return false;
  }

  private snapshot(): SnapshotMessage {
    const players: PublicPlayerState[] = Object.values(this.state.players)
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((player) => ({
        id: player.id,
        name: player.name,
        kind: player.kind,
        connected: player.kind === "bot" || Boolean(this.sessionsByPlayer.get(player.id)?.socket),
        alive: player.alive,
        position: { ...player.position },
        direction: { ...player.direction },
        body: player.body.map((segment) => ({ ...segment })),
        mass: player.mass,
        kills: player.stats.kills,
        score: calculateScore(player, this.state.config),
        shieldTicksRemaining: player.shieldTicksRemaining,
        boosting: isPlayerBoosting(player, this.state.config),
        // Only human sessions own authored public cosmetics. Bots intentionally
        // omit themeId so clients retain their deterministic varied palettes.
        themeId: this.sessionsByPlayer.get(player.id)?.themeId,
        specialist: player.specialist ? { ...player.specialist } : undefined,
      }));

    const currentDrops = this.publicDrops();
    const currentDropIds = new Set(currentDrops.map((drop) => drop.id));
    const dropUpserts = currentDrops.filter((drop) => !this.broadcastDrops.has(drop.id));
    const removedDropIds = [...this.broadcastDrops.keys()].filter((id) => !currentDropIds.has(id));
    this.broadcastDrops.clear();
    for (const drop of currentDrops) this.broadcastDrops.set(drop.id, drop);

    const message: SnapshotMessage = {
      type: "snapshot",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId: this.id,
      tick: this.state.tick,
      serverTimeMs: this.now(),
      players,
      dropUpserts,
      removedDropIds,
      events: this.pendingEvents,
      chargingStations: Object.values(this.state.chargingStations)
        .sort((first, second) => first.stationId.localeCompare(second.stationId))
        .map((station) => ({ ...station })),
    };
    this.pendingEvents = [];
    return message;
  }

  private presence(): PresenceMessage {
    const players: PublicPlayerPresence[] = Object.values(this.state.players)
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((player) => ({
        id: player.id,
        name: player.name,
        kind: player.kind,
        connected: player.kind === "bot" || Boolean(this.sessionsByPlayer.get(player.id)?.socket),
        alive: player.alive,
        position: { ...player.position },
        mass: player.mass,
        kills: player.stats.kills,
        score: calculateScore(player, this.state.config),
      }));
    return {
      type: "presence",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId: this.id,
      tick: this.state.tick,
      players,
    };
  }

  private broadcastPresence(): void {
    const encoded = JSON.stringify(packPresenceForWire(this.presence()));
    for (const session of this.sessionsByToken.values()) {
      if (!session.presenceV1) continue;
      this.sendEncoded(session, encoded, true);
    }
  }

  private broadcastSnapshot(): void {
    const snapshot = this.snapshot();
    const interestIndex = createSnapshotInterestIndex(snapshot, this.playerInterestRadius);
    const tuplePlayersById = [...this.sessionsByToken.values()].some(
        (session) => session.snapshotTupleV1,
      )
      ? new Map(snapshot.players.map((player) => [player.id, packPublicPlayerTupleForWire(player)]))
      : undefined;
    const carriesWorldDelta = snapshot.dropUpserts.length > 0 || snapshot.removedDropIds.length > 0;
    for (const session of this.sessionsByToken.values()) {
      const scopedSnapshot = session.presenceV1
        ? scopeSnapshotForPlayer(
            snapshot,
            session.playerId,
            this.playerInterestRadius,
            interestIndex,
          )
        : snapshot;
      const encoded = JSON.stringify(
        session.snapshotTupleV1
          ? packSnapshotTupleForWire(scopedSnapshot, tuplePlayersById)
          : packSnapshotForWire(scopedSnapshot),
      );
      // A skipped dynamic player frame is self-healing because the next frame
      // is complete. A skipped collectible delta is not, so delta-bearing
      // frames always remain ordered on the socket even under backpressure.
      this.sendEncoded(session, encoded, !carriesWorldDelta);
    }
  }

  private sendWelcome(session: Session, reconnected: boolean): void {
    const message: WelcomeMessage = {
      type: "welcome",
      protocolVersion: PROTOCOL_VERSION,
      buildRevision: SERVER_BUILD_REVISION,
      authority: "server",
      roomId: this.id,
      playerId: session.playerId,
      reconnectToken: session.token,
      reconnected,
      tick: this.state.tick,
      fixedStepSeconds: this.state.config.fixedStepSeconds,
      lastAcceptedSequence: session.lastAcceptedSequence,
    };
    this.send(session, message);
  }

  private sendWorld(session: Session): void {
    const message: WorldMessage = {
      type: "world",
      protocolVersion: PROTOCOL_VERSION,
      authority: "server",
      roomId: this.id,
      tick: this.state.tick,
      arenaRadius: this.state.config.arenaRadius,
      collisionRadii: {
        baseRadius: this.state.config.baseRadius,
        massRadiusFactor: this.state.config.massRadiusFactor,
        bodyRadiusFactor: this.state.config.bodyRadiusFactor,
      },
      drops: this.publicDrops(),
      board: {
        id: this.state.board.id,
        name: this.state.board.name,
        chargingStations: this.state.board.chargingStations.map((station) => ({
          ...station,
          position: { ...station.position },
        })),
      },
      pace: {
        id: this.paceId,
        name: getGamePaceProfile(this.paceId).name,
        baseSpeed: this.state.config.baseSpeed,
        boostSpeed: this.state.config.boostSpeed,
      },
      heatRing: this.heatRing?.active ? this.heatRing.descriptor : undefined,
    };
    this.sendEncoded(session, JSON.stringify(message));
  }

  private publicDrops(): PublicDropState[] {
    return this.state.drops.map((drop) => {
      const mixedOrigin =
        (drop.source === "boost" || drop.source === "death") &&
        drop.originPlayerId === undefined;
      return {
        id: drop.id,
        position: { ...drop.position },
        mass: drop.mass,
        radius: drop.radius,
        source: drop.source,
        ...(drop.expiresAtTick !== undefined
          ? { spawnedAtTick: drop.spawnedAtTick, expiresAtTick: drop.expiresAtTick }
          : {}),
        originPlayerId: mixedOrigin ? MIXED_ECHO_ORIGIN_ID : drop.originPlayerId,
        ...(mixedOrigin ? { mixedOrigin: true as const } : {}),
        specialist: drop.specialist,
        specialistDurationTicks: drop.specialistDurationTicks,
        relicKind: drop.relicKind,
        relicDurationTicks: drop.relicDurationTicks,
        relicTier: drop.relicTier,
      };
    });
  }

  private reconcileCollectorBeacon(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === "specialistActivated" && event.specialist === "collector") {
        this.nextCollectorBeaconTick = Math.max(
          this.nextCollectorBeaconTick ?? 0,
          event.tick + event.durationTicks + this.collectorBeaconRespawnTicks,
        );
      }
      if (event.type === "specialistExpired" && event.specialist === "collector") {
        this.nextCollectorBeaconTick = Math.max(
          this.nextCollectorBeaconTick ?? 0,
          event.tick + this.collectorBeaconRespawnTicks,
        );
      }
    }

    // One beacon in a 1450-unit arena shared by thirty-odd worms meant a
    // player could go whole matches without ever seeing a power-up - measured
    // live, not one of 32 players held a specialist across 45 seconds of play.
    // Scale the field with the population so the reward layer is actually part
    // of the game, while keeping the per-beacon respawn discipline intact.
    const target = this.targetCollectorBeaconCount();
    if (this.groundCollectorBeaconCount() >= target) return;

    this.nextCollectorBeaconTick ??= this.state.tick + this.collectorBeaconRespawnTicks;
    if (this.state.tick < this.nextCollectorBeaconTick) return;
    this.spawnCollectorBeacon();
    this.nextCollectorBeaconTick = undefined;
  }

  private targetCollectorBeaconCount(): number {
    const alive = Object.values(this.state.players).filter((player) => player.alive).length;
    return Math.max(1, Math.min(6, Math.ceil(alive / 6)));
  }

  private groundCollectorBeaconCount(): number {
    return this.state.drops.reduce(
      (total, drop) => total + (drop.specialist === "collector" ? 1 : 0),
      0,
    );
  }

  private hasGroundCollectorBeacon(): boolean {
    return this.groundCollectorBeaconCount() > 0;
  }

  private spawnCollectorBeacon(): void {
    if (this.groundCollectorBeaconCount() >= this.targetCollectorBeaconCount()) return;
    const point = randomPointInCircle(
      this.state.randomState,
      Math.max(1, this.state.config.arenaRadius - 140),
    );
    this.state.randomState = point.state;
    this.collectorBeaconNumber += 1;
    spawnDrop(this.state, {
      id: `collector-beacon-${this.collectorBeaconNumber}`,
      position: point.value,
      mass: 0,
      radius: COLLECTOR_BEACON_RADIUS,
      source: "arena",
      specialist: "collector",
    });
  }

  private benchOneBot(): void {
    const id = Object.keys(this.botProviders)
      .filter((candidate) => !this.heatRing?.isHeatBot(candidate))
      .sort()
      .at(-1);
    if (!id) return;
    const player = this.state.players[id];
    const provider = this.botProviders[id];
    if (!player || !provider) return;

    this.botPool.push({ id, name: player.name, provider });
    delete this.botProviders[id];
    delete this.state.players[id];
  }

  private restoreBackfill(): void {
    while (Object.keys(this.state.players).length < this.targetPopulation) {
      const benched = this.botPool.pop();
      if (!benched) break;
      spawnPlayer(this.state, {
        id: benched.id,
        name: benched.name,
        kind: "bot",
        shieldSeconds: this.state.config.spawnShieldSeconds,
      });
      this.botProviders[benched.id] = benched.provider;
    }
  }

  private seedArenaDrops(): void {
    const safeRadius = this.state.config.arenaRadius - 70;
    while (this.state.drops.length < this.targetDropCount) {
      const point = randomPointInCircle(this.state.randomState, safeRadius);
      this.state.randomState = point.state;
      const massRoll = randomPointInCircle(this.state.randomState, 1);
      this.state.randomState = massRoll.state;
      spawnDrop(this.state, {
        position: point.value,
        mass: selectNeutralTreasureMass(massRoll.value.x, massRoll.value.y),
        radius: 4 + Math.abs(massRoll.value.y) * 3,
        source: "arena",
        lifetimeTicks: ambientTreasureLifetimeTicks(
          this.state.nextEntityNumber,
          this.state.config.fixedStepSeconds,
        ),
      });
    }
  }

  private respawnReleasedPlayers(): void {
    const respawnAfterTicks = Math.max(1, Math.round(this.fixedStepHz * 1.6));
    for (const player of Object.values(this.state.players)) {
      if (player.alive || player.diedAtTick === undefined) continue;
      if (this.state.tick - player.diedAtTick < respawnAfterTicks) continue;
      const session = this.sessionsByPlayer.get(player.id);
      if (player.kind === "human" && !session?.socket) continue;
      const name = session?.name ?? player.name;
      const kind = player.kind;
      delete this.state.players[player.id];
      spawnPlayer(this.state, {
        id: player.id,
        name,
        kind,
        shieldSeconds: this.state.config.spawnShieldSeconds,
      });
      if (session) session.lifeId = randomBytes(16).toString("base64url");
    }
  }

  private recordAuthoritativeLifeEnds(events: readonly GameEvent[]) {
    if (!this.onAuthoritativeLifeEnded) return;
    for (const event of events) {
      if (event.type !== "playerDied") continue;
      const session = this.sessionsByPlayer.get(event.playerId);
      const player = this.state.players[event.playerId];
      if (!session?.accountId || !player || player.kind !== "human") continue;
      const result: AuthoritativeLifeResult = {
        accountId: session.accountId,
        idempotencyKey: `passport-life:${this.id}:${session.lifeId}`,
        roomId: this.id,
        lifeId: session.lifeId,
        finalScore: calculateScore(player, this.state.config),
        kills: player.stats.kills,
        rank: getPlayerRank(this.state, player.id, "score", true) ?? 1,
        peakMass: player.stats.peakMass,
        rulesetVersion: `protocol-${PROTOCOL_VERSION}`,
        occurredAtMs: this.now(),
      };
      try {
        this.onAuthoritativeLifeEnded(result);
      } catch {
        // Identity/progression storage must fail closed without stopping the
        // public simulation. The idempotency key permits an operator retry.
      }
    }
  }

  private isExpired(session: Session): boolean {
    return session.disconnectedAtMs !== undefined &&
      this.now() - session.disconnectedAtMs > this.reconnectGraceMs;
  }

  private expireDisconnectedSessions(): boolean {
    let expiredSession = false;
    for (const session of [...this.sessionsByToken.values()]) {
      if (!this.isExpired(session)) continue;
      expiredSession = true;
      this.sessionsByToken.delete(session.token);
      this.sessionsByPlayer.delete(session.playerId);
      delete this.state.players[session.playerId];
    }

    if (expiredSession && this.sessionsByToken.size === 0 && this.onIdle) {
      this.onIdle(this);
      return true;
    }

    this.restoreBackfill();
    return false;
  }
}

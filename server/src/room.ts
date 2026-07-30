import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import type WebSocket from "ws";

import {
  calculateScore,
  createGameState,
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
  PROTOCOL_VERSION,
  packSnapshotForWire,
  type AuthoritativeEvent,
  type ErrorMessage,
  type InputMessage,
  type JoinMessage,
  type PublicDropState,
  type PublicPlayerState,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "./protocol.ts";

const MAX_SNAPSHOT_BUFFER_BYTES = 256 * 1024;
const SCHEDULER_WAKE_MS = 4;
const MAX_CATCH_UP_STEPS = 4;

/** Published room cadence: replacement appears five seconds after effect expiry. */
export const COLLECTOR_BEACON_RESPAWN_SECONDS = 5;
export const COLLECTOR_BEACON_RADIUS = 9;

interface Session {
  token: string;
  playerId: string;
  name: string;
  themeId: CosmeticThemeId;
  socket?: WebSocket;
  lastAcceptedSequence: number;
  latestInput?: PlayerInput;
  disconnectedAtMs?: number;
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
  reconnectGraceMs?: number;
  arenaRadius?: number;
  targetDropCount?: number;
  /** Opt-in board profile. Omit it to preserve the station-free open arena. */
  board?: Readonly<GameBoardConfig>;
  heatRing?: false | Partial<HeatRingConfig>;
  now?: () => number;
}

export interface JoinResult {
  session?: Session;
  error?: ErrorMessage;
}

export class ArenaRoom {
  readonly state: GameState;

  private readonly targetPopulation: number;
  private readonly maxHumanPlayers: number;
  private readonly fixedStepHz: number;
  private readonly snapshotEveryTicks: number;
  private readonly reconnectGraceMs: number;
  private readonly targetDropCount: number;
  private readonly heatRingOptions: false | Partial<HeatRingConfig> | undefined;
  private readonly collectorBeaconRespawnTicks: number;
  private readonly pirateRelics: PirateRelicDirector;
  private readonly now: () => number;
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
    this.targetPopulation = Math.max(0, Math.floor(options.targetPopulation ?? 24));
    this.maxHumanPlayers = Math.max(1, Math.floor(options.maxHumanPlayers ?? 24));
    this.fixedStepHz = Math.max(1, Math.floor(options.fixedStepHz ?? 30));
    const snapshotHz = Math.max(1, Math.floor(options.snapshotHz ?? 15));
    this.snapshotEveryTicks = Math.max(1, Math.round(this.fixedStepHz / snapshotHz));
    this.reconnectGraceMs = Math.max(100, options.reconnectGraceMs ?? 15_000);
    this.targetDropCount = Math.max(0, Math.floor(options.targetDropCount ?? 720));
    this.heatRingOptions = options.heatRing;
    this.collectorBeaconRespawnTicks = Math.max(
      1,
      Math.ceil(COLLECTOR_BEACON_RESPAWN_SECONDS * this.fixedStepHz),
    );
    this.now = options.now ?? Date.now;
    this.state = createGameState(
      `room:${id}`,
      {
        fixedStepSeconds: 1 / this.fixedStepHz,
        arenaRadius: Math.max(600, options.arenaRadius ?? 1_850),
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

  join(socket: WebSocket, message: JoinMessage): JoinResult {
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

      existing.socket = socket;
      existing.disconnectedAtMs = undefined;
      const player = this.state.players[existing.playerId];
      existing.name = message.name || existing.name;
      if (message.themeId) existing.themeId = message.themeId;
      if (player) player.name = existing.name;
      this.sendWelcome(existing, true);
      this.sendWorld(existing);
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
      socket,
      lastAcceptedSequence: -1,
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
    this.pendingEvents.push(...result.events);
    if (this.heatRing?.active) {
      this.pendingEvents.push(...this.heatRing.reconcileStep(result.events, previousDropIds));
    }
    this.reconcileCollectorBeacon(result.events);
    this.pirateRelics.reconcile(result.events);
    if (this.state.drops.length < this.targetDropCount - 48) this.seedArenaDrops();
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

  private broadcastSnapshot(): void {
    const snapshot = this.snapshot();
    const encoded = JSON.stringify(packSnapshotForWire(snapshot));
    const carriesWorldDelta = snapshot.dropUpserts.length > 0 || snapshot.removedDropIds.length > 0;
    for (const session of this.sessionsByToken.values()) {
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
      heatRing: this.heatRing?.active ? this.heatRing.descriptor : undefined,
    };
    this.sendEncoded(session, JSON.stringify(message));
  }

  private publicDrops(): PublicDropState[] {
    return this.state.drops.map((drop) => ({
      id: drop.id,
      position: { ...drop.position },
      mass: drop.mass,
      radius: drop.radius,
      source: drop.source,
      originPlayerId: drop.originPlayerId,
      specialist: drop.specialist,
      specialistDurationTicks: drop.specialistDurationTicks,
      relicKind: drop.relicKind,
      relicDurationTicks: drop.relicDurationTicks,
    }));
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

    if (this.hasGroundCollectorBeacon()) return;
    if (Object.values(this.state.players).some((player) =>
      isSpecialistActive(this.state, player, "collector")
    )) return;

    this.nextCollectorBeaconTick ??= this.state.tick + this.collectorBeaconRespawnTicks;
    if (this.state.tick < this.nextCollectorBeaconTick) return;
    this.spawnCollectorBeacon();
    this.nextCollectorBeaconTick = undefined;
  }

  private hasGroundCollectorBeacon(): boolean {
    return this.state.drops.some((drop) => drop.specialist === "collector");
  }

  private spawnCollectorBeacon(): void {
    if (this.hasGroundCollectorBeacon()) return;
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
        mass: 1.5 + Math.abs(massRoll.value.x) * 4.5,
        radius: 4 + Math.abs(massRoll.value.y) * 3,
        source: "arena",
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

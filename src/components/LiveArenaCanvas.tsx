import { useCallback, useEffect, useRef, useState } from "react";
import { PROTOCOL_VERSION } from "../../server/src/protocol";
import type {
  ErrorMessage,
  PublicDropState,
  PublicPlayerState,
  ServerMessage,
  SnapshotMessage,
  WelcomeMessage,
  WorldMessage,
} from "../../server/src/protocol";
import { getBodyRadius, getPlayerRadius } from "../game/core";
import type { CollisionRadiusConfig, Vec2 } from "../game/types";
import {
  ArenaTutorial,
  SPRINT_SIZE_COST_PER_SECOND,
  useArenaTutorial,
} from "./ArenaTutorial";

const EXPECTED_PROTOCOL_VERSION = PROTOCOL_VERSION;
const DEFAULT_ARENA_WS_URL = "ws://127.0.0.1:8080";
const INPUT_INTERVAL_MS = 50;

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
  onExit: () => void;
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
  leaderboard: PublicPlayerState[];
  position: Vec2;
  exactMass: number;
  collisionHeadRadius: number;
  collisionBodyRadius: number;
  collisionRadii: CollisionRadiusConfig;
  alive: boolean;
  collectorRemaining: number;
  neutralSparks: number;
  sprintDrops: number;
  rivalRemains: number;
  collectorBeacons: number;
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
}

interface TouchGuide {
  pointerId: number;
  anchorX: number;
  anchorY: number;
  currentX: number;
  currentY: number;
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

function configuredRoomId() {
  const requested = new URLSearchParams(window.location.search).get("room") ?? "public-1";
  return /^[a-z0-9-]{1,32}$/u.test(requested) ? requested : "public-1";
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
  return value.kind === "collector" &&
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
    (value.specialist === undefined || isActiveCollector(value.specialist));
}

function isPublicDrop(value: unknown): value is PublicDropState {
  if (!isRecord(value)) return false;
  const baseValid = typeof value.id === "string" &&
    isVec2(value.position) &&
    typeof value.mass === "number" && Number.isFinite(value.mass) && value.mass >= 0 &&
    typeof value.radius === "number" && Number.isFinite(value.radius) && value.radius > 0 &&
    (value.source === "arena" || value.source === "boost" || value.source === "death") &&
    (value.originPlayerId === undefined || (typeof value.originPlayerId === "string" && value.originPlayerId.length > 0));
  if (!baseValid) return false;
  if (value.specialist === "collector") {
    return value.source === "arena" && value.mass === 0 && value.originPlayerId === undefined &&
      typeof value.specialistDurationTicks === "number" &&
      Number.isSafeInteger(value.specialistDurationTicks) &&
      value.specialistDurationTicks > 0;
  }
  if (value.specialist !== undefined || value.specialistDurationTicks !== undefined) return false;
  return value.source === "arena" ? value.originPlayerId === undefined : typeof value.originPlayerId === "string";
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
    Array.isArray(value.events);
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
    Array.isArray(value.drops) && value.drops.every(isPublicDrop);
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
    mass: 100,
    length: 0,
    rank: 1,
    leaderboard: [],
    position: { x: 0, y: 0 },
    exactMass: 100,
    collisionHeadRadius: 0,
    collisionBodyRadius: 0,
    collisionRadii: { baseRadius: 0, massRadiusFactor: 0, bodyRadiusFactor: 0 },
    alive: false,
    collectorRemaining: 0,
    neutralSparks: 0,
    sprintDrops: 0,
    rivalRemains: 0,
    collectorBeacons: 0,
  };
}

export function LiveArenaCanvas({
  playerName,
  running,
  session,
  onExit,
}: LiveArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const snapshotRef = useRef<SnapshotMessage | null>(null);
  const worldRef = useRef<LiveWorldState | null>(null);
  const handshakeRef = useRef<AuthorityHandshake | null>(null);
  const directionRef = useRef<Vec2>({ x: 1, y: 0 });
  const boostRef = useRef(false);
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
  const sequenceRef = useRef(-1);
  const cameraRef = useRef<Vec2>({ x: 0, y: 0 });
  const debugHitboxesRef = useRef(new URLSearchParams(window.location.search).get("hitboxes") === "1");
  const [boosting, setBoosting] = useState(false);
  const [touchGuide, setTouchGuide] = useState<TouchGuide | null>(null);
  const [deathNotice, setDeathNotice] = useState<string | null>(null);
  const roomId = configuredRoomId();
  const arenaUrl = configuredArenaUrl();
  const [ui, setUi] = useState<LiveUiState>(() => initialUi(roomId));
  const tutorial = useArenaTutorial(running, `${session}:${roomId}`);

  const recordMeaningfulSteer = useCallback((direction: Vec2) => {
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
  }, [tutorial.meaningfulSteer]);

  useEffect(() => {
    tutorialSparkIdRef.current = null;
    tutorialRetargetRef.current = { count: 0 };
    tutorialTargetTrackingRef.current = {};
  }, [roomId, session]);

  const pressSprint = useCallback(() => {
    boostRef.current = true;
    setBoosting(true);
    tutorial.pressedSprint();
  }, [tutorial.pressedSprint]);

  const releaseSprint = useCallback(() => {
    boostRef.current = false;
    setBoosting(false);
    tutorial.releasedSprint();
  }, [tutorial.releasedSprint]);

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
    const leaderboard = rankedPlayers.slice(0, 6);
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
    const collisionHeadRadius = ownPlayer ? getPlayerRadius(ownPlayer, world.collisionRadii) : 0;
    const collisionBodyRadius = ownPlayer ? getBodyRadius(ownPlayer, world.collisionRadii) : 0;
    const collectorRemaining = ownPlayer?.specialist?.kind === "collector"
      ? Math.max(0, ownPlayer.specialist.expiresAtTick - snapshot.tick) * world.fixedStepSeconds
      : 0;
    const drops = [...world.drops.values()];
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
      leaderboard,
      position: ownPlayer ? { ...ownPlayer.position } : { x: 0, y: 0 },
      exactMass: ownPlayer?.mass ?? 0,
      collisionHeadRadius,
      collisionBodyRadius,
      collisionRadii: world.collisionRadii,
      alive: ownPlayer?.alive ?? false,
      collectorRemaining,
      neutralSparks: drops.filter((drop) => drop.source === "arena" && !drop.specialist).length,
      sprintDrops: drops.filter((drop) => drop.source === "boost").length,
      rivalRemains: drops.filter((drop) => drop.source === "death").length,
      collectorBeacons: drops.filter((drop) => drop.specialist === "collector").length,
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    let disposed = false;
    let reconnectTimer: number | undefined;
    let attempts = 0;
    const storageKey = reconnectStorageKey(arenaUrl, roomId);

    const connect = () => {
      if (disposed) return;
      const reconnecting = attempts > 0;
      handshakeRef.current = null;
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

      const sendJoin = (reconnectToken?: string) => {
        socket.send(JSON.stringify({
          type: "join",
          roomId,
          name: playerName || "Guest",
          ...(reconnectToken ? { reconnectToken } : {}),
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
          message = JSON.parse(event.data) as ServerMessage;
        } catch {
          setUi((current) => ({
            ...current,
            phase: "error",
            detail: "The arena sent an unreadable message.",
            lastError: "BAD_JSON_FROM_SERVER",
          }));
          return;
        }

        if (isWelcome(message) && message.roomId === roomId) {
          safeSessionSet(storageKey, message.reconnectToken);
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

        if (isWorld(message) && message.roomId === roomId) {
          const handshake = handshakeRef.current;
          if (!handshake?.welcomed || message.roomId !== handshake.roomId) return;
          worldRef.current = {
            roomId: message.roomId,
            arenaRadius: message.arenaRadius,
            fixedStepSeconds: handshake.fixedStepSeconds,
            collisionRadii: { ...message.collisionRadii },
            drops: new Map(message.drops.map((drop) => [drop.id, drop])),
          };
          handshake.worldSynced = true;
          setUi((current) => ({
            ...current,
            phase: "joining",
            detail: "World sync confirmed · validating a fresh player snapshot…",
          }));
          return;
        }

        if (isSnapshot(message)) {
          const handshake = handshakeRef.current;
          const world = worldRef.current;
          if (!handshake?.welcomed || !handshake.worldSynced || message.roomId !== handshake.roomId) return;
          if (!world || world.roomId !== message.roomId) return;
          if (!message.players.some((player) => player.id === handshake.playerId)) return;
          for (const id of message.removedDropIds) world.drops.delete(id);
          for (const drop of message.dropUpserts) world.drops.set(drop.id, drop);
          for (const gameEvent of message.events) {
            if (gameEvent.type === "dropCollected" && gameEvent.playerId === handshake.playerId) {
              tutorial.collectedSpark(gameEvent.dropId, tutorialSparkIdRef.current);
            }
            if (gameEvent.type === "massShed" && gameEvent.playerId === handshake.playerId) {
              tutorial.spentSprint();
            }
            if (gameEvent.type === "specialistActivated" && gameEvent.playerId === handshake.playerId) {
              tutorial.sawCollector();
            }
            if (gameEvent.type === "playerDied" && gameEvent.playerId === handshake.playerId) {
              const killer = gameEvent.killerId
                ? message.players.find((player) => player.id === gameEvent.killerId)?.name
                : undefined;
              showDeathNotice(
                gameEvent.cause === "boundary"
                  ? "YOU CRASHED · YOUR HEAD HIT THE ARENA EDGE · RESPAWNING…"
                  : `YOU CRASHED · YOUR HEAD HIT ${killer ? `${killer.toUpperCase()}'S` : "A RIVAL"} CREW · RESPAWNING…`,
              );
            }
            if (
              gameEvent.type === "playerSpawned" &&
              gameEvent.playerId === handshake.playerId &&
              handshake.snapshotted
            ) {
              showDeathNotice("BACK IN · DOTTED HALO = SHORT SPAWN GRACE");
            }
          }
          if (tutorial.stageRef.current === "spark") {
            const ownPlayer = message.players.find((player) => player.id === handshake.playerId);
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
          handshake.snapshotted = true;
          snapshotRef.current = message;
          attempts = 0;
          updateFromSnapshot(message, handshake.playerId, world);
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
            sendJoin();
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
      worldRef.current = null;
    };
  }, [
    arenaUrl,
    playerName,
    roomId,
    running,
    session,
    showDeathNotice,
    tutorial.collectedSpark,
    tutorial.sawCollector,
    tutorial.spentSprint,
    tutorial.stageRef,
    updateFromSnapshot,
  ]);

  useEffect(() => () => {
    if (deathNoticeTimerRef.current !== undefined) window.clearTimeout(deathNoticeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      const handshake = handshakeRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !handshake?.welcomed) return;
      sequenceRef.current += 1;
      socket.send(JSON.stringify({
        type: "input",
        sequence: sequenceRef.current,
        clientTick: snapshotRef.current?.tick,
        direction: directionRef.current,
        boost: boostRef.current,
      }));
    }, INPUT_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [running, session]);

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
      const canvas = canvasRef.current;
      if (canvas) {
        renderLiveArena(
          canvas,
          snapshotRef.current,
          worldRef.current,
          ui.playerId,
          cameraRef.current,
          now,
          debugHitboxesRef.current,
          tutorialSparkIdRef.current,
        );
      }
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrame);
  }, [ui.playerId]);

  const setPointerDirection = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y);
    if (length < 8) return;
    const direction = { x: x / length, y: y / length };
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
    setPointerDirection(event.clientX, event.clientY);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!running || (event.target as HTMLElement).closest("button")) return;
    if (event.pointerType === "touch") {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const guide: TouchGuide = {
        pointerId: event.pointerId,
        anchorX: event.clientX - rect.left,
        anchorY: event.clientY - rect.top,
        currentX: event.clientX - rect.left,
        currentY: event.clientY - rect.top,
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
  return (
    <div
      ref={stageRef}
      className="arena-stage live-arena-stage"
      data-testid="live-arena-canvas"
      data-authority={authoritative ? "server-confirmed" : "unconfirmed"}
      data-player-count={ui.players}
      data-human-count={ui.humans}
      data-player-id={ui.playerId ?? ""}
      data-server-tick={ui.tick}
      data-player-x={Math.round(ui.position.x)}
      data-player-y={Math.round(ui.position.y)}
      data-player-mass={ui.exactMass}
      data-collision-head-radius={ui.collisionHeadRadius.toFixed(3)}
      data-collision-body-radius={ui.collisionBodyRadius.toFixed(3)}
      data-collision-base-radius={ui.collisionRadii.baseRadius}
      data-collision-mass-factor={ui.collisionRadii.massRadiusFactor}
      data-collision-body-factor={ui.collisionRadii.bodyRadiusFactor}
      data-collector-active={ui.collectorRemaining > 0 ? "true" : "false"}
      data-collector-seconds={ui.collectorRemaining.toFixed(1)}
      data-neutral-spark-count={ui.neutralSparks}
      data-sprint-drop-count={ui.sprintDrops}
      data-rival-remains-count={ui.rivalRemains}
      data-collector-beacon-count={ui.collectorBeacons}
      data-player-alive={ui.alive ? "true" : "false"}
      data-tutorial-stage={tutorial.stage}
      data-tutorial-target-id={tutorialSparkIdRef.current ?? ""}
      data-tutorial-sprint-spent={tutorial.sprintSpent ? "true" : "false"}
      data-tutorial-retarget-count={tutorialRetargetRef.current.count}
      data-tutorial-retarget-reason={tutorialRetargetRef.current.reason ?? ""}
      aria-label="Server-authoritative Wormifi multiplayer lab"
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
    >
      <canvas ref={canvasRef} aria-hidden="true" />

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
        <div className="hud-top">
          <div className="hud-pill hud-rank" data-testid="live-hud-rank">
            <small>SCORE RANK</small><strong>#{ui.rank}</strong>
          </div>
          <div className="hud-pill hud-size" data-testid="live-hud-score">
            <small>SCORE</small><strong>{ui.score.toLocaleString()}</strong>
          </div>
          <div className="hud-pill" data-testid="live-hud-length">
            <small>SIZE</small><strong>{ui.mass}</strong>
          </div>
        </div>

        <aside className="leaderboard live-leaderboard" aria-label="Live score leaderboard">
          <h2>SCORE RANK · LIVE</h2>
          <ol>
            {ui.leaderboard.map((player) => (
              <li key={player.id} className={player.id === ui.playerId ? "player" : ""}>
                <span className="name">
                  {player.name}
                  <em className={player.kind === "human" ? "human-tag" : "ai-tag"}>
                    {player.kind === "human" ? "HUMAN" : "AI"}
                  </em>
                </span>
                <span>{player.score}</span>
              </li>
            ))}
          </ol>
        </aside>

        <div
          className={`specialist-status ${ui.collectorRemaining > 0 ? "active" : ""}`}
          data-testid="live-collector-status"
          data-active={ui.collectorRemaining > 0 ? "true" : "false"}
        >
          <span className="specialist-icon">C</span>
          <span>
            <small>COLLECTOR</small>
            <strong>
              {ui.collectorRemaining > 0
                ? `${ui.collectorRemaining.toFixed(1)}S · PULLS SPARKS + YOUR SPRINT DROPS`
                : "FIND THE CYAN BEACON"}
            </strong>
          </span>
        </div>

        {authoritative && <ArenaTutorial stage={tutorial.stage} size={ui.mass} alreadyMoving />}

        <div className="mode-disclosure live-disclosure">
          {authoritative
            ? `MULTIPLAYER LAB · ${ui.humans} CONNECTED HUMAN${ui.humans === 1 ? "" : "S"} · AI LABELED`
            : "MULTIPLAYER LAB · NOT LIVE UNTIL SERVER SNAPSHOT IS CONFIRMED"}
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
        <div className="live-death-notice" data-testid="live-death-notice" role="status">
          {deathNotice}
        </div>
      )}

      <button className="exit-button" data-testid="live-exit-button" aria-label="Exit multiplayer lab" onClick={onExit}>×</button>
      <button
        className={`boost-control ${boosting ? "active" : ""}`}
        data-testid="live-boost-control"
        disabled={!authoritative || ui.mass <= 61}
        aria-label={`Sprint, burns ${SPRINT_SIZE_COST_PER_SECOND} size per second`}
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
        <span>SPRINT</span>
        <small>−{SPRINT_SIZE_COST_PER_SECOND} SIZE/S</small>
      </button>
    </div>
  );
}

function renderLiveArena(
  canvas: HTMLCanvasElement,
  snapshot: SnapshotMessage | null,
  world: LiveWorldState | null,
  playerId: string | undefined,
  camera: Vec2,
  now: number,
  debugHitboxes: boolean,
  tutorialSparkId: string | null,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;
  const pixelRatio = Math.min(1.75, window.devicePixelRatio || 1);
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const background = context.createRadialGradient(
    width * 0.45,
    height * 0.42,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height),
  );
  background.addColorStop(0, "#123153");
  background.addColorStop(0.55, "#081a34");
  background.addColorStop(1, "#020813");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const ownPlayer = snapshot?.players.find((player) => player.id === playerId);
  const focus = ownPlayer?.position ?? { x: 0, y: 0 };
  camera.x += (focus.x - camera.x) * 0.11;
  camera.y += (focus.y - camera.y) * 0.11;
  const zoom = clamp(Math.min(width, height) / 760, 0.68, 1.12) *
    clamp(1 - Math.max(0, (ownPlayer?.mass ?? 100) - 100) / 2_800, 0.67, 1);
  const worldToScreen = (point: Vec2): Vec2 => ({
    x: width / 2 + (point.x - camera.x) * zoom,
    y: height / 2 + (point.y - camera.y) * zoom,
  });

  drawNetworkGrid(context, width, height, camera, zoom, now);
  if (!snapshot || !world) {
    context.fillStyle = "rgba(213, 244, 255, 0.72)";
    context.font = "800 13px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("WAITING FOR AN AUTHORITATIVE SNAPSHOT", width / 2, height / 2);
    return;
  }

  const boundary = worldToScreen({ x: 0, y: 0 });
  context.save();
  context.strokeStyle = `rgba(255, 89, 130, ${0.38 + Math.sin(now * 0.004) * 0.1})`;
  context.lineWidth = Math.max(9, 28 * zoom);
  context.shadowColor = "#ff4d83";
  context.shadowBlur = 26;
  context.setLineDash([28 * zoom, 18 * zoom]);
  context.beginPath();
  context.arc(boundary.x, boundary.y, world.arenaRadius * zoom, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  for (const drop of world.drops.values()) {
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
  }
  const players = snapshot.players
    .filter((player) => player.alive)
    .sort((first, second) => first.mass - second.mass);
  for (const player of players) {
    drawNetworkChain(
      context,
      player,
      snapshot.tick,
      playerId,
      world.collisionRadii,
      worldToScreen,
      zoom,
      width,
      height,
      now,
      debugHitboxes,
    );
  }

  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.32,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,4,14,0.48)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function drawNetworkGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Vec2,
  zoom: number,
  now: number,
) {
  const spacing = 92 * zoom;
  const offsetX = ((-camera.x * zoom) % spacing + spacing) % spacing;
  const offsetY = ((-camera.y * zoom) % spacing + spacing) % spacing;
  context.fillStyle = "rgba(103, 203, 255, 0.07)";
  for (let x = offsetX; x < width; x += spacing) {
    for (let y = offsetY; y < height; y += spacing) {
      const pulse = 1.2 + Math.sin(now * 0.0008 + x * 0.02 + y * 0.014) * 0.55;
      context.beginPath();
      context.arc(x, y, pulse, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawNetworkCollectorFace(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  timerRatio = 1,
) {
  if (radius < 3) return;
  context.save();
  context.translate(x, y);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.clip();

  const gradient = context.createRadialGradient(
    -radius * 0.3,
    -radius * 0.38,
    radius * 0.05,
    0,
    0,
    radius,
  );
  gradient.addColorStop(0, "#e9fff8");
  gradient.addColorStop(0.22, "#71ffe2");
  gradient.addColorStop(1, "#159d9c");
  context.fillStyle = gradient;
  context.fillRect(-radius, -radius, radius * 2, radius * 2);

  context.strokeStyle = "rgba(3, 43, 55, .78)";
  context.lineWidth = Math.max(0.7, radius * 0.1);
  context.beginPath();
  context.moveTo(-radius * 0.48, -radius * 0.46);
  context.lineTo(-radius * 0.13, -radius * 0.38);
  context.moveTo(radius * 0.48, -radius * 0.46);
  context.lineTo(radius * 0.13, -radius * 0.38);
  context.stroke();

  context.fillStyle = "rgba(255,255,255,.97)";
  context.beginPath();
  context.ellipse(-radius * 0.29, -radius * 0.16, radius * 0.22, radius * 0.28, 0, 0, Math.PI * 2);
  context.ellipse(radius * 0.29, -radius * 0.16, radius * 0.22, radius * 0.28, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#042333";
  context.beginPath();
  context.arc(-radius * 0.24, -radius * 0.12, radius * 0.09, 0, Math.PI * 2);
  context.arc(radius * 0.34, -radius * 0.12, radius * 0.09, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(3, 36, 48, .88)";
  context.lineWidth = Math.max(0.8, radius * 0.1);
  context.beginPath();
  context.arc(0, radius * 0.18, radius * 0.34, 0.12 * Math.PI, 0.88 * Math.PI);
  context.stroke();

  context.strokeStyle = "rgba(229, 255, 249, .95)";
  context.lineWidth = Math.max(0.9, radius * 0.1);
  context.beginPath();
  context.arc(
    0,
    0,
    radius * 0.83,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * clamp(timerRatio, 0, 1),
  );
  context.stroke();

  if (radius >= 5.5) {
    context.fillStyle = "#06364a";
    context.beginPath();
    context.arc(0, radius * 0.66, radius * 0.19, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#dffff8";
    context.font = `900 ${Math.max(4, radius * 0.28)}px "Baloo 2", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("C", 0, radius * 0.68);
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
    : drop.originPlayerId
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
    context.font = "900 10px Inter, sans-serif";
    context.textAlign = "center";
    context.fillStyle = "#fff6b2";
    context.fillText("SPARK · GROW", 0, -ringRadius - 8);
    context.restore();
  }

  if (drop.specialist === "collector") {
    const beaconRadius = Math.max(10, radius * 1.25);
    context.shadowColor = color;
    context.shadowBlur = 24;
    context.fillStyle = "rgba(11, 46, 67, 0.96)";
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, beaconRadius * 0.14);
    context.beginPath();
    context.arc(0, 0, beaconRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.save();
    context.rotate(now * 0.0012);
    context.setLineDash([beaconRadius * 0.55, beaconRadius * 0.24]);
    context.strokeStyle = "rgba(184, 255, 244, 0.88)";
    context.lineWidth = Math.max(1.2, beaconRadius * 0.09);
    context.beginPath();
    context.arc(0, 0, beaconRadius * 1.42, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    drawNetworkCollectorFace(context, 0, 0, beaconRadius * 0.78);
    const durationSeconds = Math.round((drop.specialistDurationTicks ?? 0) * fixedStepSeconds);
    context.font = `900 ${clamp(9 * zoom, 8, 11)}px Inter, sans-serif`;
    context.textAlign = "center";
    context.fillStyle = "#cafff5";
    context.shadowColor = "rgba(0,0,0,.9)";
    context.shadowBlur = 5;
    context.fillText(`COLLECTOR · ${durationSeconds}S`, 0, -beaconRadius * 2.05);
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
    // Rival Remains remember their producer but never imply Collector reach.
    context.shadowColor = color;
    context.shadowBlur = 17;
    context.fillStyle = color;
    context.beginPath();
    for (let point = 0; point < 12; point += 1) {
      const angle = (point / 12) * Math.PI * 2 + now * 0.00035;
      const radial = point % 2 === 0 ? radius * 1.3 : radius * 0.64;
      const x = Math.cos(angle) * radial;
      const y = Math.sin(angle) * radial;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255,255,255,.58)";
    context.lineWidth = Math.max(0.8, radius * 0.11);
    context.setLineDash([radius * 0.55, radius * 0.34]);
    context.beginPath();
    context.arc(0, 0, radius * 1.7, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(4, 19, 35, .72)";
    context.beginPath();
    context.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  // Neutral Sparks are diamonds, visually separate from player-made drops.
  context.rotate(Math.PI / 4 + Math.sin(now * 0.0015 + stableNumber(drop.id)) * 0.08);
  context.shadowColor = color;
  context.shadowBlur = 9;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, -radius);
  context.quadraticCurveTo(radius * 0.7, -radius * 0.7, radius, 0);
  context.quadraticCurveTo(radius * 0.7, radius * 0.7, 0, radius);
  context.quadraticCurveTo(-radius * 0.7, radius * 0.7, -radius, 0);
  context.quadraticCurveTo(-radius * 0.7, -radius * 0.7, 0, -radius);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(255,255,255,.78)";
  context.beginPath();
  context.moveTo(0, -radius * 0.55);
  context.lineTo(radius * 0.18, -radius * 0.08);
  context.lineTo(radius * 0.55, 0);
  context.lineTo(radius * 0.18, radius * 0.08);
  context.lineTo(0, radius * 0.55);
  context.lineTo(-radius * 0.18, radius * 0.08);
  context.lineTo(-radius * 0.55, 0);
  context.lineTo(-radius * 0.18, -radius * 0.08);
  context.closePath();
  context.fill();
  context.restore();
}

function drawNetworkChain(
  context: CanvasRenderingContext2D,
  player: PublicPlayerState,
  currentTick: number,
  localPlayerId: string | undefined,
  collisionRadii: CollisionRadiusConfig,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
  debugHitboxes: boolean,
) {
  const head = worldToScreen(player.position);
  const points = [player.position, ...player.body].map(worldToScreen);
  const margin = 240;
  if (!points.some((point) => point.x > -margin && point.y > -margin && point.x < width + margin && point.y < height + margin)) return;
  const palette = palettes[stableNumber(player.id) % palettes.length];
  const headRadius = getPlayerRadius(player, collisionRadii) * zoom;
  const bodyRadius = getBodyRadius(player, collisionRadii) * zoom;
  const identityNumber = stableNumber(player.id);
  const shielded = player.shieldTicksRemaining > 0;
  const isHuman = player.kind === "human";
  const isLocal = player.id === localPlayerId;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = shielded ? 0.72 : 0.92;
  context.strokeStyle = palette[0];
  context.lineWidth = Math.max(3, bodyRadius * 0.46);
  context.shadowColor = palette[0];
  context.shadowBlur = 12;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    context.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
  }
  context.stroke();
  context.shadowBlur = 0;

  for (let index = player.body.length - 1; index >= 0; index -= 1) {
    const screen = points[index + 1];
    const lean = Math.sin(now * 0.006 + index * 0.85) * bodyRadius * 0.05;
    drawNetworkCreature(
      context,
      { x: screen.x, y: screen.y + lean },
      bodyRadius,
      palette,
      index,
      player.direction,
      false,
      shielded,
      identityNumber,
    );
  }

  if (
    player.specialist?.kind === "collector" &&
    player.specialist.expiresAtTick > currentTick &&
    points[1]
  ) {
    // Collector paint is clipped inside an existing body segment. It changes
    // neither the rendered chain silhouette nor the authoritative hit circles.
    const remainingTicks = Math.max(0, player.specialist.expiresAtTick - currentTick);
    const timerRatio = clamp(remainingTicks / player.specialist.durationTicks, 0, 1);
    drawNetworkCollectorFace(
      context,
      points[1].x,
      points[1].y,
      bodyRadius * 0.82,
      timerRatio,
    );
  }
  drawNetworkCreature(
    context,
    head,
    headRadius,
    palette,
    0,
    player.direction,
    true,
    shielded,
    identityNumber,
  );

  if (debugHitboxes) {
    context.save();
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

  context.font = `800 ${clamp(10 * zoom, 9, 13)}px Inter, sans-serif`;
  context.textAlign = "center";
  context.fillStyle = isLocal ? "#ffffff" : isHuman ? "#74ffe4" : "rgba(224,238,249,0.84)";
  context.shadowColor = "rgba(0,0,0,0.9)";
  context.shadowBlur = 5;
  const identity = isLocal ? "YOU · HUMAN" : isHuman ? "HUMAN" : "AI";
  context.fillText(`${player.name} · ${identity}`, head.x, head.y - headRadius * 1.7);
  context.restore();
}

function drawNetworkCreature(
  context: CanvasRenderingContext2D,
  point: Vec2,
  radius: number,
  palette: string[],
  index: number,
  direction: Vec2,
  head: boolean,
  shielded: boolean,
  identityNumber: number,
) {
  if (radius < 1.5) return;
  const primary = palette[index % 2];
  context.save();
  context.translate(point.x, point.y);
  context.rotate(Math.atan2(direction.y, direction.x) * 0.07);
  context.shadowColor = primary;
  context.shadowBlur = head ? 18 : 10;
  const gradient = context.createRadialGradient(-radius * 0.34, -radius * 0.42, radius * 0.05, 0, 0, radius * 1.2);
  gradient.addColorStop(0, palette[2]);
  gradient.addColorStop(0.25, primary);
  gradient.addColorStop(1, palette[(index + 1) % 2]);
  context.fillStyle = gradient;
  const variant = (identityNumber + index * 7 + (head ? 3 : 0)) % 5;
  context.beginPath();
  drawNetworkCreatureSilhouette(context, radius, variant);
  context.fill();
  context.shadowBlur = 0;

  if (radius >= 5.5) {
    const eyeOffset = radius * 0.34;
    const eyeY = -radius * 0.13;
    const pupilX = direction.x * radius * 0.08;
    const pupilY = direction.y * radius * 0.08;
    context.fillStyle = "rgba(255,255,255,0.94)";
    context.beginPath();
    context.ellipse(-eyeOffset, eyeY, radius * 0.25, radius * 0.31, 0, 0, Math.PI * 2);
    context.ellipse(eyeOffset, eyeY, radius * 0.25, radius * 0.31, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#061326";
    context.beginPath();
    context.arc(-eyeOffset + pupilX, eyeY + pupilY, radius * 0.105, 0, Math.PI * 2);
    context.arc(eyeOffset + pupilX, eyeY + pupilY, radius * 0.105, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(-eyeOffset + pupilX - radius * 0.025, eyeY + pupilY - radius * 0.035, radius * 0.03, 0, Math.PI * 2);
    context.arc(eyeOffset + pupilX - radius * 0.025, eyeY + pupilY - radius * 0.035, radius * 0.03, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(4,22,36,0.82)";
    context.lineWidth = Math.max(1.1, radius * 0.09);
    context.lineCap = "round";
    context.beginPath();
    if (shielded) {
      context.arc(0, radius * 0.19, radius * 0.18, 0.15 * Math.PI, 0.85 * Math.PI, true);
    } else if (head) {
      context.arc(0, radius * 0.15, radius * 0.28, 0.12 * Math.PI, 0.88 * Math.PI);
    } else {
      context.moveTo(-radius * 0.16, radius * 0.23);
      context.quadraticCurveTo(0, radius * 0.32, radius * 0.16, radius * 0.23);
    }
    context.stroke();

    // Decorative limbs remain inside the authoritative solid collision circle.
    context.strokeStyle = "rgba(4,24,39,0.55)";
    context.lineWidth = Math.max(1, radius * 0.07);
    context.beginPath();
    context.moveTo(-radius * 0.76, radius * 0.18);
    context.lineTo(-radius * 0.53, radius * 0.03);
    context.moveTo(radius * 0.76, radius * 0.18);
    context.lineTo(radius * 0.53, radius * 0.03);
    context.stroke();
  }
  context.restore();
}

function drawNetworkCreatureSilhouette(
  context: CanvasRenderingContext2D,
  radius: number,
  variant: number,
) {
  if (variant === 0) {
    context.ellipse(0, 0, radius * 0.98, radius * 0.9, 0, 0, Math.PI * 2);
    return;
  }
  if (variant === 1) {
    context.roundRect(
      -radius * 0.66,
      -radius * 0.66,
      radius * 1.32,
      radius * 1.32,
      radius * 0.34,
    );
    return;
  }

  const points = variant === 2 ? 6 : variant === 3 ? 5 : 8;
  const innerFactor = variant === 3 ? 0.58 : variant === 4 ? 0.72 : 1;
  const pointCount = innerFactor < 1 ? points * 2 : points;
  for (let point = 0; point < pointCount; point += 1) {
    const angle = -Math.PI / 2 + (point / pointCount) * Math.PI * 2;
    const radial = point % 2 === 1 && innerFactor < 1
      ? radius * innerFactor
      : radius * 0.94;
    const x = Math.cos(angle) * radial;
    const y = Math.sin(angle) * radial;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "../App";
import {
  ArenaTutorial,
  SPRINT_SIZE_COST_PER_SECOND,
  useArenaTutorial,
} from "./ArenaTutorial";
import {
  calculateScore,
  getPlayerRank,
  getPlayerRadius,
  getBodyRadius,
  getRankings,
  getSpecialistSecondsRemaining,
  isSpecialistActive,
} from "../game/core";
import {
  LOCAL_BOT_COUNT,
  LOCAL_PLAYER_ID,
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
  BotInputProviderMap,
  DropState,
  GameEvent,
  GameState,
  PlayerState,
  Vec2,
} from "../game/types";

const PLAYER_ID = LOCAL_PLAYER_ID;
const BOT_COUNT = LOCAL_BOT_COUNT;
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
  session: number;
  onExit: () => void;
  onRestart: () => void;
}

interface HudState {
  score: number;
  mass: number;
  length: number;
  rank: number;
  remaining: number;
  leaderboard: ReturnType<typeof getRankings>;
  position: Vec2;
  collectorRemaining: number;
}

interface ResultState {
  heading: string;
  cause: string;
  score: number;
  peakMass: number;
  kills: number;
  rank: number;
  replayContext: string;
  recording: LocalRunRecording;
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
}

interface ArenaRenderRuntime {
  state: GameState;
  camera: Vec2;
  particles: Particle[];
  impactUntil: number;
  shakeUntil: number;
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
  lastFrame: number;
  accumulatorSeconds: number;
  resultCommitted: boolean;
  runEnded: boolean;
  pickupCombo: number;
  lastPickupTick: number;
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
    mass: 100,
    length: 8,
    rank: BOT_COUNT + 1,
    remaining: RUSH_SECONDS,
    leaderboard: [],
    position: { x: 0, y: 0 },
    collectorRemaining: 0,
  };
}

export function ArenaCanvas({
  playerName,
  mode,
  challenge,
  running,
  session,
  onExit,
  onRestart,
}: ArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ArenaRuntime | null>(null);
  const replayRuntimeRef = useRef<LocalReplayRuntime | null>(null);
  const directionRef = useRef<Vec2>({ x: 1, y: 0 });
  const boostRef = useRef(false);
  const touchGuideRef = useRef<TouchGuide | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [hud, setHud] = useState<HudState>(getInitialHud);
  const [result, setResult] = useState<ResultState | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [touchGuide, setTouchGuide] = useState<TouchGuide | null>(null);
  const [actionCallout, setActionCallout] = useState<string | null>(null);
  const [localReplay, setLocalReplay] = useState<LocalReplayUiState | null>(null);
  const tutorial = useArenaTutorial(running && !result, `${session}:${mode}`);

  const ensureAudio = useCallback(() => {
    if (!running) return;
    const AudioContextCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    audioRef.current ??= new AudioContextCtor();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
  }, [running]);

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

  useEffect(() => {
    const seed = running
      ? challenge?.seed ?? `wormifi-${session}-${mode}`
      : "wormifi-living-title";
    const built = buildLocalArena(seed, playerName, mode);
    runtimeRef.current = {
      ...built,
      startTick: built.state.tick,
      lastFrame: performance.now(),
      accumulatorSeconds: 0,
      camera: { x: 0, y: 0 },
      particles: [],
      resultCommitted: false,
      runEnded: false,
      pickupCombo: 0,
      lastPickupTick: -10_000,
      impactUntil: 0,
      shakeUntil: 0,
      debugHitboxes: new URLSearchParams(window.location.search).get("hitboxes") === "1",
      tutorialSparkId: undefined,
      tutorialRetargetCount: 0,
      tutorialRetargetReason: undefined,
      tutorialTargetTrackingId: undefined,
      tutorialTargetClosestDistance: undefined,
      recording: { seed, mode, playerName: playerName || "Guest", inputs: [] },
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
  }, [challenge, mode, playerName, running, session]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!running || result) return;
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
  }, [ensureAudio, pressSprint, recordMeaningfulSteer, releaseSprint, result, running]);

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
      });
      boostRef.current = false;
      setBoosting(false);
      playTone(125, 0.24, 0.08);
      navigator.vibrate?.([35, 25, 80]);
    };

    const handleEvents = (runtime: ArenaRuntime, events: readonly GameEvent[]) => {
      const player = runtime.state.players[PLAYER_ID];
      for (const event of events) {
        if (
          event.type === "dropCollected" &&
          event.playerId === PLAYER_ID &&
          event.mass > 0 &&
          player
        ) {
          tutorial.collectedSpark(event.dropId, runtime.tutorialSparkId ?? null);
          runtime.pickupCombo = runtime.state.tick - runtime.lastPickupTick < 16
            ? Math.min(8, runtime.pickupCombo + 1)
            : 1;
          runtime.lastPickupTick = runtime.state.tick;
          const color = foodColors[runtime.pickupCombo % foodColors.length];
          for (let index = 0; index < 5; index += 1) {
            const angle = (index / 5) * Math.PI * 2 + runtime.state.tick * 0.17;
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
          if (runtime.pickupCombo <= 5 || runtime.pickupCombo === 8) {
            playTone(280 + runtime.pickupCombo * 55, 0.055, 0.022);
          }
          if (runtime.pickupCombo === 6 || runtime.pickupCombo === 8) {
            navigator.vibrate?.(8);
            setActionCallout(`SPARK STREAK ×${runtime.pickupCombo}`);
            window.setTimeout(() => setActionCallout(null), 650);
          }
        }

        if (event.type === "massShed" && event.playerId === PLAYER_ID) {
          tutorial.spentSprint();
        }

        if (event.type === "specialistActivated" && event.playerId === PLAYER_ID) {
          tutorial.sawCollector();
          setActionCallout("COLLECTOR ON · PULLS SPARKS + YOUR SPRINT DROPS");
          window.setTimeout(() => setActionCallout(null), 900);
          playTone(520, 0.11, 0.035);
          window.setTimeout(() => playTone(760, 0.14, 0.03), 80);
          navigator.vibrate?.([12, 24, 22]);
        }

        if (event.type === "specialistExpired" && event.playerId === PLAYER_ID) {
          setActionCallout("COLLECTOR OFF · FIND ANOTHER BEACON");
          window.setTimeout(() => setActionCallout(null), 800);
        }

        if (event.type === "playerDied") {
          const victim = runtime.state.players[event.playerId];
          if (victim) {
            const palette = paletteFor(victim.id);
            for (let index = 0; index < 42; index += 1) {
              const angle = (index / 42) * Math.PI * 2;
              const speed = 70 + (index % 9) * 17;
              runtime.particles.push({
                x: victim.position.x,
                y: victim.position.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + (index % 5) * 0.08,
                maxLife: 1.15,
                radius: 4 + (index % 4),
                color: palette[index % palette.length],
              });
            }
          }
          if (event.killerId === PLAYER_ID && event.playerId !== PLAYER_ID) {
            runtime.shakeUntil = performance.now() + 180;
            setActionCallout(`CHAIN CUT · ${victim?.name ?? "RIVAL"} RELEASED`);
            window.setTimeout(() => setActionCallout(null), 1_050);
            playTone(510, 0.11, 0.055);
            navigator.vibrate?.([12, 18, 22]);
          }
          if (event.playerId === PLAYER_ID && victim) {
            runtime.runEnded = true;
            runtime.impactUntil = performance.now() + 280;
            runtime.shakeUntil = performance.now() + 440;
            const killer = event.killerId ? runtime.state.players[event.killerId] : undefined;
            const cause = event.cause === "boundary"
              ? "The arena edge caught your Core."
              : `You hit ${killer?.name ?? "a rival"}’s living chain.`;
            window.setTimeout(() => commitResult(victim, cause), 340);
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
            if (focus) replay.camera = { ...focus };
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
                replay.shakeUntil = now + 180;
              }
              if (event.playerId === PLAYER_ID) {
                replay.context = replay.terminalContext;
                replay.impactUntil = now + 280;
                replay.shakeUntil = now + 440;
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
        renderArena(canvas, replay, now);
        animationFrame = requestAnimationFrame(frame);
        return;
      }

      const deltaSeconds = clamp((now - runtime.lastFrame) / 1_000, 0, 0.06);
      runtime.lastFrame = now;
      if (!runtime.runEnded) {
        const waitingForFirstTurn = running && tutorial.stageRef.current === "steer";
        if (waitingForFirstTurn) runtime.accumulatorSeconds = 0;
        else runtime.accumulatorSeconds += deltaSeconds;
        const fixedStep = runtime.state.config.fixedStepSeconds;
        while (
          !waitingForFirstTurn &&
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
          const step = stepLocalArena(runtime, input);
          runtime.accumulatorSeconds -= fixedStep;
          if (Math.abs(runtime.accumulatorSeconds) < 1e-9) {
            runtime.accumulatorSeconds = 0;
          }
          handleEvents(runtime, step.events);
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
      renderArena(canvas, runtime, now);

      if (runtime.state.tick % 5 === 0 && currentPlayer) {
        setHud({
          score: calculateScore(currentPlayer, runtime.state.config),
          mass: Math.round(currentPlayer.mass),
          length: currentPlayer.body.length,
          rank: getPlayerRank(runtime.state, PLAYER_ID) ?? BOT_COUNT + 1,
          remaining,
          leaderboard: getRankings(runtime.state).slice(0, 6),
          position: { ...currentPlayer.position },
          collectorRemaining: getSpecialistSecondsRemaining(
            runtime.state,
            currentPlayer,
            "collector",
          ),
        });
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
    playTone,
    running,
    session,
    tutorial.collectedSpark,
    tutorial.sawCollector,
    tutorial.spentSprint,
    tutorial.stageRef,
  ]);

  const setPointerDirection = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(x, y);
    if (length < 10) return;
    const direction = { x: x / length, y: y / length };
    directionRef.current = direction;
    if (running) recordMeaningfulSteer(direction);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!running || result) return;
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
    if (!running || result) return;
    if ((event.target as HTMLElement).closest("button")) return;
    ensureAudio();
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
        camera: replayPlayer ? { ...replayPlayer.position } : { x: 0, y: 0 },
        particles: [],
        impactUntil: 0,
        shakeUntil: 0,
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

  const shareChallenge = async () => {
    const safeRival = (playerName || "Guest")
      .trim()
      .replace(/[^A-Za-z0-9._-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 40) || "Guest";
    const token = serializeChallengePayload({
      seed: runtimeRef.current?.state.initialSeed ?? `wormifi-${session}-${mode}`,
      mode: mode === "endless" ? "live" : mode,
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
    const shareData = {
      title: "Beat my Wormifi run",
      text: `I scored ${result?.score ?? hud.score} in Wormifi. Can your living chain beat mine?`,
      url,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text} ${url}`);
        setToast("Challenge copied");
        window.setTimeout(() => setToast(null), 1_800);
      }
    } catch {
      // The native share sheet can be dismissed intentionally; no error UI is needed.
    }
  };

  const tutorialSpark = runtimeRef.current?.state.drops.find(
    (drop) => drop.id === runtimeRef.current?.tutorialSparkId,
  );

  return (
    <div
      ref={stageRef}
      className="arena-stage"
      data-testid="arena-canvas"
      aria-label={running ? "Active Wormifi living-chain arena" : "Living Wormifi arena preview"}
      tabIndex={running ? 0 : -1}
      data-player-x={Math.round(hud.position.x)}
      data-player-y={Math.round(hud.position.y)}
      data-player-mass={hud.mass}
      data-boosting={boosting ? "true" : "false"}
      data-collector-seconds={hud.collectorRemaining.toFixed(1)}
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
      {running && !localReplay && (
        <>
          <span className="sr-only" data-testid="player-chain">Player living chain is active</span>
          <div className="game-hud">
            <div className="hud-top">
              <div className="hud-pill hud-rank" data-testid="hud-rank">
                <small>SIZE RANK</small><strong>#{hud.rank}</strong>
              </div>
              <div className="hud-pill hud-size" data-testid="hud-score">
                <small>SCORE</small><strong>{hud.score.toLocaleString()}</strong>
              </div>
              <div className="hud-pill" data-testid="hud-length">
                <small>SIZE</small><strong>{hud.mass}</strong>
              </div>
              {mode === "rush" && (
                <div className={`rush-clock ${hud.remaining <= 10 ? "urgent" : ""}`}>
                  {formatClock(hud.remaining)}
                </div>
              )}
            </div>

            <aside className="leaderboard" aria-label="AI size leaderboard">
              <h2>SIZE RANK · AI</h2>
              <ol>
                {hud.leaderboard.map((entry) => {
                  const bot = runtimeRef.current?.state.players[entry.playerId]?.kind === "bot";
                  return (
                    <li key={entry.playerId} className={entry.playerId === PLAYER_ID ? "player" : ""}>
                      <span className="name">{entry.name}{bot && <em className="ai-tag">AI</em>}</span>
                      <span>{Math.round(entry.mass)}</span>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <div
              className={`specialist-status ${hud.collectorRemaining > 0 ? "active" : ""}`}
              data-testid="collector-status"
              data-active={hud.collectorRemaining > 0 ? "true" : "false"}
            >
              <span className="specialist-icon">C</span>
              <span>
                <small>COLLECTOR</small>
                <strong>
                  {hud.collectorRemaining > 0
                    ? `${hud.collectorRemaining.toFixed(1)}S · PULLS SPARKS + YOUR SPRINT DROPS`
                    : "FIND THE CYAN BEACON"}
                </strong>
              </span>
            </div>

            <ArenaTutorial stage={tutorial.stage} size={hud.mass} />

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

          <button className="exit-button" data-testid="exit-button" aria-label="Exit to Wormifi menu" onClick={onExit}>×</button>
          <button
            className={`boost-control ${boosting ? "active" : ""}`}
            data-testid="boost-control"
            disabled={hud.mass <= 61 || Boolean(result)}
            onPointerDown={(event) => {
              event.stopPropagation();
              ensureAudio();
              pressSprint();
              navigator.vibrate?.(8);
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              releaseSprint();
            }}
            onPointerCancel={releaseSprint}
            aria-label={`Sprint — costs ${SPRINT_SIZE_COST_PER_SECOND} size per second`}
          >
            <span>SPRINT</span>
            <small>−{SPRINT_SIZE_COST_PER_SECOND} SIZE/S</small>
          </button>
        </>
      )}

      {result && !localReplay && (
        <div className="results-backdrop">
          <section className="results-panel" data-testid="results-panel" aria-labelledby="result-heading">
            <span className="results-kicker">RIVALRY LINK READY</span>
            <h2 id="result-heading">{result.heading}</h2>
            <p className="death-cause">{result.cause}</p>
            <dl className="result-stats">
              <div><dt>SCORE</dt><dd>{result.score.toLocaleString()}</dd></div>
              <div><dt>PEAK SIZE</dt><dd>{result.peakMass}</dd></div>
              <div><dt>SCORE RANK</dt><dd>#{result.rank}</dd></div>
              <div><dt>CHAIN CUTS</dt><dd>{result.kills}</dd></div>
            </dl>
            <button
              className="replay-button"
              data-testid="watch-local-replay"
              onClick={startLocalReplay}
            >
              <span>WATCH FINAL 6S</span>
              <small>LOCAL REPLAY · RECORDED INPUTS</small>
            </button>
            <button className="restart-button" data-testid="restart-button" onClick={onRestart}>PLAY AGAIN</button>
            <button className="share-button" onClick={() => void shareChallenge()}>SHARE CHALLENGE</button>
            <button className="menu-button" onClick={onExit}>CHANGE MODE</button>
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

      {actionCallout && <div className="action-callout" aria-live="polite">{actionCallout}</div>}
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
  context.clearRect(0, 0, width, height);
  if (runtime.shakeUntil > now) {
    const intensity = clamp((runtime.shakeUntil - now) / 440, 0, 1) * 9;
    context.translate(
      Math.sin(now * 0.19) * intensity,
      Math.cos(now * 0.23) * intensity,
    );
  }

  const background = context.createRadialGradient(width * 0.45, height * 0.42, 0, width * 0.5, height * 0.5, Math.max(width, height));
  background.addColorStop(0, "#102b4a");
  background.addColorStop(0.52, "#091b35");
  background.addColorStop(1, "#030a18");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const player = runtime.state.players[PLAYER_ID];
  const focus = player?.alive ? player.position : runtime.camera;
  const cameraSmoothing = 0.105;
  runtime.camera.x += (focus.x - runtime.camera.x) * cameraSmoothing;
  runtime.camera.y += (focus.y - runtime.camera.y) * cameraSmoothing;
  const minDimension = Math.min(width, height);
  const baseZoom = clamp(minDimension / 760, 0.68, 1.12);
  const massZoom = player ? clamp(1 - Math.max(0, player.mass - 100) / 2_800, 0.67, 1) : 1;
  const zoom = baseZoom * massZoom;
  const worldToScreen = (point: Vec2): Vec2 => ({
    x: width / 2 + (point.x - runtime.camera.x) * zoom,
    y: height / 2 + (point.y - runtime.camera.y) * zoom,
  });

  drawArenaTexture(context, width, height, runtime.camera, zoom, now);
  drawBoundary(context, runtime.state, worldToScreen, zoom, now);
  drawDrops(context, runtime.state, worldToScreen, zoom, width, height, now, runtime.tutorialSparkId);

  const players = Object.values(runtime.state.players)
    .filter((entry) => entry.alive)
    .sort((first, second) => first.mass - second.mass);
  for (const entry of players) {
    drawLivingChain(
      context,
      entry,
      runtime.state,
      worldToScreen,
      zoom,
      width,
      height,
      now,
      runtime.debugHitboxes,
    );
  }

  for (const particle of runtime.particles) {
    const screen = worldToScreen(particle);
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(screen.x, screen.y, Math.max(1.5, particle.radius * zoom * alpha), 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;

  const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.32, width / 2, height / 2, Math.max(width, height) * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,4,14,0.48)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  if (runtime.impactUntil > now) {
    const alpha = clamp((runtime.impactUntil - now) / 280, 0, 1);
    context.fillStyle = `rgba(255, 67, 121, ${alpha * 0.28})`;
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

function drawBoundary(
  context: CanvasRenderingContext2D,
  state: GameState,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  now: number,
) {
  const center = worldToScreen({ x: 0, y: 0 });
  const radius = state.config.arenaRadius * zoom;
  context.save();
  context.strokeStyle = `rgba(255, 89, 130, ${0.38 + Math.sin(now * 0.004) * 0.1})`;
  context.lineWidth = Math.max(9, 28 * zoom);
  context.shadowColor = "#ff4d83";
  context.shadowBlur = 26;
  context.setLineDash([28 * zoom, 18 * zoom]);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawCollectorFace(
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

function drawDrops(
  context: CanvasRenderingContext2D,
  state: GameState,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
  tutorialSparkId?: string,
) {
  for (const drop of state.drops) {
    const screen = worldToScreen(drop.position);
    const pulse = 0.92 + Math.sin(now * 0.004 + stableNumber(drop.id)) * 0.08;
    const radius = Math.max(2.2, drop.radius * zoom * pulse);
    if (screen.x < -radius * 2 || screen.y < -radius * 2 || screen.x > width + radius * 2 || screen.y > height + radius * 2) continue;
    const color = foodColor(drop);
    context.save();
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
      context.font = `900 ${clamp(9 * zoom, 8, 11)}px Inter, sans-serif`;
      context.textAlign = "center";
      context.fillStyle = "#eafffb";
      context.shadowColor = "rgba(0,0,0,.9)";
      context.shadowBlur = 5;
      context.fillText("SPARK · GROW", 0, -Math.max(18, radius * 3.1));
    }

    if (drop.specialist === "collector") {
      const beaconRadius = Math.max(10, radius * 1.25);
      const spin = now * 0.0012;
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
      context.rotate(spin);
      context.setLineDash([beaconRadius * 0.55, beaconRadius * 0.24]);
      context.strokeStyle = "rgba(184, 255, 244, 0.88)";
      context.lineWidth = Math.max(1.2, beaconRadius * 0.09);
      context.beginPath();
      context.arc(0, 0, beaconRadius * 1.42, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      drawCollectorFace(context, 0, 0, beaconRadius * 0.78);
      context.font = `900 ${clamp(9 * zoom, 8, 11)}px Inter, sans-serif`;
      context.fillStyle = "#cafff5";
      context.shadowColor = "rgba(0,0,0,.9)";
      context.shadowBlur = 5;
      context.fillText("COLLECTOR · 12S", 0, -beaconRadius * 2.05);
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
      // Rival Echoes retain their defeated player's color as a readable memory.
      context.shadowColor = color;
      context.shadowBlur = 17;
      context.fillStyle = color;
      context.beginPath();
      for (let point = 0; point < 12; point += 1) {
        const angle = (point / 12) * Math.PI * 2 + now * 0.00035;
        const radial = point % 2 === 0 ? radius * 1.3 : radius * 0.64;
        const x = Math.cos(angle) * radial;
        const y = Math.sin(angle) * radial;
        if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
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
      continue;
    }

    // Neutral Pulse Motes use a small energy-diamond silhouette: readable at
    // speed, abstract, and visually separate from every player-produced Echo.
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
}

function drawLivingChain(
  context: CanvasRenderingContext2D,
  player: PlayerState,
  state: GameState,
  worldToScreen: (point: Vec2) => Vec2,
  zoom: number,
  width: number,
  height: number,
  now: number,
  debugHitboxes: boolean,
) {
  const headScreen = worldToScreen(player.position);
  const margin = 240;
  const hasVisibleSegment = player.body.some((segment) => {
    const screen = worldToScreen(segment);
    return screen.x > -margin && screen.y > -margin && screen.x < width + margin && screen.y < height + margin;
  });
  if (!hasVisibleSegment && (headScreen.x < -margin || headScreen.y < -margin || headScreen.x > width + margin || headScreen.y > height + margin)) return;

  const palette = paletteFor(player.id);
  const headRadius = getPlayerRadius(player, state.config) * zoom;
  const followerRadius = getBodyRadius(player, state.config) * zoom;
  const identity = stableNumber(player.id);
  const shielded = player.shieldTicksRemaining > 0;
  const points = [player.position, ...player.body].map(worldToScreen);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = shielded ? 0.72 : 0.92;
  context.strokeStyle = palette[0];
  context.lineWidth = Math.max(3, followerRadius * 0.46);
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
    const lean = Math.sin(now * 0.006 + index * 0.85) * followerRadius * 0.05;
    drawCreature(
      context,
      screen.x,
      screen.y + lean,
      followerRadius,
      palette,
      index,
      player.direction,
      false,
      shielded,
      identity,
    );
  }

  if (isSpecialistActive(state, player, "collector") && points[1]) {
    // The specialist is painted entirely inside an existing solid segment.
    // It changes pickup reach only; the crew silhouette and hitbox stay exact.
    const specialist = player.specialist!;
    const remainingTicks = Math.max(0, specialist.expiresAtTick - state.tick);
    const timerRatio = remainingTicks / specialist.durationTicks;
    const crew = points[1];
    drawCollectorFace(
      context,
      crew.x,
      crew.y,
      followerRadius * 0.82,
      timerRatio,
    );
  }

  drawCreature(
    context,
    headScreen.x,
    headScreen.y,
    headRadius,
    palette,
    0,
    player.direction,
    true,
    shielded,
    identity,
  );

  if (debugHitboxes) {
    context.save();
    context.setLineDash([3, 3]);
    context.strokeStyle = "rgba(255,255,255,0.76)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(headScreen.x, headScreen.y, headRadius, 0, Math.PI * 2);
    context.stroke();
    for (const point of points.slice(1)) {
      context.beginPath();
      context.arc(point.x, point.y, followerRadius, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  if (shielded) {
    context.strokeStyle = "rgba(185, 252, 255, 0.82)";
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.arc(headScreen.x, headScreen.y, headRadius * 1.42, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }

  context.globalAlpha = 1;
  context.font = `800 ${clamp(10 * zoom, 9, 13)}px Inter, sans-serif`;
  context.textAlign = "center";
  context.fillStyle = player.id === PLAYER_ID ? "#eaffff" : "rgba(230,244,255,0.84)";
  context.shadowColor = "rgba(0,0,0,0.85)";
  context.shadowBlur = 5;
  const label = `${player.name}${player.kind === "bot" ? " · AI" : ""}`;
  context.fillText(label, headScreen.x, headScreen.y - headRadius * 1.65);
  context.restore();
}

function drawCreature(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  palette: string[],
  index: number,
  direction: Vec2,
  head: boolean,
  shielded: boolean,
  identity: number,
) {
  if (radius < 1.5) return;
  const primary = palette[index % 2];
  context.save();
  context.translate(x, y);
  context.rotate(Math.atan2(direction.y, direction.x) * 0.07);
  context.shadowColor = primary;
  context.shadowBlur = head ? 18 : 10;
  const gradient = context.createRadialGradient(-radius * 0.34, -radius * 0.42, radius * 0.05, 0, 0, radius * 1.2);
  gradient.addColorStop(0, palette[2]);
  gradient.addColorStop(0.25, primary);
  gradient.addColorStop(1, palette[(index + 1) % 2]);
  context.fillStyle = gradient;
  const variant = (identity + index * 7 + (head ? 3 : 0)) % 5;
  context.beginPath();
  drawCreatureSilhouette(context, radius, variant);
  context.fill();
  context.shadowBlur = 0;

  if (radius >= 5.5) {
    const eyeOffsetX = radius * 0.34;
    const eyeY = -radius * 0.13;
    const pupilX = direction.x * radius * 0.08;
    const pupilY = direction.y * radius * 0.08;
    context.fillStyle = "rgba(255,255,255,0.94)";
    context.beginPath();
    context.ellipse(-eyeOffsetX, eyeY, radius * 0.25, radius * 0.31, 0, 0, Math.PI * 2);
    context.ellipse(eyeOffsetX, eyeY, radius * 0.25, radius * 0.31, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#061326";
    context.beginPath();
    context.arc(-eyeOffsetX + pupilX, eyeY + pupilY, radius * 0.105, 0, Math.PI * 2);
    context.arc(eyeOffsetX + pupilX, eyeY + pupilY, radius * 0.105, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(-eyeOffsetX + pupilX - radius * 0.025, eyeY + pupilY - radius * 0.035, radius * 0.03, 0, Math.PI * 2);
    context.arc(eyeOffsetX + pupilX - radius * 0.025, eyeY + pupilY - radius * 0.035, radius * 0.03, 0, Math.PI * 2);
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

    // Limbs stay fully inside the collision silhouette to keep the hitbox honest.
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

function drawCreatureSilhouette(
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

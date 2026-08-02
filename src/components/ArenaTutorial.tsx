import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlScheme } from "../game/controlScheme";
import { DEFAULT_GAME_CONFIG } from "../game/core";
import type { Vec2 } from "../game/types";

export type ArenaTutorialStage =
  | "steer"
  | "spark"
  | "sprint"
  | "sprint-release"
  | "collision"
  | "collector"
  | "complete";

const SPRINT_SIZE_COST_PER_SECOND = DEFAULT_GAME_CONFIG.boostMassPerSecond;

function normalizedDot(first: Vec2, second: Vec2) {
  const firstLength = Math.hypot(first.x, first.y);
  const secondLength = Math.hypot(second.x, second.y);
  if (firstLength < 1e-6 || secondLength < 1e-6) return 1;
  return (first.x * second.x + first.y * second.y) / (firstLength * secondLength);
}

export function useArenaTutorial(active: boolean, resetKey: string | number) {
  const [stage, setStage] = useState<ArenaTutorialStage>(active ? "steer" : "complete");
  const [sprintSpent, setSprintSpent] = useState(false);
  const stageRef = useRef<ArenaTutorialStage>(active ? "steer" : "complete");
  const collectorSeenRef = useRef(false);
  const sprintSpentRef = useRef(false);

  const transition = useCallback((next: ArenaTutorialStage) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  useEffect(() => {
    collectorSeenRef.current = false;
    sprintSpentRef.current = false;
    setSprintSpent(false);
    transition(active ? "steer" : "complete");
  }, [active, resetKey, transition]);

  useEffect(() => {
    if (stage !== "collision") return;
    const timer = window.setTimeout(() => transition("collector"), 2_000);
    return () => window.clearTimeout(timer);
  }, [stage, transition]);

  useEffect(() => {
    if (stage !== "collector") return;
    const delay = collectorSeenRef.current ? 2_000 : 5_000;
    const timer = window.setTimeout(() => transition("complete"), delay);
    return () => window.clearTimeout(timer);
  }, [stage, transition]);

  const meaningfulSteer = useCallback((direction: Vec2, currentDirection: Vec2) => {
    if (stageRef.current !== "steer") return false;
    const turnDot = normalizedDot(currentDirection, direction);
    // A tiny nudge is not a lesson, and a requested U-turn cannot become an
    // immediate movement turn. Only accept a visible, non-reverse arc.
    if (turnDot > 0.92 || turnDot <= -0.92) return false;
    transition("spark");
    return true;
  }, [transition]);

  const collectedSpark = useCallback((dropId: string, highlightedDropId: string | null) => {
    if (stageRef.current !== "spark" || !highlightedDropId || dropId !== highlightedDropId) return false;
    transition("sprint");
    return true;
  }, [transition]);

  const pressedSprint = useCallback(() => {
    if (stageRef.current !== "sprint") return false;
    sprintSpentRef.current = false;
    setSprintSpent(false);
    transition("sprint-release");
    return true;
  }, [transition]);

  const spentSprint = useCallback(() => {
    if (stageRef.current !== "sprint-release") return false;
    sprintSpentRef.current = true;
    setSprintSpent(true);
    return true;
  }, []);

  const releasedSprint = useCallback(() => {
    if (stageRef.current !== "sprint-release") return false;
    if (!sprintSpentRef.current) {
      transition("sprint");
      return false;
    }
    transition("collision");
    return true;
  }, [transition]);

  const sawCollector = useCallback(() => {
    collectorSeenRef.current = true;
  }, []);

  return {
    stage,
    stageRef,
    sprintSpent,
    meaningfulSteer,
    collectedSpark,
    pressedSprint,
    spentSprint,
    releasedSprint,
    sawCollector,
  };
}

interface ArenaTutorialProps {
  stage: ArenaTutorialStage;
  size: number;
  alreadyMoving?: boolean;
  controlScheme?: ControlScheme;
}

export function ArenaTutorial({
  stage,
  size,
  alreadyMoving = false,
  controlScheme = "drag-anywhere",
}: ArenaTutorialProps) {
  if (stage === "complete") return null;
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const cue = stage === "steer"
    ? "↻"
    : stage === "spark"
      ? "◆"
      : stage === "sprint"
        ? "⚡"
        : stage === "sprint-release"
          ? "↥"
          : stage === "collision"
            ? "◎→●"
            : "⌖";
  const accessibleLabel = stage === "steer"
    ? touch && controlScheme !== "drag-anywhere"
      ? `Use the ${controlScheme === "left-helm" ? "left" : "right"} helm to turn.`
      : alreadyMoving
        ? "Turn your moving worm."
        : "Steer to start."
    : stage === "spark"
      ? "Collect the ringed gem."
      : stage === "sprint"
        ? `Press and hold Turbo. Current size ${Math.round(size)}.`
        : stage === "sprint-release"
          ? "Release Turbo."
          : stage === "collision"
            ? "Keep your head safe and make a rival head hit your crew."
            : "Collect the compass relic.";

  return (
    <section
      id="arena-tutorial"
      className={`tutorial-cue tutorial-${stage}`}
      data-testid="tutorial-coach"
      data-stage={stage}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={accessibleLabel}
    >
      <span aria-hidden="true">{cue}</span>
    </section>
  );
}

export { SPRINT_SIZE_COST_PER_SECOND };

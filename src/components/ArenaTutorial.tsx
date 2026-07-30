import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlScheme } from "../game/controlScheme";
import type { Vec2 } from "../game/types";

export type ArenaTutorialStage =
  | "steer"
  | "spark"
  | "sprint"
  | "sprint-release"
  | "collision"
  | "collector"
  | "complete";

const SPRINT_SIZE_COST_PER_SECOND = 12;

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

  return (
    <section
      id="arena-tutorial"
      className={`tutorial-coach tutorial-${stage}`}
      data-testid="tutorial-coach"
      data-stage={stage}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {stage === "steer" && (
        <>
          <small>STEP 1 OF 4 · STEER</small>
          <strong>
            {touch && controlScheme !== "drag-anywhere"
              ? `USE THE ${controlScheme === "left-helm" ? "LEFT" : "RIGHT"} HELM TO TURN`
              : alreadyMoving
                ? touch ? "YOU'RE MOVING · DRAG TO TURN" : "YOU'RE MOVING · TURN NOW"
                : touch ? "DRAG ANYWHERE TO START" : "MOVE YOUR POINTER TO START"}
          </strong>
          <span>
            {touch && controlScheme !== "drag-anywhere"
              ? "Move the fixed brass helm knob; the Sprint button mirrors to your free hand."
              : touch
                ? "The thumb ring starts where you touch."
              : alreadyMoving ? "Your glowing HEAD follows your pointer." : "You stay safe here until you turn."}
          </span>
        </>
      )}
      {stage === "spark" && (
        <>
          <small>STEP 2 OF 4 · GROW</small>
          <strong>GRAB THE RINGED GEM</strong>
          <span>Touch the cut jewel to add SIZE and grow your crew.</span>
        </>
      )}
      {(stage === "sprint" || stage === "sprint-release") && (
        <>
          <small>STEP 3 OF 4 · SPRINT · SIZE {Math.round(size)}</small>
          <strong>{stage === "sprint" ? "PRESS + HOLD SPRINT" : "NOW RELEASE SPRINT"}</strong>
          <span>Sprint moves faster but burns {SPRINT_SIZE_COST_PER_SECOND} SIZE each second.</span>
        </>
      )}
      {stage === "collision" && (
        <>
          <small>STEP 4 OF 4 · COLLISION LAW</small>
          <strong>HEAD SAFE · THEIR HEAD INTO YOUR CREW</strong>
          <div className="collision-lesson" aria-label="Keep your head safe and make a rival head hit your crew">
            <span className="lesson-rival-head">THEIR HEAD</span>
            <span className="lesson-arrow">→</span>
            <span className="lesson-crew"><i /><i /><i /> YOUR CREW</span>
          </div>
          <span className="collision-law">
            Your opening dotted HEAD SAFE halo fades on its timer. Your crew can still cut rivals while your head is protected.
          </span>
        </>
      )}
      {stage === "collector" && (
        <>
          <small>BONUS · LOOT COMPASS</small>
          <strong>GRAB THE BRASS COMPASS</strong>
          <span>For 12s it pulls nearby gems + your wake loot. Rival hoards stay put.</span>
        </>
      )}
    </section>
  );
}

export { SPRINT_SIZE_COST_PER_SECOND };

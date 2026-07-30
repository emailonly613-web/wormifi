import type { ActiveSpecialist } from "../game/types";
import { createRelicStatusModel } from "../game/relicPresentation";

export interface RelicStatusProps {
  active?: Readonly<ActiveSpecialist>;
  currentTick: number;
  fixedStepSeconds: number;
  reducedMotion?: boolean;
  className?: string;
  testId?: string;
}

function secondsText(seconds: number): string {
  return `${seconds.toFixed(1)}S`;
}

/**
 * Render-only Relic HUD. Its live announcement contains stable effect copy;
 * the ticking clock is separately labelled and never floods an aria-live
 * region. Reduced-motion mode replaces ambient motion with a static timer.
 */
export function RelicStatus({
  active,
  currentTick,
  fixedStepSeconds,
  reducedMotion = false,
  className = "",
  testId = "relic-status",
}: RelicStatusProps) {
  const model = createRelicStatusModel(active, currentTick, fixedStepSeconds);
  if (!model) return null;

  const relic = model.presentation;
  const classes = ["relic-status", `relic-status--${relic.relicKind}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      className={classes}
      data-testid={testId}
      data-relic-kind={relic.relicKind}
      data-carrier-tone={relic.carrierTone}
      data-carrier-accent={relic.carrierAccent}
      data-ground-sprite={relic.ground.spriteName}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-motion={reducedMotion ? "static" : relic.ground.motion}
      data-timer-ratio={model.timerRatio.toFixed(4)}
      aria-label={`${relic.label} Relic status`}
    >
      <div
        className="relic-status__identity"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <img
          className="relic-status__icon"
          src={relic.ground.assetPath}
          alt=""
          aria-hidden="true"
        />
        <span className="relic-status__copy">
          <strong>{relic.label.toUpperCase()} ACTIVE</strong>
          <span>{relic.effectText}</span>
        </span>
      </div>
      <time
        className="relic-status__time"
        dateTime={`PT${model.remainingSeconds.toFixed(3)}S`}
        aria-label={model.timerLabel}
        aria-live="off"
      >
        {secondsText(model.remainingSeconds)}
      </time>
      <progress
        className="relic-status__progress"
        max={model.durationSeconds}
        value={model.remainingSeconds}
        aria-label={`${relic.label} duration remaining`}
      >
        {Math.round(model.timerRatio * 100)}%
      </progress>
      <span className="relic-status__rival-disclosure">
        {relic.rivalDisclosure}
      </span>
      {reducedMotion && (
        <span className="relic-status__motion-equivalent">
          STATIC TIMER · NO PULSE
        </span>
      )}
    </aside>
  );
}

import { useEffect, useRef } from "react";
import type { ActiveSpecialist } from "../game/types";
import {
  createRelicStatusModel,
  getRelicParentAbilityId,
} from "../game/relicPresentation";
import type { WormateParentAbilityId } from "../game/wormateParentCatalog";
import {
  drawWormateParentAbility,
  preloadWormateParentVisuals,
} from "../game/wormateParentRender";

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

function ParentAbilityIcon({ abilityId }: { abilityId: WormateParentAbilityId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const paint = async () => {
      const ready = await preloadWormateParentVisuals();
      if (!ready || cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.round(54 * ratio);
      canvas.height = Math.round(54 * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, 54, 54);
      drawWormateParentAbility(context, abilityId, { x: 27, y: 27, size: 54 });
    };
    void paint();
    return () => {
      cancelled = true;
    };
  }, [abilityId]);
  return <canvas ref={canvasRef} className="relic-status__icon" aria-hidden="true" />;
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
  const multiplierGlyph = relic.relicKind === "gilded-ledger" &&
      (active?.relicTier === 3 || active?.relicTier === 4)
    ? `${active.relicTier}×`
    : undefined;
  const parentAbilityId = getRelicParentAbilityId(relic, active?.relicTier);
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
      data-parent-ability-id={parentAbilityId}
      data-relic-tier={active?.relicTier}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-motion={reducedMotion ? "static" : relic.ground.motion}
      data-timer-ratio={model.timerRatio.toFixed(4)}
      aria-label={`${relic.label} Relic status`}
    >
      <div className="relic-status__chest">
        <span className="relic-status__chest-lid" aria-hidden="true" />
        <span className="relic-status__chest-base" aria-hidden="true" />
        <div
          className="relic-status__identity"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${relic.label}. ${model.effectText}. ${model.rivalDisclosure}.`}
        >
          {multiplierGlyph ? (
            <span className="relic-status__multiplier" aria-hidden="true">{multiplierGlyph}</span>
          ) : (
            <ParentAbilityIcon abilityId={parentAbilityId} />
          )}
        </div>
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
    </aside>
  );
}

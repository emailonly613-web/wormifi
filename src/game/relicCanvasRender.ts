import { drawPirateAtlasSprite } from "./pirateSpriteAtlas";
import {
  getActiveRelicPresentation,
  getGroundRelicPresentation,
  type RelicPresentation,
} from "./relicPresentation";
import { drawLootCompass } from "./treasureRender";
import type {
  ActiveSpecialist,
  PirateRelicKind,
  SpecialistKind,
  Vec2,
} from "./types";

interface GroundRelicIdentity {
  specialist?: SpecialistKind;
  specialistDurationTicks?: number;
  relicKind?: PirateRelicKind;
  relicDurationTicks?: number;
}

export interface GroundRelicCanvasModel {
  presentation: RelicPresentation;
  durationSeconds: number;
  durationLabel: string;
  label: string;
  spriteRotation: number;
  orbitRotation: number;
}

export interface ActiveRelicCanvasModel {
  presentation: RelicPresentation;
  timerRatio: number;
}

export interface GroundRelicDrawOptions {
  beaconRadius: number;
  zoom: number;
  now: number;
  fixedStepSeconds: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Keep a two-line Relic label readable when its pickup sits at a screen edge. */
export function groundRelicLabelOffsetX(
  screenX: number,
  viewportWidth: number,
  labelWidth: number,
  safeMargin = 6,
): number {
  if (
    !Number.isFinite(screenX) ||
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(labelWidth) ||
    viewportWidth <= 0 ||
    labelWidth < 0
  ) {
    return 0;
  }
  const margin = clamp(safeMargin, 0, viewportWidth / 2);
  const halfWidth = Math.min(labelWidth / 2, Math.max(0, viewportWidth / 2 - margin));
  const minimumCenter = margin + halfWidth;
  const maximumCenter = viewportWidth - margin - halfWidth;
  return clamp(screenX, minimumCenter, maximumCenter) - screenX;
}

/**
 * Convert a CSS-pixel edge correction back into the Relic's local canvas space.
 * This keeps labels inside the visible canvas even when DPR/backing resolution
 * and the arena camera zoom are different.
 */
export function groundRelicLabelLocalOffsetX(
  screenXCss: number,
  viewportWidthCss: number,
  labelWidthLocal: number,
  localToCssScale: number,
  safeMargin = 8,
): number {
  if (!Number.isFinite(localToCssScale) || localToCssScale <= 0) return 0;
  const cssOffset = groundRelicLabelOffsetX(
    screenXCss,
    viewportWidthCss,
    labelWidthLocal * localToCssScale,
    safeMargin,
  );
  return cssOffset / localToCssScale;
}

function currentRelicLabelOffsetX(
  context: CanvasRenderingContext2D,
  labelWidth: number,
): number {
  const transform = context.getTransform();
  const scaleX = Math.hypot(transform.a, transform.b);
  const viewportWidthCss = context.canvas.clientWidth;
  const backingScale = viewportWidthCss > 0
    ? context.canvas.width / viewportWidthCss
    : 0;
  if (
    !Number.isFinite(scaleX) ||
    scaleX <= 0 ||
    !Number.isFinite(backingScale) ||
    backingScale <= 0
  ) {
    return 0;
  }
  return groundRelicLabelLocalOffsetX(
    transform.e / backingScale,
    viewportWidthCss,
    labelWidth,
    scaleX / backingScale,
  );
}

function displaySeconds(seconds: number): string {
  return Number.isInteger(seconds) ? `${seconds}S` : `${seconds.toFixed(1)}S`;
}

function spriteRotation(relicKind: PirateRelicKind, now: number): number {
  if (relicKind === "loot-compass") return now === 0 ? 0 : -now * 0.0012;
  if (relicKind === "emerald-spyglass") return Math.sin(now * 0.002) * 0.14;
  return -0.34 + Math.sin(now * 0.0032) * 0.16;
}

export function createGroundRelicCanvasModel(
  drop: Readonly<GroundRelicIdentity>,
  fixedStepSeconds: number,
  now: number,
): GroundRelicCanvasModel | undefined {
  const presentation = getGroundRelicPresentation(drop);
  if (!presentation) return undefined;

  const durationTicks = drop.relicDurationTicks ?? drop.specialistDurationTicks;
  const configuredDuration = durationTicks !== undefined &&
      Number.isSafeInteger(durationTicks) &&
      durationTicks > 0 &&
      Number.isFinite(fixedStepSeconds) &&
      fixedStepSeconds > 0
    ? durationTicks * fixedStepSeconds
    : presentation.publishedDurationSeconds;
  const durationSeconds = Number(configuredDuration.toFixed(1));
  const safeNow = Number.isFinite(now) ? now : 0;

  return {
    presentation,
    durationSeconds,
    durationLabel: displaySeconds(durationSeconds),
    label: `${presentation.label.toUpperCase()} · ${displaySeconds(durationSeconds)}`,
    spriteRotation: spriteRotation(presentation.relicKind, safeNow),
    orbitRotation: safeNow * (
      presentation.relicKind === "loot-compass"
        ? 0.0012
        : presentation.relicKind === "emerald-spyglass"
          ? -0.00075
          : 0.001
    ),
  };
}

export function createActiveRelicCanvasModel(
  active: Readonly<ActiveSpecialist> | undefined,
  currentTick: number,
): ActiveRelicCanvasModel | undefined {
  const presentation = getActiveRelicPresentation(active);
  if (
    !active ||
    !presentation ||
    !Number.isSafeInteger(currentTick) ||
    currentTick < 0 ||
    currentTick >= active.expiresAtTick ||
    !Number.isSafeInteger(active.durationTicks) ||
    active.durationTicks <= 0
  ) {
    return undefined;
  }

  return {
    presentation,
    timerRatio: clamp(
      (active.expiresAtTick - currentTick) / active.durationTicks,
      0,
      1,
    ),
  };
}

function drawRelicFallback(
  context: CanvasRenderingContext2D,
  presentation: RelicPresentation,
  radius: number,
  timerRatio = 1,
) {
  if (presentation.relicKind === "loot-compass") {
    drawLootCompass(context, 0, 0, radius, timerRatio);
    return;
  }

  context.save();
  context.fillStyle = presentation.carrierAccent;
  context.shadowColor = presentation.carrierHalo;
  context.shadowBlur = Math.max(5, radius * 0.7);
  context.font = `900 ${Math.max(13, radius * 1.65)}px Georgia, serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(presentation.ground.fallbackGlyph, 0, 0);
  context.restore();
}

export function drawGroundRelicPickup(
  context: CanvasRenderingContext2D,
  drop: Readonly<GroundRelicIdentity>,
  options: GroundRelicDrawOptions,
): GroundRelicCanvasModel | undefined {
  const model = createGroundRelicCanvasModel(
    drop,
    options.fixedStepSeconds,
    options.now,
  );
  if (!model) return undefined;

  const relic = model.presentation;
  const beaconRadius = Math.max(8, options.beaconRadius);
  context.save();
  context.shadowColor = relic.carrierHalo;
  context.shadowBlur = 24;
  context.fillStyle = "rgba(6, 24, 39, 0.97)";
  context.strokeStyle = relic.carrierAccent;
  context.lineWidth = Math.max(2, beaconRadius * 0.14);
  context.beginPath();
  context.arc(0, 0, beaconRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;

  context.save();
  context.rotate(model.orbitRotation);
  context.setLineDash([beaconRadius * 0.55, beaconRadius * 0.24]);
  context.strokeStyle = relic.carrierAccent;
  context.globalAlpha = 0.82;
  context.lineWidth = Math.max(1.2, beaconRadius * 0.09);
  context.beginPath();
  context.arc(0, 0, beaconRadius * 1.42, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  const spriteSize = beaconRadius * 2 * relic.ground.scale;
  if (!drawPirateAtlasSprite(context, relic.ground.spriteName, {
    x: 0,
    y: 0,
    size: spriteSize,
    rotation: model.spriteRotation,
  })) {
    drawRelicFallback(context, relic, beaconRadius * 0.78);
  }

  const labelFont = `900 ${clamp(9 * options.zoom, 8, 11)}px Inter, sans-serif`;
  const effectFont = `800 ${clamp(7.5 * options.zoom, 7, 9)}px Inter, sans-serif`;
  context.font = labelFont;
  const labelWidth = context.measureText(model.label).width;
  context.font = effectFont;
  const effectWidth = context.measureText(relic.effectText).width;
  const labelOffsetX = currentRelicLabelOffsetX(context, Math.max(labelWidth, effectWidth));

  context.font = labelFont;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = relic.carrierAccent;
  context.shadowColor = "rgba(0,0,0,.92)";
  context.shadowBlur = 5;
  context.fillText(model.label, labelOffsetX, -beaconRadius * 2.05);
  context.font = effectFont;
  context.fillStyle = "#eafffb";
  context.fillText(relic.effectText, labelOffsetX, beaconRadius * 2.18);
  context.restore();
  return model;
}

export function drawRelicCarrierEffect(
  context: CanvasRenderingContext2D,
  model: Readonly<ActiveRelicCanvasModel>,
  head: Vec2,
  headRadius: number,
  now: number,
) {
  const relic = model.presentation;
  if (relic.relicKind === "loot-compass") return;

  const safeNow = Number.isFinite(now) ? now : 0;
  const effectRadius = Math.max(27, headRadius * 2.45);
  context.save();
  context.translate(head.x, head.y);
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = relic.carrierAccent;
  context.fillStyle = relic.carrierAccent;
  context.shadowColor = relic.carrierHalo;
  context.shadowBlur = 12;

  if (relic.relicKind === "emerald-spyglass") {
    context.rotate(safeNow * 0.00032);
    context.globalAlpha = 0.42;
    context.lineWidth = Math.max(1.2, headRadius * 0.09);
    context.setLineDash([Math.max(5, headRadius * 0.42), Math.max(4, headRadius * 0.31)]);
    context.beginPath();
    context.arc(0, 0, effectRadius, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    for (let bearing = 0; bearing < 3; bearing += 1) {
      const angle = bearing * (Math.PI * 2 / 3);
      context.beginPath();
      context.moveTo(
        Math.cos(angle) * effectRadius * 0.58,
        Math.sin(angle) * effectRadius * 0.58,
      );
      context.lineTo(
        Math.cos(angle) * effectRadius * 1.14,
        Math.sin(angle) * effectRadius * 1.14,
      );
      context.stroke();
    }
  } else {
    context.rotate(Math.sin(safeNow * 0.0026) * 0.16);
    context.globalAlpha = 0.46;
    context.lineWidth = Math.max(1.6, headRadius * 0.12);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-effectRadius * 0.78, effectRadius * 0.62);
    context.lineTo(effectRadius * 0.88, -effectRadius * 0.72);
    context.moveTo(-effectRadius * 0.68, -effectRadius * 0.72);
    context.lineTo(effectRadius * 0.78, effectRadius * 0.62);
    context.stroke();
    for (let ember = 0; ember < 4; ember += 1) {
      const angle = ember * (Math.PI / 2) + safeNow * 0.0007;
      context.beginPath();
      context.arc(
        Math.cos(angle) * effectRadius,
        Math.sin(angle) * effectRadius,
        Math.max(1.2, headRadius * 0.1),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  context.restore();
}

export function drawRelicCarrierBadge(
  context: CanvasRenderingContext2D,
  model: Readonly<ActiveRelicCanvasModel>,
  x: number,
  y: number,
  radius: number,
  now: number,
) {
  const relic = model.presentation;
  const safeNow = Number.isFinite(now) ? now : 0;
  context.save();
  context.translate(x, y);
  context.fillStyle = "rgba(3, 18, 30, 0.82)";
  context.strokeStyle = relic.carrierHalo;
  context.lineWidth = Math.max(1, radius * 0.12);
  context.beginPath();
  context.arc(0, 0, radius * 0.96, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = relic.carrierAccent;
  context.lineWidth = Math.max(1.2, radius * 0.16);
  context.lineCap = "round";
  context.beginPath();
  context.arc(
    0,
    0,
    radius * 0.92,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * model.timerRatio,
  );
  context.stroke();

  const rotation = spriteRotation(relic.relicKind, safeNow) * 0.48;
  if (!drawPirateAtlasSprite(context, relic.ground.spriteName, {
    x: 0,
    y: 0,
    size: radius * 2.15,
    rotation,
  })) {
    drawRelicFallback(context, relic, radius * 0.74, model.timerRatio);
  }
  context.restore();
}

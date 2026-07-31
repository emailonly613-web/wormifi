import { drawPirateAtlasSprite } from "./pirateSpriteAtlas";
import {
  getActiveRelicPresentation,
  getGroundRelicPresentation,
  getRelicEffectText,
  type RelicPresentation,
} from "./relicPresentation";
import { drawLootCompass } from "./treasureRender";
import type {
  ActiveSpecialist,
  PirateRelicKind,
  SpecialistKind,
  TreasureMultiplierTier,
  Vec2,
} from "./types";

interface GroundRelicIdentity {
  specialist?: SpecialistKind;
  specialistDurationTicks?: number;
  relicKind?: PirateRelicKind;
  relicDurationTicks?: number;
  relicTier?: TreasureMultiplierTier;
}

export interface GroundRelicCanvasModel {
  presentation: RelicPresentation;
  durationSeconds: number;
  durationLabel: string;
  label: string;
  effectText: string;
  spriteRotation: number;
  orbitRotation: number;
}

export interface ActiveRelicCanvasModel {
  presentation: RelicPresentation;
  timerRatio: number;
  relicTier?: TreasureMultiplierTier;
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
  const effectText = getRelicEffectText(presentation, drop.relicTier);
  const tierLabel = presentation.relicKind === "gilded-ledger" && drop.relicTier
    ? `${drop.relicTier}×`
    : "";

  return {
    presentation,
    durationSeconds,
    durationLabel: displaySeconds(durationSeconds),
    label: presentation.relicKind === "gilded-ledger" && tierLabel
      ? `${tierLabel} TREASURE MULTIPLIER · ${displaySeconds(durationSeconds)}`
      : `${presentation.label.toUpperCase()} · ${displaySeconds(durationSeconds)}`,
    effectText,
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
    ...(active.relicTier ? { relicTier: active.relicTier } : {}),
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

function drawGildedMultiplierPickup(
  context: CanvasRenderingContext2D,
  tier: TreasureMultiplierTier,
  beaconRadius: number,
  now: number,
) {
  // Wormate's useful hierarchy lesson is proportion, not art direction:
  // boosters stay close to the food scale so the field remains readable.
  // Wormifi keeps its own bare, extruded number language at that compact size.
  beaconRadius = Math.max(12, beaconRadius * 0.86);
  const rare = tier === 10;
  const strong = tier === 5;
  const lift = (Math.sin(now * 0.0042 + tier) + 1) * beaconRadius * 0.1;
  const glyphY = -beaconRadius * 0.2 - lift;
  const glyph = `${tier}×`;
  const fontSize = Math.max(24, beaconRadius * (tier === 10 ? 1.28 : 1.46));

  // A detached floor shadow makes the bare number feel physically suspended.
  // There is deliberately no coin, medallion, square, card, or sprite behind it.
  context.globalAlpha = 0.28;
  context.fillStyle = "#020611";
  context.beginPath();
  context.ellipse(
    0,
    beaconRadius * 0.72,
    beaconRadius * 0.72,
    beaconRadius * 0.2,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.globalAlpha = 1;
  context.font = `950 ${fontSize}px "Baloo 2", Inter, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";

  // Offset dark-to-bright layers form an actual extruded edge instead of a
  // flat emoji or coin-stamped label.
  const depth = Math.max(2, Math.round(beaconRadius * 0.2));
  for (let layer = depth; layer >= 1; layer -= 1) {
    const ratio = layer / depth;
    context.fillStyle = rare
      ? `rgba(${Math.round(37 + ratio * 45)}, 12, ${Math.round(82 + ratio * 50)}, 0.98)`
      : strong
        ? `rgba(3, ${Math.round(68 + ratio * 42)}, ${Math.round(75 + ratio * 48)}, 0.98)`
        : `rgba(${Math.round(83 + ratio * 38)}, ${Math.round(39 + ratio * 28)}, 3, 0.98)`;
    context.fillText(glyph, layer * 0.42, glyphY + layer * 0.5);
  }

  context.strokeStyle = rare ? "#fff3ff" : strong ? "#d9fff4" : "#fff0a2";
  context.lineWidth = Math.max(1.5, fontSize * 0.075);
  context.shadowColor = rare ? "#e978ff" : strong ? "#42f3cf" : "#ffd75e";
  context.shadowBlur = rare ? 12 : 8;
  context.strokeText(glyph, 0, glyphY);
  const face = context.createLinearGradient(0, glyphY - fontSize * 0.55, 0, glyphY + fontSize * 0.45);
  face.addColorStop(0, "#ffffff");
  face.addColorStop(0.18, rare ? "#f2b9ff" : strong ? "#b9ffeb" : "#fff4a8");
  face.addColorStop(0.58, rare ? "#ba57ef" : strong ? "#2bd6b1" : "#ffc739");
  face.addColorStop(1, rare ? "#7423b5" : strong ? "#087d82" : "#e17a0b");
  context.fillStyle = face;
  context.fillText(glyph, 0, glyphY);
  context.shadowBlur = 0;

  // One restrained glint keeps the small type readable without rebuilding a
  // circular potion, coin, or badge around it.
  const glintPhase = (Math.sin(now * 0.007 + tier * 1.7) + 1) / 2;
  context.globalAlpha = 0.42 + glintPhase * 0.58;
  context.fillStyle = "#ffffff";
  context.shadowColor = rare ? "#f3a9ff" : strong ? "#a9ffed" : "#fff0a8";
  context.shadowBlur = 9;
  const glintX = -beaconRadius * 0.64;
  const glintY = glyphY - fontSize * 0.52;
  const glintSize = beaconRadius * (0.12 + glintPhase * 0.1);
  context.beginPath();
  context.moveTo(glintX, glintY - glintSize);
  context.lineTo(glintX + glintSize * 0.3, glintY - glintSize * 0.25);
  context.lineTo(glintX + glintSize, glintY);
  context.lineTo(glintX + glintSize * 0.3, glintY + glintSize * 0.25);
  context.lineTo(glintX, glintY + glintSize);
  context.lineTo(glintX - glintSize * 0.3, glintY + glintSize * 0.25);
  context.lineTo(glintX - glintSize, glintY);
  context.lineTo(glintX - glintSize * 0.3, glintY - glintSize * 0.25);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
  context.shadowBlur = 0;
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
  if (relic.relicKind === "gilded-ledger" && drop.relicTier) {
    drawGildedMultiplierPickup(
      context,
      drop.relicTier,
      beaconRadius,
      options.now,
    );
    context.restore();
    return model;
  }
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
  if (
    relic.ground.spriteName === "treasure-multiplier" ||
    !drawPirateAtlasSprite(context, relic.ground.spriteName, {
      x: 0,
      y: 0,
      size: spriteSize,
      rotation: model.spriteRotation,
    })
  ) {
    drawRelicFallback(context, relic, beaconRadius * 0.78);
  }

  // Icon, orbit, color, and pickup motion are the complete visible cue. Full
  // names and effect copy stay in the lobby and accessible DOM status.
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

  if (relic.relicKind === "gilded-ledger" && model.relicTier) {
    context.rotate(safeNow * 0.00055);
    context.globalAlpha = 0.5;
    context.font = `950 ${Math.max(9, headRadius * 0.56)}px "Baloo 2", Inter, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let marker = 0; marker < 3; marker += 1) {
      const angle = marker * (Math.PI * 2 / 3);
      context.fillText(
        `${model.relicTier}×`,
        Math.cos(angle) * effectRadius * 0.82,
        Math.sin(angle) * effectRadius * 0.82,
      );
    }
  } else if (relic.relicKind === "emerald-spyglass") {
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

  if (relic.relicKind === "gilded-ledger" && model.relicTier) {
    context.fillStyle = "#fff1a0";
    context.strokeStyle = "rgba(28, 10, 4, 0.9)";
    context.lineWidth = Math.max(1.5, radius * 0.16);
    context.font = `950 ${Math.max(11, radius * 1.18)}px "Baloo 2", Inter, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    const glyph = `${model.relicTier}×`;
    context.strokeText(glyph, 0, 0.5);
    context.fillText(glyph, 0, 0.5);
  } else {
    const rotation = spriteRotation(relic.relicKind, safeNow) * 0.48;
    if (
      relic.ground.spriteName === "treasure-multiplier" ||
      !drawPirateAtlasSprite(context, relic.ground.spriteName, {
        x: 0,
        y: 0,
        size: radius * 2.15,
        rotation,
      })
    ) {
      drawRelicFallback(context, relic, radius * 0.74, model.timerRatio);
    }
  }
  context.restore();
}

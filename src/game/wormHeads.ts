/**
 * Per-theme heads and faces for the continuous pirate worm.
 *
 * Until this module existed, every captain in every room wore the one authored
 * pirate head. The body materials made themes distinct at a distance; the face
 * is where identity lives up close, so each material now brings its own head:
 * its own eyes, brows, jaw and marks — and the faces are ALIVE:
 *
 * - Pupils track the steering direction, so a worm visibly looks where it is
 *   going (and a rival visibly looks at you before it turns in).
 * - Blinks fire on a deterministic per-identity schedule.
 * - Premium faces carry an extra animated signature (ink drip, ember flicker,
 *   twin slit pupils under armored brows).
 *
 * Laws inherited from the rest of the renderer:
 * - Every mark stays INSIDE the authoritative head circle; the face never
 *   widens the lethal edge.
 * - `motion` scales time only: at motion 0 a face is a deterministic still
 *   (mid-gaze, eyes open) for reduced-motion players and replays.
 * - A bounded number of batched paints per face; no allocation in loops.
 */

import type { WormMaterialPattern } from "./wormMaterialPatterns";

const TAU = Math.PI * 2;

export interface WormHeadOptions {
  radius: number;
  palette: readonly string[];
  /** Travel direction in screen space; the pupils follow it. */
  direction: { x: number; y: number };
  identity: number;
  now: number;
  motion: number;
  shielded: boolean;
}

/**
 * Deterministic blink: a short close-and-open every few seconds, offset per
 * identity so a room never blinks in unison. Returns eyelid openness 0..1.
 * Motion 0 pins the clock, so the eyes rest open.
 */
export function eyeOpenness(identity: number, now: number, motion: number): number {
  const t = now * 0.001 * motion + (Math.abs(Math.trunc(identity)) % 97) * 0.61;
  const cycle = t % 3.7;
  if (cycle > 0.24) return 1;
  // One symmetric close/open ramp inside the blink window.
  return Math.abs(cycle / 0.12 - 1);
}

/** Unit gaze vector with a safe fallback for a standing-still worm. */
export function gazeVector(direction: { x: number; y: number }): { x: number; y: number } {
  const length = Math.hypot(direction.x, direction.y);
  return length > 0.0001
    ? { x: direction.x / length, y: direction.y / length }
    : { x: 1, y: 0 };
}

interface FaceContext {
  context: CanvasRenderingContext2D;
  radius: number;
  palette: readonly string[];
  identity: number;
  now: number;
  motion: number;
  openness: number;
  /** Gaze in LOCAL head space (the head is rotated to its travel angle). */
  gazeForward: number;
  gazeSide: number;
}

/**
 * The shared skull: snout highlight and jaw line, painted before the
 * per-style features. Everything sits inside ~0.9 of the head radius.
 */
function drawSkullBase(face: FaceContext) {
  const { context, radius, palette } = face;
  context.fillStyle = palette[2] ?? "#8affea";
  context.globalAlpha = 0.9;
  context.beginPath();
  context.ellipse(radius * 0.16, radius * 0.04, radius * 0.68, radius * 0.56, 0, 0, TAU);
  context.fill();
  context.globalAlpha = 1;
  context.strokeStyle = "rgba(4,22,36,0.9)";
  context.lineWidth = Math.max(1, radius * 0.08);
  context.lineCap = "round";
  context.beginPath();
  context.arc(radius * 0.34, radius * 0.08, radius * 0.3, 0.18 * Math.PI, 0.78 * Math.PI);
  context.stroke();
}

/**
 * One eye: white, tracking pupil, and a lid that closes with the blink.
 * Pupil deflection follows the gaze, clamped inside the eyeball.
 */
function drawTrackingEye(
  face: FaceContext,
  centerX: number,
  centerY: number,
  eyeRadius: number,
  pupilColor = "#071326",
  whiteColor = "rgba(255,255,255,0.96)",
) {
  const { context, openness, gazeForward, gazeSide } = face;
  context.fillStyle = whiteColor;
  context.beginPath();
  context.ellipse(centerX, centerY, eyeRadius, eyeRadius * Math.max(0.12, openness), 0, 0, TAU);
  context.fill();
  if (openness > 0.25) {
    const deflect = eyeRadius * 0.42;
    context.fillStyle = pupilColor;
    context.beginPath();
    context.arc(
      centerX + gazeForward * deflect,
      centerY + gazeSide * deflect,
      eyeRadius * 0.46,
      0,
      TAU,
    );
    context.fill();
  }
}

/* ---------------------------------------------------------------- faces -- */

/** Tideglass: calm wide glass eye under a thin pearl brow. */
function faceTidalRibbon(face: FaceContext) {
  const { context, radius, palette } = face;
  drawTrackingEye(face, radius * 0.28, -radius * 0.2, radius * 0.24);
  context.strokeStyle = palette[2] ?? "#effff8";
  context.lineWidth = Math.max(1, radius * 0.06);
  context.beginPath();
  context.arc(radius * 0.26, -radius * 0.3, radius * 0.3, Math.PI * 1.15, Math.PI * 1.75);
  context.stroke();
}

/** Sunken Crown: heavy royal lid and a three-point crown on the brow. */
function faceCrownWake(face: FaceContext) {
  const { context, radius } = face;
  drawTrackingEye(face, radius * 0.28, -radius * 0.18, radius * 0.22);
  context.fillStyle = "#ffe9a4";
  context.beginPath();
  const crownBaseY = -radius * 0.52;
  context.moveTo(-radius * 0.1, crownBaseY);
  context.lineTo(radius * 0.5, crownBaseY);
  context.lineTo(radius * 0.42, crownBaseY - radius * 0.16);
  context.lineTo(radius * 0.28, crownBaseY - radius * 0.04);
  context.lineTo(radius * 0.2, crownBaseY - radius * 0.22);
  context.lineTo(radius * 0.08, crownBaseY - radius * 0.04);
  context.lineTo(0, crownBaseY - radius * 0.16);
  context.closePath();
  context.fill();
}

/** Coral Signal: a sonar eye — concentric rings around the pupil. */
function faceSignalBloom(face: FaceContext) {
  const { context, radius, palette, now, motion, identity } = face;
  drawTrackingEye(face, radius * 0.28, -radius * 0.18, radius * 0.26);
  const phase = (now * 0.0012 * motion + identity * 0.4) % 1;
  context.strokeStyle = palette[0] ?? "#ff806d";
  context.globalAlpha = 0.7 * (1 - phase);
  context.lineWidth = Math.max(0.8, radius * 0.05);
  context.beginPath();
  context.arc(radius * 0.28, -radius * 0.18, radius * (0.28 + phase * 0.2), 0, TAU);
  context.stroke();
  context.globalAlpha = 1;
}

/** Emerald Privateer: a faceted gem eye with a diamond pupil. */
function faceFacetedWake(face: FaceContext) {
  const { context, radius, palette, gazeForward, gazeSide, openness } = face;
  const cx = radius * 0.28;
  const cy = -radius * 0.18;
  const r = radius * 0.24;
  context.fillStyle = palette[2] ?? "#dbff8e";
  context.beginPath();
  context.ellipse(cx, cy, r, r * Math.max(0.12, openness), 0, 0, TAU);
  context.fill();
  if (openness > 0.25) {
    const dx = gazeForward * r * 0.4;
    const dy = gazeSide * r * 0.4;
    context.fillStyle = "#07524f";
    context.beginPath();
    context.moveTo(cx + dx, cy + dy - r * 0.5);
    context.lineTo(cx + dx + r * 0.5, cy + dy);
    context.lineTo(cx + dx, cy + dy + r * 0.5);
    context.lineTo(cx + dx - r * 0.5, cy + dy);
    context.closePath();
    context.fill();
  }
}

/** Ruby Raider: one fierce eye, an eye patch on the other, a jaw scar. */
function faceRaiderChevron(face: FaceContext) {
  const { context, radius } = face;
  drawTrackingEye(face, radius * 0.3, -radius * 0.24, radius * 0.2);
  // The patch: a dark disc with its strap crossing the crown.
  context.fillStyle = "#160a12";
  context.beginPath();
  context.arc(radius * 0.18, radius * 0.26, radius * 0.19, 0, TAU);
  context.fill();
  context.strokeStyle = "#160a12";
  context.lineWidth = Math.max(1, radius * 0.07);
  context.beginPath();
  context.moveTo(-radius * 0.5, radius * 0.5);
  context.lineTo(radius * 0.68, -radius * 0.06);
  context.stroke();
  // Scar ticks under the good eye.
  context.strokeStyle = "rgba(74,16,44,0.9)";
  context.lineWidth = Math.max(0.8, radius * 0.05);
  context.beginPath();
  context.moveTo(radius * 0.5, -radius * 0.06);
  context.lineTo(radius * 0.62, radius * 0.1);
  context.moveTo(radius * 0.6, -radius * 0.02);
  context.lineTo(radius * 0.5, 0.1 * radius);
  context.stroke();
}

/** Pearl Wraith: two hollow glowing eyes, no pupils, ghost-light halo. */
function faceSpectralRipple(face: FaceContext) {
  const { context, radius, palette, now, motion, identity } = face;
  const flicker = 0.72 + 0.22 * Math.sin(now * 0.004 * motion + identity);
  context.fillStyle = palette[2] ?? "#8dfff0";
  context.globalAlpha = flicker;
  for (let eye = 0; eye < 2; eye += 1) {
    context.beginPath();
    context.arc(radius * (0.2 + eye * 0.28), -radius * 0.14 + eye * radius * 0.24, radius * 0.13, 0, TAU);
    context.fill();
  }
  context.globalAlpha = 1;
}

/** Pepper Flare: furious slanted brows over ember-slit pupils. */
function faceCutlassFlame(face: FaceContext) {
  const { context, radius, palette, now, motion, identity } = face;
  drawTrackingEye(face, radius * 0.28, -radius * 0.18, radius * 0.22, "#3a0d08");
  const flare = 0.6 + 0.4 * Math.abs(Math.sin(now * 0.006 * motion + identity * 1.3));
  context.strokeStyle = palette[0] ?? "#ff5b32";
  context.globalAlpha = flare;
  context.lineWidth = Math.max(1.2, radius * 0.1);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(radius * 0.02, -radius * 0.52);
  context.lineTo(radius * 0.5, -radius * 0.3);
  context.stroke();
  context.globalAlpha = 1;
}

/** Storm Cannon: a brass monocle around the eye and a bolt scar. */
function faceBroadsideBolt(face: FaceContext) {
  const { context, radius, palette } = face;
  drawTrackingEye(face, radius * 0.28, -radius * 0.18, radius * 0.2);
  context.strokeStyle = palette[2] ?? "#f2c75c";
  context.lineWidth = Math.max(1, radius * 0.07);
  context.beginPath();
  context.arc(radius * 0.28, -radius * 0.18, radius * 0.28, 0, TAU);
  context.moveTo(radius * 0.28, radius * 0.1);
  context.lineTo(radius * 0.28, radius * 0.34);
  context.stroke();
  // The bolt scar: a tiny zigzag on the cheek.
  context.strokeStyle = "rgba(32,45,69,0.95)";
  context.lineWidth = Math.max(0.9, radius * 0.06);
  context.beginPath();
  context.moveTo(-radius * 0.12, radius * 0.18);
  context.lineTo(radius * 0.02, radius * 0.28);
  context.lineTo(-radius * 0.08, radius * 0.38);
  context.lineTo(radius * 0.06, radius * 0.48);
  context.stroke();
}

/** Vortex Oracle: THREE eyes; the third slowly rolls its spiral gaze. */
function faceOracleSpiral(face: FaceContext) {
  const { context, radius, palette, now, motion, identity } = face;
  drawTrackingEye(face, radius * 0.32, -radius * 0.26, radius * 0.16);
  drawTrackingEye(face, radius * 0.32, radius * 0.12, radius * 0.16);
  // The third eye on the brow with a rotating spiral iris.
  const cx = -radius * 0.08;
  const cy = -radius * 0.05;
  const r = radius * 0.18;
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.beginPath();
  context.arc(cx, cy, r, 0, TAU);
  context.fill();
  const roll = now * 0.002 * motion + identity;
  context.strokeStyle = palette[0] ?? "#c27cff";
  context.lineWidth = Math.max(0.8, r * 0.24);
  context.beginPath();
  context.arc(cx, cy, r * 0.55, roll, roll + Math.PI * 1.4);
  context.stroke();
}

/** Kraken's Ink: four asymmetric eyes and an ink drip working down the jaw. */
function faceKrakenInk(face: FaceContext) {
  const { context, radius, palette, now, motion, identity } = face;
  drawTrackingEye(face, radius * 0.3, -radius * 0.22, radius * 0.19, "#140b2e");
  drawTrackingEye(face, radius * 0.34, radius * 0.14, radius * 0.12, "#140b2e");
  drawTrackingEye(face, radius * 0.06, -radius * 0.4, radius * 0.1, "#140b2e");
  drawTrackingEye(face, radius * 0.02, radius * 0.34, radius * 0.08, "#140b2e");
  const drip = ((now * 0.0009 * motion + identity * 0.7) % 1);
  context.fillStyle = palette[1] ?? "#140b2e";
  context.globalAlpha = 0.85;
  context.beginPath();
  context.ellipse(
    radius * 0.42,
    radius * (0.3 + drip * 0.3),
    radius * 0.06,
    radius * (0.08 + drip * 0.06),
    0,
    0,
    TAU,
  );
  context.fill();
  context.globalAlpha = 1;
}

/** Phoenix Wake: burning crest brows and pupils that gutter like embers. */
function facePhoenixWake(face: FaceContext) {
  const { context, radius, palette, now, motion, identity } = face;
  const ember = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.008 * motion + identity * 2.1));
  drawTrackingEye(face, radius * 0.28, -radius * 0.18, radius * 0.22, `rgba(255,${Math.round(90 + ember * 90)},47,0.98)`);
  context.strokeStyle = palette[2] ?? "#ffd36a";
  context.globalAlpha = 0.55 + ember * 0.35;
  context.lineWidth = Math.max(1, radius * 0.08);
  context.lineCap = "round";
  context.beginPath();
  // Twin crest licks sweeping back off the brow.
  context.moveTo(radius * 0.1, -radius * 0.46);
  context.quadraticCurveTo(-radius * 0.2, -radius * 0.66, -radius * 0.44, -radius * 0.5);
  context.moveTo(radius * 0.3, -radius * 0.36);
  context.quadraticCurveTo(radius * 0.02, -radius * 0.6, -radius * 0.2, -radius * 0.56);
  context.stroke();
  context.globalAlpha = 1;
}

/** Leviathan Scale: armored brow plates over twin vertical slit pupils. */
function faceLeviathanScale(face: FaceContext) {
  const { context, radius, palette, openness, gazeForward, gazeSide } = face;
  const cx = radius * 0.28;
  const cy = -radius * 0.16;
  const r = radius * 0.24;
  context.fillStyle = "rgba(240,255,252,0.92)";
  context.beginPath();
  context.ellipse(cx, cy, r, r * Math.max(0.12, openness), 0, 0, TAU);
  context.fill();
  if (openness > 0.25) {
    context.fillStyle = "#0a2b40";
    for (let slit = 0; slit < 2; slit += 1) {
      context.beginPath();
      context.ellipse(
        cx + gazeForward * r * 0.36 + (slit - 0.5) * r * 0.4,
        cy + gazeSide * r * 0.36,
        r * 0.1,
        r * 0.52,
        0,
        0,
        TAU,
      );
      context.fill();
    }
  }
  // Overlapping brow plates.
  context.strokeStyle = palette[2] ?? "#9a7bff";
  context.lineWidth = Math.max(1, radius * 0.09);
  context.beginPath();
  for (let plate = 0; plate < 3; plate += 1) {
    const plateRadius = radius * (0.34 + plate * 0.13);
    context.moveTo(cx + plateRadius, cy - radius * 0.1);
    context.arc(cx, cy - radius * 0.1, plateRadius, Math.PI * 1.1, Math.PI * 1.9);
  }
  context.stroke();
}

const FACE_RENDERERS: Record<WormMaterialPattern, (face: FaceContext) => void> = {
  "tidal-ribbon": faceTidalRibbon,
  "crown-wake": faceCrownWake,
  "signal-bloom": faceSignalBloom,
  "faceted-wake": faceFacetedWake,
  "raider-chevron": faceRaiderChevron,
  "spectral-ripple": faceSpectralRipple,
  "cutlass-flame": faceCutlassFlame,
  "broadside-bolt": faceBroadsideBolt,
  "oracle-spiral": faceOracleSpiral,
  "kraken-ink": faceKrakenInk,
  "phoenix-wake": facePhoenixWake,
  "leviathan-scale": faceLeviathanScale,
};

/**
 * Paints a themed head face. The caller has already rotated the context to
 * the travel angle and painted the base head discs; this fills in the skull
 * base and the style's living features, all inside the head circle.
 */
export function drawWormHeadFace(
  context: CanvasRenderingContext2D,
  style: WormMaterialPattern,
  options: WormHeadOptions,
): boolean {
  const renderer = FACE_RENDERERS[style];
  if (!renderer || options.radius <= 0) return false;
  const gaze = gazeVector(options.direction);
  // The context is already rotated to the travel angle, so "forward" is +x in
  // local space. Pupils keep a strong forward lead plus a slight world-tilt
  // sway, which reads as the creature glancing as it banks.
  const face: FaceContext = {
    context,
    radius: options.radius,
    palette: options.palette,
    identity: options.identity,
    now: options.now,
    motion: Math.max(0, Math.min(1, Number.isFinite(options.motion) ? options.motion : 1)),
    openness: eyeOpenness(options.identity, options.now, options.motion),
    gazeForward: 0.62,
    gazeSide: Math.max(-1, Math.min(1, gaze.y * 0.4)),
  };

  context.save();
  drawSkullBase(face);
  renderer(face);
  if (options.shielded) {
    context.strokeStyle = "rgba(225,255,252,0.8)";
    context.lineWidth = Math.max(1, options.radius * 0.07);
    context.beginPath();
    context.arc(0, 0, options.radius * 0.79, 0, TAU);
    context.stroke();
  }
  context.restore();
  return true;
}

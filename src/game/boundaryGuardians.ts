import type { Vec2 } from "./types";
import type { ArenaVisualThemeId } from "./worldCosmetics";

const TWO_PI = Math.PI * 2;

export type BoundaryGuardianKind = "shark" | "kraken" | "leviathan" | "dragon";

export interface BoundaryGuardianSpec {
  themeId: ArenaVisualThemeId;
  label: string;
  roster: string;
  commonKind: BoundaryGuardianKind;
  apexKind: BoundaryGuardianKind;
  moatColor: string;
  wallColor: string;
  wallGlowColor: string;
  bodyColor: string;
  accentColor: string;
  eyeColor: string;
}

export interface BoundaryGuardianStrike {
  position: Readonly<Vec2>;
  startedAt: number;
  until: number;
}

export interface BoundaryGuardianLayoutSlot {
  angle: number;
  radialDistance: number;
  apex: boolean;
}

export interface DrawBoundaryGuardiansOptions {
  center: Readonly<Vec2>;
  radius: number;
  zoom: number;
  width: number;
  height: number;
  now: number;
  reducedMotion: boolean;
  themeId: ArenaVisualThemeId;
  strike?: BoundaryGuardianStrike;
}

export const BOUNDARY_GUARDIAN_CATALOG: readonly BoundaryGuardianSpec[] = Object.freeze([
  Object.freeze({
    themeId: "midnight-chart",
    label: "SHARK & KRAKEN MOAT",
    roster: "Reef sharks circle between ancient kraken sentries.",
    commonKind: "shark",
    apexKind: "kraken",
    moatColor: "rgba(43, 170, 211, 0.18)",
    wallColor: "#55d8ee",
    wallGlowColor: "#20d7ff",
    bodyColor: "#123b55",
    accentColor: "#50d9e8",
    eyeColor: "#ffd966",
  }),
  Object.freeze({
    themeId: "emerald-depths",
    label: "ABYSSAL LEVIATHAN MOAT",
    roster: "Cold-water leviathans patrol between emerald kraken.",
    commonKind: "leviathan",
    apexKind: "kraken",
    moatColor: "rgba(35, 214, 168, 0.16)",
    wallColor: "#61e8c5",
    wallGlowColor: "#21d6a8",
    bodyColor: "#0a544e",
    accentColor: "#63ffd0",
    eyeColor: "#d5ff6e",
  }),
  Object.freeze({
    themeId: "candy-nebula",
    label: "CANDY LEVIATHAN MOAT",
    roster: "Gummy leviathans guard the frosting current.",
    commonKind: "leviathan",
    apexKind: "shark",
    moatColor: "rgba(227, 89, 255, 0.15)",
    wallColor: "#e66fe9",
    wallGlowColor: "#ff68d4",
    bodyColor: "#7f3aa1",
    accentColor: "#ff8ed8",
    eyeColor: "#fff17a",
  }),
  Object.freeze({
    themeId: "volcanic-vault",
    label: "MAGMA DRAGON MOAT",
    roster: "Magma dragons and fire wyrms guard the vault rim.",
    commonKind: "dragon",
    apexKind: "dragon",
    moatColor: "rgba(255, 88, 56, 0.16)",
    wallColor: "#ff8d4b",
    wallGlowColor: "#ff4c32",
    bodyColor: "#6e2027",
    accentColor: "#ff9c45",
    eyeColor: "#fff07a",
  }),
]);

export function getBoundaryGuardianSpec(themeId: ArenaVisualThemeId): BoundaryGuardianSpec {
  return BOUNDARY_GUARDIAN_CATALOG.find((entry) => entry.themeId === themeId)
    ?? BOUNDARY_GUARDIAN_CATALOG[0];
}

export function getBoundaryGuardianLayout(
  radius: number,
  zoom: number,
  now: number,
  reducedMotion: boolean,
): BoundaryGuardianLayoutSlot[] {
  const safeRadius = Math.max(1, Number.isFinite(radius) ? radius : 1);
  const safeZoom = Math.max(0.05, Number.isFinite(zoom) ? zoom : 1);
  const count = Math.max(12, Math.min(36, Math.round((TWO_PI * safeRadius) / 245)));
  const patrol = reducedMotion ? 0 : now * 0.000025;
  const moatDepth = Math.max(28, 76 * safeZoom);
  return Array.from({ length: count }, (_, index) => ({
    angle: (index / count) * TWO_PI + patrol,
    radialDistance: safeRadius + moatDepth +
      (reducedMotion ? 0 : Math.sin(now * 0.0012 + index * 1.73) * Math.max(2, 5 * safeZoom)),
    apex: index % 7 === 3,
  }));
}

function angularDistance(first: number, second: number): number {
  return Math.abs(Math.atan2(Math.sin(first - second), Math.cos(first - second)));
}

function strikeIntensity(strike: BoundaryGuardianStrike | undefined, now: number): number {
  if (!strike || now < strike.startedAt || now >= strike.until) return 0;
  const duration = Math.max(1, strike.until - strike.startedAt);
  const progress = (now - strike.startedAt) / duration;
  return Math.sin(Math.PI * Math.max(0, Math.min(1, progress)));
}

function drawShark(
  context: CanvasRenderingContext2D,
  size: number,
  spec: BoundaryGuardianSpec,
  attack: number,
): void {
  context.fillStyle = spec.bodyColor;
  context.beginPath();
  context.ellipse(0, 0, size, size * 0.38, 0, 0, TWO_PI);
  context.fill();
  context.beginPath();
  context.moveTo(-size * 0.82, 0);
  context.lineTo(-size * 1.42, -size * 0.55);
  context.lineTo(-size * 1.25, 0);
  context.lineTo(-size * 1.42, size * 0.55);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(-size * 0.05, -size * 0.2);
  context.lineTo(-size * 0.35, -size * 0.88);
  context.lineTo(size * 0.3, -size * 0.24);
  context.closePath();
  context.fill();
  context.fillStyle = spec.eyeColor;
  context.beginPath();
  context.arc(size * 0.62, -size * 0.12, Math.max(1.2, size * 0.075), 0, TWO_PI);
  context.fill();
  context.strokeStyle = spec.accentColor;
  context.lineWidth = Math.max(1, size * 0.06);
  context.beginPath();
  context.arc(size * 0.69, size * 0.06, size * (0.22 + attack * 0.08), 0.12, 1.15);
  context.stroke();
}

function drawKraken(
  context: CanvasRenderingContext2D,
  size: number,
  spec: BoundaryGuardianSpec,
  attack: number,
): void {
  context.strokeStyle = spec.accentColor;
  context.lineWidth = Math.max(2, size * 0.14);
  context.lineCap = "round";
  for (let index = -2; index <= 2; index += 1) {
    context.beginPath();
    context.moveTo(-size * 0.4, index * size * 0.12);
    context.bezierCurveTo(
      -size * (0.75 + attack * 0.18),
      index * size * 0.42,
      -size * 1.1,
      -index * size * 0.28,
      -size * 1.35,
      index * size * 0.24,
    );
    context.stroke();
  }
  context.fillStyle = spec.bodyColor;
  context.beginPath();
  context.ellipse(size * 0.15, 0, size * 0.72, size * 0.62, 0, 0, TWO_PI);
  context.fill();
  context.fillStyle = spec.eyeColor;
  for (const y of [-0.2, 0.2]) {
    context.beginPath();
    context.arc(size * 0.52, size * y, Math.max(1.5, size * 0.09), 0, TWO_PI);
    context.fill();
  }
}

function drawLeviathan(
  context: CanvasRenderingContext2D,
  size: number,
  spec: BoundaryGuardianSpec,
  attack: number,
): void {
  context.strokeStyle = spec.bodyColor;
  context.lineWidth = Math.max(4, size * 0.38);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-size * 1.45, 0);
  context.bezierCurveTo(-size * 0.9, -size * 0.6, -size * 0.4, size * 0.6, size * 0.2, 0);
  context.stroke();
  context.fillStyle = spec.bodyColor;
  context.beginPath();
  context.ellipse(size * 0.52, 0, size * (0.58 + attack * 0.08), size * 0.43, 0, 0, TWO_PI);
  context.fill();
  context.strokeStyle = spec.accentColor;
  context.lineWidth = Math.max(1, size * 0.075);
  context.beginPath();
  context.moveTo(-size * 1.1, -size * 0.1);
  context.quadraticCurveTo(-size * 0.65, -size * 0.45, -size * 0.25, -size * 0.05);
  context.stroke();
  context.fillStyle = spec.eyeColor;
  context.beginPath();
  context.arc(size * 0.76, -size * 0.13, Math.max(1.3, size * 0.08), 0, TWO_PI);
  context.fill();
}

function drawDragon(
  context: CanvasRenderingContext2D,
  size: number,
  spec: BoundaryGuardianSpec,
  attack: number,
): void {
  context.fillStyle = spec.accentColor;
  context.beginPath();
  context.moveTo(-size * 0.25, 0);
  context.lineTo(-size * 0.9, -size * (0.85 + attack * 0.1));
  context.lineTo(size * 0.05, -size * 0.32);
  context.lineTo(-size * 0.4, size * 0.82);
  context.lineTo(size * 0.25, size * 0.28);
  context.closePath();
  context.fill();
  context.strokeStyle = spec.bodyColor;
  context.lineWidth = Math.max(4, size * 0.34);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-size * 1.25, size * 0.1);
  context.quadraticCurveTo(-size * 0.35, -size * 0.35, size * 0.35, 0);
  context.stroke();
  context.fillStyle = spec.bodyColor;
  context.beginPath();
  context.ellipse(size * 0.62, 0, size * 0.52, size * 0.38, 0, 0, TWO_PI);
  context.fill();
  context.fillStyle = spec.eyeColor;
  context.beginPath();
  context.arc(size * 0.82, -size * 0.11, Math.max(1.3, size * 0.075), 0, TWO_PI);
  context.fill();
}

function drawGuardian(
  context: CanvasRenderingContext2D,
  kind: BoundaryGuardianKind,
  size: number,
  spec: BoundaryGuardianSpec,
  attack: number,
): void {
  if (kind === "shark") drawShark(context, size, spec, attack);
  else if (kind === "kraken") drawKraken(context, size, spec, attack);
  else if (kind === "leviathan") drawLeviathan(context, size, spec, attack);
  else drawDragon(context, size, spec, attack);
}

/**
 * Paints a quiet visual moat strictly outside the authoritative arena circle.
 * It is presentation only: no guardian participates in collision or spawning.
 */
export function drawBoundaryGuardians(
  context: CanvasRenderingContext2D,
  options: DrawBoundaryGuardiansOptions,
): void {
  const { center, radius, zoom, width, height, now, reducedMotion, themeId, strike } = options;
  if (!Number.isFinite(radius) || radius <= 0) return;
  const spec = getBoundaryGuardianSpec(themeId);
  const safeZoom = Math.max(0.05, zoom);
  const nearCurrent = radius + Math.max(10, 22 * safeZoom);
  const farCurrent = radius + Math.max(24, 50 * safeZoom);

  context.save();
  context.globalAlpha = 0.8;
  context.strokeStyle = spec.moatColor;
  context.lineWidth = Math.max(2, Math.min(5, 4 * safeZoom));
  context.beginPath();
  context.arc(center.x, center.y, nearCurrent, 0, TWO_PI);
  context.stroke();
  context.globalAlpha = 0.5;
  context.setLineDash([Math.max(8, 18 * safeZoom), Math.max(10, 24 * safeZoom)]);
  context.beginPath();
  context.arc(center.x, center.y, farCurrent, 0, TWO_PI);
  context.stroke();
  context.restore();

  const slots = getBoundaryGuardianLayout(radius, zoom, now, reducedMotion);
  const activeStrike = reducedMotion ? 0 : strikeIntensity(strike, now);
  const strikeAngle = strike ? Math.atan2(strike.position.y, strike.position.x) : 0;
  const strikeWindow = Math.PI / Math.max(6, slots.length / 2);
  const baseSize = Math.max(16, Math.min(34, 13 + 29 * Math.max(0.05, zoom)));

  for (const slot of slots) {
    const isStriker = activeStrike > 0 && angularDistance(slot.angle, strikeAngle) <= strikeWindow;
    const attack = isStriker ? activeStrike : 0;
    const radialDistance = Math.max(
      radius + Math.max(7, 12 * zoom),
      slot.radialDistance - attack * Math.max(18, 48 * zoom),
    );
    const x = center.x + Math.cos(slot.angle) * radialDistance;
    const y = center.y + Math.sin(slot.angle) * radialDistance;
    const size = baseSize * (slot.apex ? 1.26 : 1) * (1 + attack * 0.18);
    const margin = size * 2.2;
    if (x < -margin || y < -margin || x > width + margin || y > height + margin) continue;

    context.save();
    context.translate(x, y);
    context.rotate(slot.angle + Math.PI);
    context.globalAlpha = attack > 0 ? 0.94 : slot.apex ? 0.58 : 0.4;
    context.shadowColor = spec.accentColor;
    // Canvas shadow filters on several rotating paths were expensive enough to
    // disturb crowded frame pacing. Idle silhouettes use their own bright
    // accent geometry; only the one short death lunge receives a soft glow.
    context.shadowBlur = attack > 0 ? 10 : 0;
    drawGuardian(context, slot.apex ? spec.apexKind : spec.commonKind, size, spec, attack);
    context.restore();
  }
}

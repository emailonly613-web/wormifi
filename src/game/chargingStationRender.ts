import { getChargingDockPosition } from "./chargingStations";
import type {
  ChargingStationConfig,
  ChargingStationKind,
  ChargingStationPhase,
  ChargingStationState,
  Vec2,
} from "./types";

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function compactNumber(value: number) {
  return Number(value.toFixed(1)).toLocaleString();
}

function secondsLabel(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${safe >= 10 ? Math.ceil(safe) : safe.toFixed(1)}S`;
}

function harborGrowthMultiplier(progressRatio: number): 1 | 2 | 3 {
  if (progressRatio >= 2 / 3) return 3;
  if (progressRatio >= 1 / 3) return 2;
  return 1;
}

export interface ChargingStationView {
  station: Readonly<ChargingStationConfig>;
  state?: Readonly<ChargingStationState>;
}

export interface ChargingStationPresentation {
  stationId: string;
  stationName: string;
  kind: ChargingStationKind;
  phase: ChargingStationPhase | "syncing";
  icon: string;
  heading: string;
  detail: string;
  progressRatio: number;
  progressLabel: string;
  visualValue: string;
  active: boolean;
  ownedByViewer: boolean;
}

/**
 * One shared text/icon contract for the canvas label and both DOM HUDs. Every
 * number is derived from the static board config or the authoritative dynamic
 * station state; the client never predicts charge progress or cooldown.
 */
export function describeChargingStation(
  station: Readonly<ChargingStationConfig>,
  state: Readonly<ChargingStationState> | undefined,
  fixedStepSeconds: number,
  viewerPlayerId?: string,
): ChargingStationPresentation {
  const harbor = station.kind === "harbor";
  const safeStep = Number.isFinite(fixedStepSeconds) && fixedStepSeconds > 0
    ? fixedStepSeconds
    : 0;
  if (!state) {
    return {
      stationId: station.id,
      stationName: station.name,
      kind: station.kind ?? "capstan",
      phase: "syncing",
      icon: harbor ? "✦" : "…",
      heading: `${station.name} · SYNCING`,
      detail: "WAITING FOR AUTHORITATIVE STATION STATE",
      progressRatio: 0,
      progressLabel: "SYNCING",
      visualValue: harbor ? `+${compactNumber(station.massReward)}` : "",
      active: false,
      ownedByViewer: false,
    };
  }

  const ownedByViewer = Boolean(viewerPlayerId && state.playerId === viewerPlayerId);
  const occupiedByOther = Boolean(state.playerId && !ownedByViewer);
  const progressRatio = clamp(
    state.progressTicks / Math.max(1, state.requiredTicks),
    0,
    1,
  );
  const percent = Math.round(progressRatio * 100);

  if (state.phase === "ready") {
    return {
      stationId: station.id,
      stationName: station.name,
      kind: station.kind ?? "capstan",
      phase: state.phase,
      icon: harbor ? "⚡" : "⚓",
      heading: harbor ? `${station.name} · PAD READY` : `${station.name} · READY`,
      detail: harbor
        ? `STAY INSIDE ${secondsLabel(station.chargeDurationSeconds)} · GROWTH ×1 → ×2 → ×3 · UP TO +${compactNumber(station.massReward)} SIZE`
        : `DOCK HEAD · WRAP ${station.minimumWrappedSegments}+ CREW · HOLD ${secondsLabel(station.chargeDurationSeconds)} · +${compactNumber(station.massReward)} SIZE`,
      progressRatio: 0,
      progressLabel: "READY",
      visualValue: harbor ? `+${compactNumber(station.massReward)}` : "",
      active: false,
      ownedByViewer,
    };
  }

  if (state.phase === "charging") {
    const direction = state.windingDirection < 0 ? "COUNTERCLOCKWISE" : "CLOCKWISE";
    const remainingSeconds = Math.max(0, state.requiredTicks - state.progressTicks) * safeStep;
    const multiplier = harborGrowthMultiplier(progressRatio);
    return {
      stationId: station.id,
      stationName: station.name,
      kind: station.kind ?? "capstan",
      phase: state.phase,
      icon: harbor ? "⚡" : state.windingDirection < 0 ? "↺" : "↻",
      heading: harbor
        ? occupiedByOther
          ? `${station.name} · RIVAL CHARGING`
          : ownedByViewer
            ? `${station.name} · YOUR PAD`
            : `${station.name} · CHARGING`
        : occupiedByOther
          ? `${station.name} · RIVAL WINDING`
          : ownedByViewer
            ? `${station.name} · YOUR CHARGE`
            : `${station.name} · WINDING`,
      detail: harbor
        ? `×${multiplier} GROWTH · +${compactNumber(state.massAwarded)} NOW · ${secondsLabel(remainingSeconds)} TO MAX`
        : `${direction} · ${percent}% · ${secondsLabel(remainingSeconds)} TO +${compactNumber(station.massReward)} SIZE`,
      progressRatio,
      progressLabel: `${percent}% CHARGED`,
      visualValue: harbor ? `×${multiplier}` : "",
      active: true,
      ownedByViewer,
    };
  }

  if (state.phase === "interrupted") {
    const graceSeconds = state.graceTicksRemaining * safeStep;
    return {
      stationId: station.id,
      stationName: station.name,
      kind: station.kind ?? "capstan",
      phase: state.phase,
      icon: "⚠",
      heading: harbor ? `${station.name} · PAD LOST` : `${station.name} · COIL BROKEN`,
      detail: harbor
        ? `RETURN WITHIN ${secondsLabel(graceSeconds)} · +${compactNumber(state.massAwarded)} SIZE KEPT`
        : `${occupiedByOther ? "RIVAL " : ""}RESUME WITHIN ${secondsLabel(graceSeconds)} · ${percent}% HELD`,
      progressRatio,
      progressLabel: `${percent}% HELD`,
      visualValue: harbor ? `×${harborGrowthMultiplier(progressRatio)}` : "",
      active: true,
      ownedByViewer,
    };
  }

  const fullCompletion = state.massAwarded + 1e-6 >= station.massReward;
  const cooldownSeconds = state.cooldownTicksRemaining * safeStep;
  const configuredCooldownSeconds = fullCompletion
    ? station.completionCooldownSeconds
    : station.resetCooldownSeconds;
  const configuredCooldownTicks = safeStep > 0
    ? Math.max(1, Math.ceil(configuredCooldownSeconds / safeStep))
    : Math.max(1, state.cooldownTicksRemaining);
  const cooldownRatio = clamp(
    1 - state.cooldownTicksRemaining / configuredCooldownTicks,
    0,
    1,
  );
  return {
    stationId: station.id,
    stationName: station.name,
    kind: station.kind ?? "capstan",
    phase: state.phase,
    icon: "⌛",
    heading: harbor ? `${station.name} · PAD CASHED` : `${station.name} · COOLDOWN`,
    detail: harbor
      ? cooldownSeconds <= 0
        ? `SAIL CLEAR · THEN CHARGE AGAIN · +${compactNumber(state.massAwarded)} SIZE BANKED`
        : `NEXT CHARGE IN ${secondsLabel(cooldownSeconds)} · +${compactNumber(state.massAwarded)} SIZE BANKED`
      : `${secondsLabel(cooldownSeconds)} REMAINING · ${compactNumber(state.massAwarded)} SIZE BANKED`,
    progressRatio: cooldownRatio,
    progressLabel: `${secondsLabel(cooldownSeconds)} COOLDOWN`,
    visualValue: harbor && fullCompletion
      ? `+${compactNumber(station.massReward)}`
      : "",
    active: false,
    ownedByViewer,
  };
}

/** Own active station wins; otherwise the nearest configured station wins. */
export function selectChargingStationPresentation(
  views: readonly ChargingStationView[],
  fixedStepSeconds: number,
  viewerPlayerId?: string,
  viewerPosition?: Readonly<Vec2>,
) {
  const selected = views
    .slice()
    .sort((first, second) => {
      const firstOwnActive = first.state?.playerId === viewerPlayerId &&
        (first.state?.phase === "charging" || first.state?.phase === "interrupted");
      const secondOwnActive = second.state?.playerId === viewerPlayerId &&
        (second.state?.phase === "charging" || second.state?.phase === "interrupted");
      if (firstOwnActive !== secondOwnActive) return firstOwnActive ? -1 : 1;
      if (viewerPosition) {
        const firstDistance = Math.hypot(
          first.station.position.x - viewerPosition.x,
          first.station.position.y - viewerPosition.y,
        );
        const secondDistance = Math.hypot(
          second.station.position.x - viewerPosition.x,
          second.station.position.y - viewerPosition.y,
        );
        if (firstDistance !== secondDistance) return firstDistance - secondDistance;
      }
      return first.station.id.localeCompare(second.station.id);
    })[0];
  return selected
    ? describeChargingStation(
        selected.station,
        selected.state,
        fixedStepSeconds,
        viewerPlayerId,
      )
    : undefined;
}

export interface DrawChargingStationFieldOptions {
  views: readonly ChargingStationView[];
  worldToScreen: (point: Vec2) => Vec2;
  zoom: number;
  width: number;
  height: number;
  fixedStepSeconds: number;
  viewerPlayerId?: string;
  now: number;
}

function phaseColor(phase: ChargingStationPresentation["phase"]) {
  if (phase === "charging") return "#77ffe2";
  if (phase === "interrupted") return "#ff9a63";
  if (phase === "cooldown") return "#8297ab";
  if (phase === "syncing") return "#7895a8";
  return "#ffd56c";
}

function drawHarborChargingPad(
  context: CanvasRenderingContext2D,
  station: Readonly<ChargingStationConfig>,
  state: Readonly<ChargingStationState> | undefined,
  presentation: Readonly<ChargingStationPresentation>,
  center: Readonly<Vec2>,
  padRadius: number,
  coreRadius: number,
  color: string,
  now: number,
  zoom: number,
) {
  const seed = [...station.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const active = presentation.phase === "charging";
  const progress = presentation.progressRatio;
  const multiplier = harborGrowthMultiplier(progress);
  const depth = clamp(padRadius * 0.13, 3, 12);
  const pulse = active ? 0.88 + Math.sin(now * 0.009 + seed) * 0.12 : 0.72;
  const tierPalette = station.id === "kraken-atoll"
    ? { dark: "#1b124d", mid: "#7047d9", bright: "#d5b9ff", flare: "#9f7cff" }
    : station.id === "coral-key"
      ? { dark: "#143f52", mid: "#e7638f", bright: "#ffe0a3", flare: "#ff77b7" }
      : { dark: "#183b4c", mid: "#b87919", bright: "#fff3a6", flare: "#ffd45d" };

  // Detached shadow and lowered base make the gameplay disc read as a raised,
  // floating object while the luminous top stays the exact accepted radius.
  context.globalAlpha = 0.38;
  context.fillStyle = "#020713";
  context.beginPath();
  context.ellipse(center.x, center.y + depth * 1.7, padRadius * 1.05, padRadius * 0.8, 0, 0, TAU);
  context.fill();

  const sideGradient = context.createLinearGradient(
    center.x,
    center.y - padRadius,
    center.x,
    center.y + padRadius + depth,
  );
  sideGradient.addColorStop(0, tierPalette.mid);
  sideGradient.addColorStop(0.62, tierPalette.dark);
  sideGradient.addColorStop(1, "#060b20");
  context.globalAlpha = presentation.phase === "cooldown" ? 0.48 : 0.96;
  context.fillStyle = sideGradient;
  context.beginPath();
  context.arc(center.x, center.y + depth, padRadius, 0, TAU);
  context.fill();

  const surface = context.createRadialGradient(
    center.x - padRadius * 0.32,
    center.y - padRadius * 0.38,
    Math.max(1, padRadius * 0.04),
    center.x,
    center.y,
    padRadius,
  );
  surface.addColorStop(0, tierPalette.bright);
  surface.addColorStop(0.12, tierPalette.mid);
  surface.addColorStop(0.48, tierPalette.dark);
  surface.addColorStop(0.78, "#071a30");
  surface.addColorStop(1, "#020817");
  context.globalAlpha = presentation.phase === "cooldown" ? 0.56 : 1;
  context.fillStyle = surface;
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, 2.5 * zoom);
  context.shadowColor = active ? tierPalette.flare : color;
  context.shadowBlur = active ? 18 * pulse : 8;
  context.beginPath();
  context.arc(center.x, center.y, padRadius, 0, TAU);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;

  // Concentric etched rings and rotating energy rails create depth and motion.
  context.globalAlpha = presentation.phase === "cooldown" ? 0.22 : 0.66;
  context.strokeStyle = tierPalette.bright;
  for (const ratio of [0.78, 0.52]) {
    context.lineWidth = Math.max(1, 1.2 * zoom);
    context.beginPath();
    context.arc(center.x, center.y, padRadius * ratio, 0, TAU);
    context.stroke();
  }
  const spin = now * 0.0018 + seed;
  context.globalAlpha = active ? 0.92 : 0.46;
  context.strokeStyle = active ? "#ffffff" : tierPalette.flare;
  context.lineWidth = Math.max(2, padRadius * 0.07);
  context.setLineDash([padRadius * 0.38, padRadius * 0.2]);
  context.lineDashOffset = -spin * padRadius * 0.24;
  context.beginPath();
  context.arc(center.x, center.y, padRadius * 0.66, spin, spin + TAU * 1.72);
  context.stroke();
  context.setLineDash([]);
  context.lineDashOffset = 0;

  // Three upward energy crests communicate "this makes you larger" without
  // covering the arena with instructions. Only the currently reached tier is
  // allowed the brightest flare, so this never suggests fake progress.
  for (let tier = 1; tier <= 3; tier += 1) {
    const reached = active ? tier <= multiplier : false;
    const crestY = center.y - padRadius * (0.28 + tier * 0.18);
    const halfWidth = padRadius * (0.1 + tier * 0.035);
    context.globalAlpha = reached ? 0.92 : 0.2;
    context.strokeStyle = reached ? "#ffffff" : tierPalette.bright;
    context.lineWidth = Math.max(1.2, padRadius * 0.035);
    context.beginPath();
    context.moveTo(center.x - halfWidth, crestY + halfWidth * 0.42);
    context.lineTo(center.x, crestY);
    context.lineTo(center.x + halfWidth, crestY + halfWidth * 0.42);
    context.stroke();
  }

  if (state && progress > 0) {
    context.globalAlpha = 0.98;
    context.strokeStyle = "#ffffff";
    context.shadowColor = tierPalette.flare;
    context.shadowBlur = active ? 16 : 8;
    context.lineWidth = Math.max(4, padRadius * 0.1);
    context.beginPath();
    context.arc(
      center.x,
      center.y,
      padRadius * 0.88,
      -Math.PI / 2,
      -Math.PI / 2 + TAU * progress,
    );
    context.stroke();
    context.shadowBlur = 0;
  }

  // Rising sparks make an occupied pad feel live without adding fake progress.
  if (active) {
    context.fillStyle = "#ffffff";
    context.shadowColor = tierPalette.flare;
    context.shadowBlur = 8;
    for (let spark = 0; spark < 6; spark += 1) {
      const phase = (now * 0.00055 + spark / 6 + seed * 0.013) % 1;
      const angle = spin + spark * TAU / 6;
      const radius = padRadius * (0.3 + (spark % 3) * 0.18);
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius - phase * padRadius * 0.55;
      context.globalAlpha = (1 - phase) * 0.85;
      context.beginPath();
      context.arc(x, y, clamp((1 - phase) * 2.5 * zoom, 1.1, 4), 0, TAU);
      context.fill();
    }
    context.shadowBlur = 0;
  }

  const hubRadius = Math.max(coreRadius, padRadius * 0.24);
  const hub = context.createRadialGradient(
    center.x - hubRadius * 0.3,
    center.y - hubRadius * 0.35,
    1,
    center.x,
    center.y,
    hubRadius,
  );
  hub.addColorStop(0, "#ffffff");
  hub.addColorStop(0.24, tierPalette.bright);
  hub.addColorStop(1, tierPalette.mid);
  context.globalAlpha = presentation.phase === "cooldown" ? 0.6 : 1;
  context.fillStyle = hub;
  context.beginPath();
  context.arc(center.x, center.y, hubRadius, 0, TAU);
  context.fill();

  context.globalAlpha = 1;
  context.fillStyle = "#071226";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `950 ${clamp(hubRadius * 0.9, 9, 24)}px "Baloo 2", Inter, sans-serif`;
  context.fillText(active ? `×${multiplier}` : "⚡", center.x, center.y + 1);
}

function drawOrbitPrizeBurst(
  context: CanvasRenderingContext2D,
  center: Readonly<Vec2>,
  radius: number,
  color: string,
  now: number,
  seed: number,
) {
  context.save();
  context.fillStyle = "#fff4b0";
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, radius * 0.045);
  context.shadowColor = color;
  context.shadowBlur = Math.min(16, radius * 0.48);
  for (let shard = 0; shard < 7; shard += 1) {
    const phase = (now * 0.00072 + shard / 7 + seed * 0.019) % 1;
    const angle = shard * TAU / 7 + seed * 0.07;
    const spread = radius * (0.16 + phase * 0.7);
    const x = center.x + Math.cos(angle) * spread;
    const y = center.y + Math.sin(angle) * spread - phase * radius * 0.66;
    const size = clamp(radius * (0.12 - phase * 0.045), 2.2, 7);
    context.globalAlpha = 1 - phase;
    context.beginPath();
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.72, y);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.72, y);
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.restore();
}

/**
 * Draws the exact configured core, valid wrap annulus and head dock. Progress
 * is only the latest authoritative snapshot/state; there is no client timer.
 */
export function drawChargingStationField(
  context: CanvasRenderingContext2D,
  options: DrawChargingStationFieldOptions,
) {
  const {
    views,
    worldToScreen,
    zoom,
    width,
    height,
    fixedStepSeconds,
    viewerPlayerId,
    now,
  } = options;
  if (!Number.isFinite(zoom) || zoom <= 0) return;

  for (const { station, state } of views.slice().sort((first, second) =>
    first.station.id.localeCompare(second.station.id)
  )) {
    const center = worldToScreen(station.position);
    const outerWorldRadius = station.wrapRadius + station.wrapTolerance;
    const outerRadius = outerWorldRadius * zoom;
    const margin = outerRadius + 74;
    if (
      center.x < -margin || center.y < -margin ||
      center.x > width + margin || center.y > height + margin
    ) continue;

    const presentation = describeChargingStation(
      station,
      state,
      fixedStepSeconds,
      viewerPlayerId,
    );
    const color = phaseColor(presentation.phase);
    const innerRadius = (station.wrapRadius - station.wrapTolerance) * zoom;
    const wrapRadius = station.wrapRadius * zoom;
    const coreRadius = station.coreRadius * zoom;
    const dock = worldToScreen(getChargingDockPosition(station));
    const dockRadius = station.dockRadius * zoom;
    const pulse = presentation.active ? 0.72 + Math.sin(now * 0.006) * 0.12 : 0.66;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    if (station.kind === "harbor") {
      drawHarborChargingPad(
        context,
        station,
        state,
        presentation,
        center,
        outerRadius,
        coreRadius,
        color,
        now,
        zoom,
      );

      // One, two, or three light pips communicate the pad tier at a glance.
      const pips = station.massReward >= 42 ? 3 : station.massReward >= 20 ? 2 : 1;
      context.shadowColor = color;
      context.shadowBlur = 8;
      context.fillStyle = "#fff6c7";
      for (let pip = 0; pip < pips; pip += 1) {
        const x = center.x + (pip - (pips - 1) / 2) * Math.max(7, 9 * zoom);
        const y = center.y + outerRadius + Math.max(9, 11 * zoom);
        context.beginPath();
        context.arc(x, y, clamp(2.4 * zoom, 2.4, 4.5), 0, TAU);
        context.fill();
      }
      if (
        presentation.phase === "cooldown" &&
        state &&
        state.massAwarded + 1e-6 >= station.massReward
      ) {
        context.shadowBlur = 14;
        context.fillStyle = "#fff4bd";
        context.font = `950 ${clamp(13 * zoom, 13, 24)}px "Baloo 2", Inter, sans-serif`;
        context.fillText(
          `+${compactNumber(station.massReward)}`,
          center.x,
          center.y - outerRadius - Math.max(9, 11 * zoom),
        );
      }
      context.restore();
      continue;
    }

    const orbitSeed = [...station.id].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    );
    const orbitSpin = now * 0.0015 + orbitSeed * 0.11;
    const completedPrize = Boolean(
      presentation.phase === "cooldown" &&
      state &&
      state.massAwarded + 1e-6 >= station.massReward
    );

    // The translucent band is exactly the configured valid wrap tolerance.
    // A soft outer aura and orbiting gems make the small objective visible
    // across open water without pretending the accepted gameplay lane is wider.
    context.globalAlpha = presentation.phase === "cooldown" ? 0.08 : 0.2;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = presentation.active ? 18 : 10;
    context.lineWidth = Math.max(2, station.wrapTolerance * 0.58 * zoom);
    context.beginPath();
    context.arc(center.x, center.y, outerRadius + Math.max(3, 5 * zoom), 0, TAU);
    context.stroke();
    context.shadowBlur = 0;

    context.globalAlpha = presentation.phase === "cooldown" ? 0.12 : 0.18;
    context.strokeStyle = color;
    context.lineWidth = station.wrapTolerance * 2 * zoom;
    context.beginPath();
    context.arc(center.x, center.y, wrapRadius, 0, TAU);
    context.stroke();

    // Explicit inner/outer marks make the accepted lane readable without
    // implying a larger client-side target.
    context.globalAlpha = 0.68;
    context.lineWidth = Math.max(1, 1.2 * zoom);
    context.setLineDash([Math.max(5, 9 * zoom), Math.max(4, 7 * zoom)]);
    for (const radius of [innerRadius, outerRadius]) {
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, TAU);
      context.stroke();
    }
    context.setLineDash([]);

    // Moving beads plus tangent arrowheads make "circle this ring" legible
    // without a sentence. Their motion is decorative; the progress arc below
    // remains the only authoritative completion signal.
    const orbitBeads = station.massReward >= 20 ? 8 : 6;
    for (let bead = 0; bead < orbitBeads; bead += 1) {
      const angle = orbitSpin + bead * TAU / orbitBeads;
      const beadX = center.x + Math.cos(angle) * wrapRadius;
      const beadY = center.y + Math.sin(angle) * wrapRadius;
      const beadRadius = clamp(
        (bead % 2 === 0 ? 2.8 : 1.8) * zoom,
        1.7,
        4.2,
      );
      context.globalAlpha = presentation.phase === "cooldown" ? 0.22 : 0.76;
      context.fillStyle = bead % 2 === 0 ? "#fff4ae" : color;
      context.shadowColor = color;
      context.shadowBlur = presentation.active ? 9 : 4;
      context.beginPath();
      context.arc(beadX, beadY, beadRadius, 0, TAU);
      context.fill();
    }
    context.shadowBlur = 0;
    for (let arrow = 0; arrow < 3; arrow += 1) {
      const angle = orbitSpin + arrow * TAU / 3;
      const x = center.x + Math.cos(angle) * outerRadius;
      const y = center.y + Math.sin(angle) * outerRadius;
      const tangentX = -Math.sin(angle);
      const tangentY = Math.cos(angle);
      const normalX = Math.cos(angle);
      const normalY = Math.sin(angle);
      const size = clamp(5 * zoom, 4, 9);
      context.globalAlpha = 0.72;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(x + tangentX * size, y + tangentY * size);
      context.lineTo(
        x - tangentX * size * 0.72 + normalX * size * 0.55,
        y - tangentY * size * 0.72 + normalY * size * 0.55,
      );
      context.lineTo(
        x - tangentX * size * 0.72 - normalX * size * 0.55,
        y - tangentY * size * 0.72 - normalY * size * 0.55,
      );
      context.closePath();
      context.fill();
    }

    if (state && presentation.progressRatio > 0) {
      const direction = state.windingDirection === 0 ? 1 : state.windingDirection;
      const arcLength = presentation.phase === "cooldown"
        ? TAU * presentation.progressRatio
        : station.requiredWrapRadians * presentation.progressRatio;
      const start = station.dockAngleRadians;
      const end = start + direction * arcLength;
      context.globalAlpha = pulse;
      context.strokeStyle = color;
      context.lineWidth = Math.max(4, station.wrapTolerance * 0.42 * zoom);
      context.beginPath();
      context.arc(center.x, center.y, wrapRadius, start, end, direction < 0);
      context.stroke();
    }

    // Exact dock circle: the bright eye-shaped target communicates that the
    // head, not the middle of the body, must occupy this configured disk.
    context.globalAlpha = 0.94;
    context.fillStyle = "rgba(4, 22, 35, 0.9)";
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, 2.2 * zoom);
    context.beginPath();
    context.arc(dock.x, dock.y, dockRadius, 0, TAU);
    context.fill();
    context.stroke();
    context.fillStyle = "#effff9";
    context.beginPath();
    context.ellipse(dock.x, dock.y, dockRadius * 0.48, dockRadius * 0.32, 0, 0, TAU);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(dock.x, dock.y, dockRadius * 0.14, 0, TAU);
    context.fill();

    // Capstan core uses the configured core radius. Spokes are decorative and
    // remain inside that circle.
    context.fillStyle = "rgba(15, 45, 55, 0.96)";
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, 2.4 * zoom);
    context.beginPath();
    context.arc(center.x, center.y, coreRadius, 0, TAU);
    context.fill();
    context.stroke();
    // A faceted prize locked in the core, with one/two reward pips beneath the
    // ring, makes the two risk tiers distinguishable from a glance.
    const gemSize = Math.max(4, coreRadius * 0.62);
    context.globalAlpha = presentation.phase === "cooldown" ? 0.48 : 1;
    context.fillStyle = "#fff1a6";
    context.shadowColor = color;
    context.shadowBlur = presentation.active ? 12 : 6;
    context.beginPath();
    context.moveTo(center.x, center.y - gemSize);
    context.lineTo(center.x + gemSize * 0.72, center.y);
    context.lineTo(center.x, center.y + gemSize);
    context.lineTo(center.x - gemSize * 0.72, center.y);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;

    const rewardPips = station.massReward >= 20 ? 2 : 1;
    context.fillStyle = "#fff4b0";
    for (let pip = 0; pip < rewardPips; pip += 1) {
      const x = center.x + (pip - (rewardPips - 1) / 2) * Math.max(7, 9 * zoom);
      const y = center.y + outerRadius + Math.max(8, 10 * zoom);
      context.globalAlpha = 0.94;
      context.beginPath();
      context.arc(x, y, clamp(2.3 * zoom, 2.3, 4.2), 0, TAU);
      context.fill();
    }
    if (completedPrize) {
      drawOrbitPrizeBurst(context, center, outerRadius, color, now, orbitSeed);
    }
    context.restore();
  }
}

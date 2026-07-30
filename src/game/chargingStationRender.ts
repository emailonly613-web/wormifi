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
      icon: harbor ? "🏝" : "…",
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
      icon: harbor ? "↻" : "⚓",
      heading: harbor ? `${station.name} · LOOP READY` : `${station.name} · READY`,
      detail: harbor
        ? `ENTER THE MARKED LANE · SAIL ONE FULL CIRCLE · +${compactNumber(station.massReward)} SIZE`
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
    return {
      stationId: station.id,
      stationName: station.name,
      kind: station.kind ?? "capstan",
      phase: state.phase,
      icon: state.windingDirection < 0 ? "↺" : "↻",
      heading: harbor
        ? occupiedByOther
          ? `${station.name} · RIVAL LOOP`
          : ownedByViewer
            ? `${station.name} · YOUR LOOP`
            : `${station.name} · LOOPING`
        : occupiedByOther
          ? `${station.name} · RIVAL WINDING`
          : ownedByViewer
            ? `${station.name} · YOUR CHARGE`
            : `${station.name} · WINDING`,
      detail: harbor
        ? `${direction} · STAY IN THE MARKED LANE · +${compactNumber(station.massReward)} SIZE`
        : `${direction} · ${percent}% · ${secondsLabel(remainingSeconds)} TO +${compactNumber(station.massReward)} SIZE`,
      progressRatio,
      progressLabel: harbor ? `${percent}% LOOP` : `${percent}% CHARGED`,
      visualValue: harbor ? `${percent}%` : "",
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
      heading: harbor ? `${station.name} · LOOP MISSED` : `${station.name} · COIL BROKEN`,
      detail: harbor
        ? "CIRCLE THE MARKED LANE AND BRING YOUR HEAD BACK TO THE BUOY"
        : `${occupiedByOther ? "RIVAL " : ""}RESUME WITHIN ${secondsLabel(graceSeconds)} · ${percent}% HELD`,
      progressRatio,
      progressLabel: `${percent}% HELD`,
      visualValue: harbor ? `${percent}%` : "",
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
    heading: harbor ? `${station.name} · LOOP WON` : `${station.name} · COOLDOWN`,
    detail: harbor
      ? cooldownSeconds <= 0
        ? `SAIL CLEAR · THEN LOOP AGAIN · +${compactNumber(state.massAwarded)} SIZE WON`
        : `NEXT LOOP IN ${secondsLabel(cooldownSeconds)} · +${compactNumber(state.massAwarded)} SIZE WON`
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

function drawHarborIsland(
  context: CanvasRenderingContext2D,
  station: Readonly<ChargingStationConfig>,
  center: Readonly<Vec2>,
  coreRadius: number,
  dock: Readonly<Vec2>,
  color: string,
) {
  const islandRadius = Math.max(5.5, coreRadius);
  const seed = [...station.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  // A reef glow and turquoise shoal keep the tiny landmark legible without
  // enlarging the authoritative wrap lane.
  context.globalAlpha = 0.42;
  context.fillStyle = "#44d9cf";
  context.beginPath();
  context.arc(center.x, center.y, islandRadius * 1.32, 0, TAU);
  context.fill();
  context.globalAlpha = 0.92;
  context.fillStyle = "#d8b86a";
  context.strokeStyle = "#fff0ad";
  context.lineWidth = Math.max(1.2, islandRadius * 0.12);
  context.beginPath();
  for (let point = 0; point < 12; point += 1) {
    const angle = point / 12 * TAU;
    const wobble = 0.84 + ((point * 17 + seed) % 7) * 0.025;
    const radius = islandRadius * wobble;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius * 0.88;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = station.id === "kraken-atoll" ? "#315b44" : "#3e8a55";
  context.beginPath();
  context.ellipse(
    center.x - islandRadius * 0.08,
    center.y - islandRadius * 0.08,
    islandRadius * 0.54,
    islandRadius * 0.42,
    -0.18,
    0,
    TAU,
  );
  context.fill();

  // A tiny timber pier points at the exact return buoy.
  const dockAngle = Math.atan2(dock.y - center.y, dock.x - center.x);
  context.strokeStyle = "#704523";
  context.lineWidth = Math.max(2, islandRadius * 0.22);
  context.beginPath();
  context.moveTo(
    center.x + Math.cos(dockAngle) * islandRadius * 0.7,
    center.y + Math.sin(dockAngle) * islandRadius * 0.7,
  );
  context.lineTo(
    center.x + Math.cos(dockAngle) * islandRadius * 1.38,
    center.y + Math.sin(dockAngle) * islandRadius * 1.38,
  );
  context.stroke();

  // Palm/flag silhouette: crisp at ordinary zoom, safely hidden at map scale.
  if (islandRadius >= 7) {
    context.strokeStyle = "#6f3f20";
    context.lineWidth = Math.max(1.3, islandRadius * 0.13);
    context.beginPath();
    context.moveTo(center.x, center.y + islandRadius * 0.25);
    context.quadraticCurveTo(
      center.x - islandRadius * 0.15,
      center.y - islandRadius * 0.18,
      center.x + islandRadius * 0.06,
      center.y - islandRadius * 0.58,
    );
    context.stroke();
    context.strokeStyle = "#76cf68";
    context.lineWidth = Math.max(1.2, islandRadius * 0.14);
    for (let frond = 0; frond < 5; frond += 1) {
      const angle = -Math.PI * 0.92 + frond * Math.PI * 0.21;
      context.beginPath();
      context.moveTo(
        center.x + islandRadius * 0.06,
        center.y - islandRadius * 0.58,
      );
      context.lineTo(
        center.x + Math.cos(angle) * islandRadius * 0.58,
        center.y - islandRadius * 0.58 + Math.sin(angle) * islandRadius * 0.34,
      );
      context.stroke();
    }
  }

  context.globalAlpha = 1;
  context.strokeStyle = color;
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

    // The translucent band is exactly the configured valid wrap tolerance.
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

    if (state && presentation.progressRatio > 0) {
      const direction = state.windingDirection === 0 ? 1 : state.windingDirection;
      const arcLength = presentation.phase === "cooldown"
        ? TAU * presentation.progressRatio
        : station.requiredWrapRadians * presentation.progressRatio;
      const start = station.kind === "harbor"
        ? state.lapStartAngleRadians ?? station.dockAngleRadians
        : station.dockAngleRadians;
      const end = start + direction * arcLength;
      context.globalAlpha = pulse;
      context.strokeStyle = color;
      context.lineWidth = Math.max(4, station.wrapTolerance * 0.42 * zoom);
      context.beginPath();
      context.arc(center.x, center.y, wrapRadius, start, end, direction < 0);
      context.stroke();
    }

    // Exact dock circle and a textual anchor mark: the head, not the body,
    // must occupy this configured disk.
    context.globalAlpha = 0.94;
    context.fillStyle = "rgba(4, 22, 35, 0.9)";
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, 2.2 * zoom);
    context.beginPath();
    context.arc(dock.x, dock.y, dockRadius, 0, TAU);
    context.fill();
    context.stroke();
    context.fillStyle = color;
    context.font = `900 ${clamp(dockRadius * 0.86, 8, 19)}px Inter, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("⚓", dock.x, dock.y + 1);

    if (station.kind === "harbor") {
      drawHarborIsland(context, station, center, coreRadius, dock, color);
    } else {
      // Capstan core uses the configured core radius. Spokes are decorative and
      // remain inside that circle.
      context.fillStyle = "rgba(15, 45, 55, 0.96)";
      context.strokeStyle = color;
      context.lineWidth = Math.max(2, 2.4 * zoom);
      context.beginPath();
      context.arc(center.x, center.y, coreRadius, 0, TAU);
      context.fill();
      context.stroke();
      context.globalAlpha = 0.78;
      for (let spoke = 0; spoke < 6; spoke += 1) {
        const angle = spoke / 6 * TAU;
        context.beginPath();
        context.moveTo(
          center.x + Math.cos(angle) * coreRadius * 0.2,
          center.y + Math.sin(angle) * coreRadius * 0.2,
        );
        context.lineTo(
          center.x + Math.cos(angle) * coreRadius * 0.78,
          center.y + Math.sin(angle) * coreRadius * 0.78,
        );
        context.stroke();
      }
      context.globalAlpha = 1;
      context.fillStyle = color;
      context.font = `900 ${clamp(coreRadius * 0.78, 10, 24)}px Inter, sans-serif`;
      context.fillText(presentation.icon, center.x, center.y + 1);
    }

    if (station.kind === "harbor") {
      // One, two, or three coin pips communicate the reward tier without
      // placing instructions or numbers over live play.
      const pips = station.massReward >= 7 ? 3 : station.massReward >= 4 ? 2 : 1;
      context.shadowColor = "rgba(0, 8, 20, 0.8)";
      context.shadowBlur = 4;
      context.fillStyle = color;
      for (let pip = 0; pip < pips; pip += 1) {
        const x = center.x + (pip - (pips - 1) / 2) * Math.max(7, 8 * zoom);
        const y = center.y + outerRadius + Math.max(7, 9 * zoom);
        context.beginPath();
        context.arc(x, y, clamp(2.2 * zoom, 2.2, 4), 0, TAU);
        context.fill();
      }
      if (
        presentation.phase === "cooldown" &&
        state &&
        state.massAwarded + 1e-6 >= station.massReward
      ) {
        context.shadowColor = color;
        context.shadowBlur = 12;
        context.fillStyle = "#fff4bd";
        context.font = `950 ${clamp(13 * zoom, 13, 24)}px "Baloo 2", Inter, sans-serif`;
        context.fillText(
          `+${compactNumber(station.massReward)}`,
          center.x,
          center.y - outerRadius - Math.max(9, 11 * zoom),
        );
      }
    } else {
      const labelY = center.y + outerRadius + 16;
      const labelWidth = Math.max(120, Math.min(330, width - 18));
      context.shadowColor = "rgba(0, 8, 20, 0.96)";
      context.shadowBlur = 6;
      context.fillStyle = "#fff1bd";
      context.font = `900 ${clamp(9 * zoom, 9, 13)}px Inter, sans-serif`;
      context.fillText(presentation.heading.toUpperCase(), center.x, labelY, labelWidth);
      context.fillStyle = color;
      context.font = `800 ${clamp(7.5 * zoom, 7.5, 10.5)}px Inter, sans-serif`;
      context.fillText(presentation.detail, center.x, labelY + 14, labelWidth);
    }
    context.restore();
  }
}

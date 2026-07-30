import { useId } from "react";
import type { SpyglassDangerBearing, SpyglassDangerSector } from "../game/relics";
import type { Vec2 } from "../game/types";

export type RadarLandmark =
  | {
      id: string;
      kind: "collector";
      position: Vec2;
    }
  | {
      id: string;
      kind: "heat-ring";
      position: Vec2;
      radius: number;
    };

export interface RadarPlayerMarker {
  id: string;
  kind: "human" | "bot";
  position: Vec2;
  alive: boolean;
}

export interface RadarStation {
  id: string;
  position: Vec2;
  active?: boolean;
}

interface PirateRadarProps {
  scopeLabel: string;
  arenaRadius: number;
  position: Vec2;
  direction: Vec2;
  alive: boolean;
  landmarks: readonly RadarLandmark[];
  otherPlayers?: readonly RadarPlayerMarker[];
  stations?: readonly RadarStation[];
  /** Coarse, position-free off-screen intelligence from an active Spyglass. */
  dangerBearings?: readonly SpyglassDangerBearing[];
  roomId?: string;
  downLabel?: string;
}

const CHART_CENTER = 50;
const CHART_RADIUS = 41;
const SPYGLASS_SECTOR_ANGLES: Readonly<Record<SpyglassDangerSector, number>> = {
  E: 0,
  SE: 45,
  S: 90,
  SW: 135,
  W: 180,
  NW: 225,
  N: 270,
  NE: 315,
};

export function projectRadarPoint(position: Vec2, arenaRadius: number): Vec2 {
  const safeRadius = Number.isFinite(arenaRadius) ? Math.max(1, arenaRadius) : 1;
  const positionX = Number.isFinite(position.x) ? position.x : 0;
  const positionY = Number.isFinite(position.y) ? position.y : 0;
  const rawX = positionX / safeRadius * CHART_RADIUS;
  const rawY = positionY / safeRadius * CHART_RADIUS;
  const distance = Math.hypot(rawX, rawY);
  const scale = distance > CHART_RADIUS ? CHART_RADIUS / distance : 1;
  return {
    x: CHART_CENTER + rawX * scale,
    y: CHART_CENTER + rawY * scale,
  };
}

export function projectRadarRadius(radius: number, arenaRadius: number): number {
  const safeArenaRadius = Number.isFinite(arenaRadius) ? Math.max(1, arenaRadius) : 1;
  const safeRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;
  return Math.min(CHART_RADIUS * 2, safeRadius / safeArenaRadius * CHART_RADIUS);
}

export function radarHeadingDegrees(direction: Vec2): number {
  if (!Number.isFinite(direction.x) || !Number.isFinite(direction.y)) return 90;
  return Math.atan2(direction.y, direction.x) * 180 / Math.PI + 90;
}

export function PirateRadar({
  scopeLabel,
  arenaRadius,
  position,
  direction,
  alive,
  landmarks,
  otherPlayers = [],
  stations = [],
  dangerBearings = [],
  roomId,
  downLabel = "RESPAWNING",
}: PirateRadarProps) {
  const clipId = `radar-arena-${useId().replaceAll(":", "")}`;
  const player = projectRadarPoint(position, arenaRadius);
  const safeLandmarks = landmarks.filter(
    (landmark) =>
      (landmark.kind === "collector" || landmark.kind === "heat-ring") &&
      Number.isFinite(landmark.position.x) && Number.isFinite(landmark.position.y),
  );
  const safeOtherPlayers = otherPlayers
    .filter((other) =>
      other.alive && Number.isFinite(other.position.x) && Number.isFinite(other.position.y)
    )
    .slice()
    .sort((first, second) => first.id.localeCompare(second.id));
  const safeStations = stations
    .filter((station) => Number.isFinite(station.position.x) && Number.isFinite(station.position.y))
    .slice()
    .sort((first, second) => first.id.localeCompare(second.id));
  const safeDangerBearings = dangerBearings
    .filter((bearing) =>
      Object.hasOwn(SPYGLASS_SECTOR_ANGLES, bearing.sector) &&
      (bearing.distanceBand === "near" || bearing.distanceBand === "far") &&
      Number.isSafeInteger(bearing.threatCount) &&
      bearing.threatCount > 0
    )
    .slice()
    .sort((first, second) =>
      SPYGLASS_SECTOR_ANGLES[first.sector] - SPYGLASS_SECTOR_ANGLES[second.sector]
    )
    .slice(0, 8);
  const kinds = [...new Set(safeLandmarks.map((landmark) => landmark.kind))].sort().join(",");
  const humanCount = safeOtherPlayers.filter((other) => other.kind === "human").length;
  const botCount = safeOtherPlayers.length - humanCount;
  const hazardCount = safeLandmarks.filter((landmark) => landmark.kind === "heat-ring").length;
  const spyglassSummary = safeDangerBearings.length > 0
    ? ` Emerald Spyglass danger: ${safeDangerBearings.map((bearing) =>
        `${bearing.sector} ${bearing.distanceBand}, ${bearing.threatCount} ${bearing.threatCount === 1 ? "threat" : "threats"}`
      ).join("; ")}.`
    : "";
  const accessibleSummary = `${scopeLabel} radar. Shows your position and heading, the arena boundary, ${safeOtherPlayers.length} ordinarily visible crew markers, ${hazardCount} active hazards, and ${safeStations.length} stations.${spyglassSummary}`;

  return (
    <aside
      className={`pirate-radar ${alive ? "" : "player-down"}`}
      data-testid="pirate-radar"
      data-room-id={roomId ?? "none"}
      data-landmark-count={safeLandmarks.length}
      data-landmark-kinds={kinds}
      data-rival-marker-count={safeOtherPlayers.length}
      data-other-player-count={safeOtherPlayers.length}
      data-human-player-count={humanCount}
      data-ai-player-count={botCount}
      data-hazard-count={hazardCount}
      data-station-count={safeStations.length}
      data-spyglass-bearing-count={safeDangerBearings.length}
      data-spyglass-sectors={safeDangerBearings.map((bearing) => bearing.sector).join(",")}
      data-fair-intel="arena-bounds,self-heading,coarse-players,collector,public-hazard,stations"
      aria-label={accessibleSummary}
    >
      <header>
        <span>PIRATE CHART</span>
        <strong>{scopeLabel}</strong>
      </header>
      <svg viewBox="0 0 100 100" role="img" aria-label="Circular arena map">
        <defs>
          <radialGradient id="radar-parchment" cx="42%" cy="36%" r="68%">
            <stop offset="0" stopColor="#f8d98f" />
            <stop offset="0.7" stopColor="#c89043" />
            <stop offset="1" stopColor="#6e3e20" />
          </radialGradient>
          <filter id="radar-ink-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodColor="#1a0b05" floodOpacity="0.75" />
          </filter>
          <clipPath id={clipId}>
            <circle cx={CHART_CENTER} cy={CHART_CENTER} r={CHART_RADIUS} />
          </clipPath>
        </defs>
        <title>{accessibleSummary}</title>
        <circle className="radar-chart-paper" cx="50" cy="50" r="46" fill="url(#radar-parchment)" />
        <path className="radar-water-line" d="M12 42 C25 36 34 48 48 41 S73 33 88 43" />
        <path className="radar-water-line" d="M13 64 C27 57 39 69 54 61 S75 56 88 66" />
        <circle className="radar-arena-boundary" cx="50" cy="50" r={CHART_RADIUS} />
        <path className="radar-crosshair" d="M50 9 V18 M50 82 V91 M9 50 H18 M82 50 H91" />
        <text className="radar-north" x="50" y="14">N</text>
        {safeDangerBearings.map((bearing) => {
          const angle = SPYGLASS_SECTOR_ANGLES[bearing.sector];
          const radians = angle * Math.PI / 180;
          const radius = bearing.distanceBand === "near" ? CHART_RADIUS - 1.5 : CHART_RADIUS + 2;
          const x = CHART_CENTER + Math.cos(radians) * radius;
          const y = CHART_CENTER + Math.sin(radians) * radius;
          return (
            <g
              key={bearing.sector}
              className={`radar-spyglass-bearing ${bearing.distanceBand}`}
              data-testid="radar-spyglass-bearing"
              data-sector={bearing.sector}
              data-distance-band={bearing.distanceBand}
              data-threat-count={bearing.threatCount}
              transform={`translate(${x} ${y}) rotate(${angle + 90})`}
              aria-hidden="true"
            >
              <path d="M0 -4.2 L3.8 2.8 L0 1.2 L-3.8 2.8 Z" />
              {bearing.threatCount > 1 && (
                <text x="0" y="-5.5" textAnchor="middle" transform={`rotate(${-angle - 90})`}>
                  {Math.min(9, bearing.threatCount)}
                </text>
              )}
            </g>
          );
        })}
        <path className="radar-island" d="M24 28 q7 -7 13 0 q-3 5 -10 6z" />
        <path className="radar-island" d="M65 68 q8 -5 12 3 q-5 5 -13 2z" />
        <g clipPath={`url(#${clipId})`}>
          {safeLandmarks.filter((landmark) => landmark.kind === "heat-ring").map((landmark) => {
            const point = projectRadarPoint(landmark.position, arenaRadius);
            const radius = projectRadarRadius(landmark.radius, arenaRadius);
            return (
              <g
                key={landmark.id}
                className="radar-landmark radar-heat-ring"
                data-testid="radar-heat-ring"
                data-world-radius={landmark.radius}
              >
                <circle cx={point.x} cy={point.y} r={radius} />
                <path d={`M${point.x - 3} ${point.y} H${point.x + 3} M${point.x} ${point.y - 3} V${point.y + 3}`} />
              </g>
            );
          })}
        </g>
        {safeLandmarks.map((landmark) => {
          if (landmark.kind !== "collector") return null;
          const point = projectRadarPoint(landmark.position, arenaRadius);
          return (
            <g
              key={landmark.id}
              className="radar-landmark radar-collector"
              data-testid="radar-collector"
              transform={`translate(${point.x} ${point.y})`}
            >
              <circle r="4.6" />
              <path d="M0 -3.2 L1.2 -1.1 L3.3 0 L1.1 1.2 L0 3.3 L-1.2 1.1 L-3.3 0 L-1.1 -1.2z" />
            </g>
          );
        })}
        {safeStations.map((station) => {
          const point = projectRadarPoint(station.position, arenaRadius);
          return (
            <g
              key={station.id}
              className={`radar-station ${station.active ? "active" : ""}`}
              data-testid="radar-station"
              transform={`translate(${point.x} ${point.y})`}
            >
              <rect x="-3" y="-3" width="6" height="6" rx="1" />
              <path d="M-1.8 0 H1.8 M0 -1.8 V1.8" />
            </g>
          );
        })}
        {safeOtherPlayers.map((other) => {
          const point = projectRadarPoint(other.position, arenaRadius);
          return (
            <g
              key={other.id}
              className={`radar-other-player ${other.kind}`}
              data-testid="radar-other-player"
              data-player-kind={other.kind}
              transform={`translate(${point.x} ${point.y})`}
              aria-hidden="true"
            >
              {other.kind === "human"
                ? <path d="M0 -2.6 L2.6 0 L0 2.6 L-2.6 0 Z" />
                : <circle r="1.7" />}
            </g>
          );
        })}
        <g
          className="radar-player"
          data-testid="radar-player"
          transform={`translate(${player.x} ${player.y}) rotate(${radarHeadingDegrees(direction)})`}
          filter="url(#radar-ink-shadow)"
        >
          <path d="M0 -7 L5.2 5 L0 2.8 L-5.2 5 Z" />
          <circle cy="1" r="1.7" />
        </g>
      </svg>
      {safeDangerBearings.length > 0 && (
        <span className="sr-only" data-testid="radar-spyglass-summary">{spyglassSummary.trim()}</span>
      )}
      <footer>
        <span><i className="legend-self" />YOU</span>
        <span><i className="legend-crew" />CREWS</span>
        <span><i className="legend-objective" />MARKS</span>
        <span><i className="legend-event" />HAZARD</span>
      </footer>
      {!alive && <b className="radar-respawn">{downLabel}</b>}
    </aside>
  );
}

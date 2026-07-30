import type { ChargingStationPresentation } from "../game/chargingStationRender";

interface ChargingStationStatusProps {
  status: ChargingStationPresentation;
  testId: string;
}

/** Compact nonverbal objective state; full instructions stay in the lobby. */
export function ChargingStationStatus({ status, testId }: ChargingStationStatusProps) {
  return (
    <div
      className={`specialist-status charging-station-status phase-${status.phase} ${status.active ? "active" : ""}`}
      data-testid={testId}
      data-station-id={status.stationId}
      data-phase={status.phase}
      data-active={status.active ? "true" : "false"}
      data-owned={status.ownedByViewer ? "true" : "false"}
      aria-label={`${status.heading}. ${status.detail}. ${status.progressLabel}.`}
    >
      <span className="specialist-icon station-status-icon" aria-hidden="true">
        {status.icon}
      </span>
      <progress
        max={1}
        value={status.progressRatio}
        aria-label={`${status.stationName} ${status.progressLabel}`}
      />
    </div>
  );
}

import { useId } from "react";
import {
  DEFAULT_GAME_PACE_ID,
  GAME_PACE_OPTIONS,
  resolveRoomPacePreference,
  type GamePaceId,
} from "../game/gamePace";
import "./PacePicker.css";

export interface PacePickerProps {
  value?: GamePaceId;
  onChange?: (paceId: GamePaceId) => void;
  existingRoomPaceId?: GamePaceId;
  disabled?: boolean;
}

export function PacePicker({
  value = DEFAULT_GAME_PACE_ID,
  onChange,
  existingRoomPaceId,
  disabled = false,
}: PacePickerProps) {
  const legendId = useId();
  const lockId = useId();
  const selection = resolveRoomPacePreference(value, existingRoomPaceId);
  const locked = disabled || selection.locked;
  const selected = GAME_PACE_OPTIONS.find((option) => option.id === selection.paceId)!;

  return (
    <fieldset
      className="pace-picker"
      aria-labelledby={legendId}
      aria-describedby={selection.locked ? lockId : undefined}
      data-testid="pace-picker"
      data-pace-id={selection.paceId}
      data-pace-locked={selection.locked ? "true" : "false"}
    >
      <legend id={legendId}>CHOOSE GAME SPEED</legend>
      <p>One pace applies to the whole live room. Harbor is the slower long-run default.</p>
      <div className="pace-picker-options">
        {GAME_PACE_OPTIONS.map((option) => {
          const descriptionId = `${legendId}-${option.id}`;
          return (
            <label
              key={option.id}
              className={selection.paceId === option.id ? "selected" : ""}
              data-testid={`pace-option-${option.id}`}
            >
              <input
                type="radio"
                name={`${legendId}-pace`}
                value={option.id}
                checked={selection.paceId === option.id}
                disabled={locked}
                aria-describedby={descriptionId}
                onChange={() => onChange?.(option.id)}
              />
              <span>
                <strong>{option.name}</strong>
                <small>{option.shortLabel} · {option.baseSpeed}</small>
                <b id={descriptionId}>{option.description}</b>
              </span>
            </label>
          );
        })}
      </div>
      {selection.locked && (
        <p id={lockId} className="pace-picker-lock" role="status">
          EXISTING ROOM LOCKED TO {selected.name.toUpperCase()} SPEED.
        </p>
      )}
    </fieldset>
  );
}

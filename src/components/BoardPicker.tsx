import { useId } from "react";
import {
  BOARD_OPTIONS,
  DEFAULT_GAME_BOARD_ID,
  resolveRoomBoardPreference,
  type GameBoardId,
} from "../game/boardPreference";
import "./BoardPicker.css";

export interface BoardPickerProps {
  value?: GameBoardId;
  onChange?: (boardId: GameBoardId) => void;
  /** The board reported by an existing room. When set, every choice is locked. */
  existingRoomBoardId?: GameBoardId;
  disabled?: boolean;
  className?: string;
}

export function BoardPicker({
  value = DEFAULT_GAME_BOARD_ID,
  onChange,
  existingRoomBoardId,
  disabled = false,
  className = "",
}: BoardPickerProps) {
  const legendId = useId();
  const lockId = useId();
  const selection = resolveRoomBoardPreference(value, existingRoomBoardId);
  const locked = disabled || selection.locked;
  const selectedOption = BOARD_OPTIONS.find((option) => option.id === selection.boardId)!;

  return (
    <fieldset
      className={`board-picker ${className}`.trim()}
      aria-labelledby={legendId}
      aria-describedby={selection.locked ? lockId : undefined}
      data-testid="board-picker"
      data-board-id={selection.boardId}
      data-board-locked={selection.locked ? "true" : "false"}
    >
      <legend id={legendId}>CHOOSE YOUR BOARD</legend>
      <p className="board-picker-intro">
        Open Seas is the default. A new room keeps the board chosen by its first captain.
      </p>
      <div className="board-picker-options">
        {BOARD_OPTIONS.map((option) => {
          const descriptionId = `${legendId}-${option.id}`;
          return (
            <label
              key={option.id}
              className={selection.boardId === option.id ? "selected" : ""}
              data-testid={`board-option-${option.id}`}
            >
              <input
                type="radio"
                name={`${legendId}-board`}
                value={option.id}
                checked={selection.boardId === option.id}
                disabled={locked}
                aria-describedby={descriptionId}
                onChange={() => onChange?.(option.id)}
              />
              <span className="board-picker-copy">
                <span className="board-picker-heading">
                  <strong>{option.name}</strong>
                  <small>{option.shortLabel}</small>
                </span>
                <span id={descriptionId}>{option.description}</span>
                <b>{option.objectiveDisclosure}</b>
              </span>
            </label>
          );
        })}
      </div>
      {selection.locked && (
        <p id={lockId} className="board-picker-lock" role="status">
          EXISTING ROOM LOCKED TO {selectedOption.name.toUpperCase()} — ITS BOARD CANNOT BE OVERRIDDEN.
        </p>
      )}
    </fieldset>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  CAPTAIN_ROOM_TIERS,
  type CaptainRoomTierId,
} from "../game/captainRooms";

export interface CaptainRoomsProps {
  onClose: () => void;
  onCreateRoom: (tierId: CaptainRoomTierId) => void;
}

export function CaptainRooms({ onClose, onCreateRoom }: CaptainRoomsProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<CaptainRoomTierId>(
    "captain-room-10-session-v1",
  );
  const tier = CAPTAIN_ROOM_TIERS.find((candidate) => candidate.id === selected)!;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    closeButtonRef.current?.focus();
  }, []);

  return (
    <section
      className="captain-rooms"
      role="dialog"
      aria-modal="true"
      aria-labelledby="captain-rooms-title"
      data-testid="captain-rooms"
    >
      <header>
        <div>
          <small>HOST YOUR OWN PRIVATE ARENA</small>
          <h2 id="captain-rooms-title">CAPTAIN ROOMS</h2>
          <p>Free at launch · one private room link · your crew · zero login wall.</p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Captain Rooms"
          onClick={onClose}
        >×</button>
      </header>

      <div className="captain-room-tier-grid" role="radiogroup" aria-label="Private room size">
        {CAPTAIN_ROOM_TIERS.map((candidate) => (
          <label key={candidate.id} data-selected={selected === candidate.id ? "true" : "false"}>
            <input
              type="radio"
              name="captain-room-tier"
              value={candidate.id}
              checked={selected === candidate.id}
              onChange={() => setSelected(candidate.id)}
            />
            <small>{candidate.label}</small>
            <strong>UP TO {candidate.humanSeats}</strong>
            <b>FREE</b>
            <span>host and every invited player</span>
          </label>
        ))}
      </div>

      <section className="captain-room-promise">
        <div>
          <small>SELECTED ROOM</small>
          <strong>{tier.humanSeats}-PLAYER CAPTAIN COVE</strong>
        </div>
        <ul>
          <li>Private server-owned room and shareable invite</li>
          <li>Separate board sized for {tier.humanSeats} real human seats</li>
          <li>Open the link and join this exact room immediately as a guest</li>
          <li>Everyone has identical speed, collisions, treasure and power odds</li>
          <li>No fee, room credit, account prompt or paid gameplay advantage</li>
        </ul>
      </section>

      <aside>
        <small>VIRAL LAUNCH RULE · LOCKED</small>
        <strong>CREATE · COPY · SEND · PLAY — 100% FREE</strong>
        <span>The host creates one unique Wormifi link. Friends opening it enter the same private arena immediately with a guest name—no checkout, login pop-up, room credit or invite fee.</span>
      </aside>

      <button
        type="button"
        className="captain-room-interest"
        data-testid="captain-room-interest"
        data-room-tier={tier.id}
        onClick={() => onCreateRoom(tier.id)}
      >
        CREATE FREE ROOM &amp; COPY LINK
      </button>
    </section>
  );
}

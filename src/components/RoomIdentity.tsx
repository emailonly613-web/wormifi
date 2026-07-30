import { useEffect, useRef } from "react";
import { roomIdentityLabel } from "../game/roomIdentity";

export type RoomIdentityScope = "live" | "practice" | "solo" | "challenge";

interface RoomIdentityProps {
  scope: RoomIdentityScope;
  roomId: string;
  onInvite?: () => void;
}

export function RoomIdentity({ scope, roomId, onInvite }: RoomIdentityProps) {
  const label = scope === "live"
    ? `LIVE ${roomIdentityLabel(roomId)}`
    : scope === "practice"
      ? "PRACTICE — NO LIVE ROOM"
      : scope === "challenge"
        ? "RIVALRY RUN — NO LIVE ROOM"
        : "SOLO RUN — NO LIVE ROOM";

  return (
    <div
      className={`room-identity-ribbon scope-${scope}`}
      data-testid="room-identity"
      data-scope={scope}
      data-room-id={scope === "live" ? roomId : "none"}
      role="region"
      aria-label={label}
    >
      <span aria-hidden="true" className="room-identity-pin">⌖</span>
      <strong>{label}</strong>
      {scope === "live" && onInvite && (
        <button type="button" data-testid="in-game-invite" onClick={onInvite}>
          INVITE CREW
        </button>
      )}
    </div>
  );
}

interface RoomInviteDialogProps {
  open: boolean;
  roomId: string;
  inviteUrl: string;
  copyStatus: string;
  onCopy: () => void;
  onNativeShare: () => void;
  onClose: () => void;
}

export function RoomInviteDialog({
  open,
  roomId,
  inviteUrl,
  copyStatus,
  onCopy,
  onNativeShare,
  onClose,
}: RoomInviteDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="room-invite-backdrop" data-testid="room-invite-backdrop">
      <section
        className="room-invite-dialog"
        data-testid="room-invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-invite-title"
      >
        <span className="room-invite-kicker">FRIEND ROOM READY</span>
        <h2 id="room-invite-title">INVITE CREW TO {roomIdentityLabel(roomId)}</h2>
        <p>Anyone opening this link enters with the same room code ready. Press Play Live to meet here.</p>
        <label>
          <span>CREW LINK</span>
          <input data-testid="room-invite-url" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} />
        </label>
        <div className="room-invite-actions">
          <button type="button" className="room-copy-button" onClick={onCopy}>COPY LINK</button>
          {typeof navigator.share === "function" && (
            <button type="button" onClick={onNativeShare}>SHARE</button>
          )}
          <button ref={closeRef} type="button" onClick={onClose}>CLOSE</button>
        </div>
        <span className="room-copy-status" role="status" aria-live="polite">{copyStatus}</span>
      </section>
    </div>
  );
}

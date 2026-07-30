import { useEffect, useState } from "react";
import {
  applyWormifiUpdate,
  PWA_ERROR_EVENT,
  PWA_UPDATE_EVENT,
} from "../pwa";

export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const verifyConnection = async () => {
      try {
        await fetch(`/__wormifi_network_probe__?t=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        if (mounted) setOnline(true);
      } catch {
        if (mounted) setOnline(false);
      }
    };
    const showOnline = () => void verifyConnection();
    const showOffline = () => setOnline(false);
    const showUpdate = () => setUpdateReady(true);
    const showError = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      setRegistrationError(typeof detail === "string" ? detail : "Offline support could not update");
    };
    window.addEventListener("online", showOnline);
    window.addEventListener("offline", showOffline);
    window.addEventListener(PWA_UPDATE_EVENT, showUpdate);
    window.addEventListener(PWA_ERROR_EVENT, showError);
    window.addEventListener("visibilitychange", showOnline);
    void verifyConnection();
    return () => {
      mounted = false;
      window.removeEventListener("online", showOnline);
      window.removeEventListener("offline", showOffline);
      window.removeEventListener(PWA_UPDATE_EVENT, showUpdate);
      window.removeEventListener(PWA_ERROR_EVENT, showError);
      window.removeEventListener("visibilitychange", showOnline);
    };
  }, []);

  if (online && !updateReady && !registrationError) return null;
  return (
    <aside className="pwa-notice" data-offline={!online ? "true" : "false"} aria-live="polite">
      {!online && (
        <div data-testid="pwa-offline-status">
          <b>OFFLINE PRACTICE READY</b>
          <span>Local labeled bots still work. Multiplayer stays offline.</span>
        </div>
      )}
      {updateReady && (
        <button
          type="button"
          data-testid="pwa-update-button"
          onClick={() => {
            if (applyWormifiUpdate()) setUpdateReady(false);
          }}
        >
          UPDATE WORMIFI
        </button>
      )}
      {registrationError && online && (
        <button
          type="button"
          className="pwa-error-dismiss"
          onClick={() => setRegistrationError(null)}
        >
          Offline update unavailable · dismiss
        </button>
      )}
    </aside>
  );
}

export const PWA_UPDATE_EVENT = "wormifi:pwa-update-ready";
export const PWA_ERROR_EVENT = "wormifi:pwa-registration-error";

let activeRegistration: ServiceWorkerRegistration | undefined;
let reloadRequested = false;

function dispatch(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function announceWaitingWorker(registration: ServiceWorkerRegistration) {
  activeRegistration = registration;
  if (registration.waiting) dispatch(PWA_UPDATE_EVENT);
}

async function register() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    activeRegistration = registration;
    announceWaitingWorker(registration);

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          announceWaitingWorker(registration);
        }
      });
    });

    // Browsers normally check during navigation; this also catches an update
    // when the app was restored from a long-lived standalone window.
    await registration.update();
  } catch (error) {
    dispatch(PWA_ERROR_EVENT, error instanceof Error ? error.message : "Service worker registration failed");
  }
}

export function registerWormifiServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadRequested) return;
    reloadRequested = false;
    window.location.reload();
  });

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}

export function applyWormifiUpdate() {
  const waiting = activeRegistration?.waiting;
  if (!waiting) return false;
  reloadRequested = true;
  waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

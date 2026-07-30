import { normalizeBuildRevision, readBuildRevision } from "./buildRevision";

export const PWA_UPDATE_EVENT = "wormifi:pwa-update-ready";
export const PWA_ERROR_EVENT = "wormifi:pwa-registration-error";

const UPDATE_CHECK_INTERVAL_MS = 60_000;

let activeRegistration: ServiceWorkerRegistration | undefined;
let reloadRequested = false;
let newerBuildRevision: string | undefined;
let updateChecksStarted = false;

function dispatch(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function announceWaitingWorker(registration: ServiceWorkerRegistration) {
  activeRegistration = registration;
  if (registration.waiting) dispatch(PWA_UPDATE_EVENT);
}

async function checkForNewerBuild() {
  try {
    const response = await fetch(`/build-info.json?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return;
    const payload = await response.json() as { buildRevision?: unknown };
    const current = readBuildRevision();
    const latest = normalizeBuildRevision(payload.buildRevision);
    if (current !== "development" && latest !== "development" && latest !== current) {
      newerBuildRevision = latest;
      dispatch(PWA_UPDATE_EVENT, { current, latest });
    }
  } catch {
    // Offline state is surfaced by PwaStatus; update polling stays quiet.
  }
}

function startUpdateChecks(registration: ServiceWorkerRegistration) {
  if (updateChecksStarted) return;
  updateChecksStarted = true;
  const check = () => {
    void registration.update();
    void checkForNewerBuild();
  };
  window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  window.addEventListener("focus", check);
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
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
    await checkForNewerBuild();
    startUpdateChecks(registration);
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
  if (waiting) {
    reloadRequested = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  }
  if (newerBuildRevision) {
    window.location.reload();
    return true;
  }
  return false;
}

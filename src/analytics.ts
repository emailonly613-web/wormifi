const CONSENT_STORAGE_KEY = "wormifi.analytics-consent.v1";
const VALID_MEASUREMENT_ID = /^G-[A-Z0-9]{6,20}$/u;
const MAX_CAMPAIGN_VALUE_LENGTH = 80;

type ConsentChoice = "granted" | "denied";
type AnalyticsPrimitive = string | number | boolean;
type AnalyticsParameters = Record<string, AnalyticsPrimitive | undefined>;

type GtagCommand =
  | ["js", Date]
  | ["consent", "default" | "update", Record<string, string | number>]
  | ["config", string, Record<string, AnalyticsPrimitive>]
  | ["event", string, Record<string, AnalyticsPrimitive>];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...command: GtagCommand) => void;
  }
}

let active = false;
let initialized = false;
let lastLaunchMode: "live" | "rush" | "endless" | "practice" | "challenge" = "rush";

export function isValidGa4MeasurementId(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim();
  if (/(?:PLACEHOLDER|EXAMPLE|TEST|X{4,})/u.test(normalized)) return false;
  return VALID_MEASUREMENT_ID.test(normalized);
}

export function sanitizePageLocation(location: Pick<Location, "origin" | "pathname">): string {
  const pathname = location.pathname.startsWith("/") ? location.pathname : `/${location.pathname}`;
  return `${location.origin}${pathname}`;
}

export function sanitizeReferrer(referrer: string, siteOrigin: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const parsed = new URL(referrer);
    return parsed.origin === siteOrigin
      ? `${parsed.origin}${parsed.pathname}`
      : parsed.origin;
  } catch {
    return undefined;
  }
}

function sanitizeCampaignValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\s+/gu, " ").slice(0, MAX_CAMPAIGN_VALUE_LENGTH);
  if (!normalized || normalized.includes("@") || /\d{7,}/u.test(normalized)) return undefined;
  return normalized;
}

export function readSafeCampaignParameters(search: string): AnalyticsParameters {
  const query = new URLSearchParams(search);
  return {
    campaign_source: sanitizeCampaignValue(query.get("utm_source")),
    campaign_medium: sanitizeCampaignValue(query.get("utm_medium")),
    campaign_name: sanitizeCampaignValue(query.get("utm_campaign")),
    campaign_id: sanitizeCampaignValue(query.get("utm_id")),
  };
}

function compact(parameters: AnalyticsParameters): Record<string, AnalyticsPrimitive> {
  return Object.fromEntries(
    Object.entries(parameters).filter((entry): entry is [string, AnalyticsPrimitive] => entry[1] !== undefined),
  );
}

function setAnalyticsState(state: "missing-id" | "do-not-track" | "awaiting-consent" | "denied" | "active") {
  document.documentElement.dataset.analyticsState = state;
}

function isDoNotTrackEnabled(): boolean {
  return navigator.doNotTrack === "1";
}

function readConsent(): ConsentChoice | null {
  try {
    const choice = localStorage.getItem(CONSENT_STORAGE_KEY);
    return choice === "granted" || choice === "denied" ? choice : null;
  } catch {
    return null;
  }
}

function writeConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable in hardened/private browser modes. The
    // visitor's choice still applies to the current page.
  }
}

export function setWormifiAnalyticsConsent(choice: ConsentChoice) {
  writeConsent(choice);
  if (window.gtag) updateAnalyticsConsent(choice);
  if (choice === "denied") {
    active = false;
    setAnalyticsState("denied");
    document.querySelector(".analytics-consent")?.remove();
  }
}

export function ensureGtagQueue() {
  window.dataLayer ??= [];
  // gtag.js only executes dataLayer entries that are `arguments` objects. A
  // plain array is pushed successfully and then silently ignored, so consent,
  // config and every event queue up and none of them ever reach Google. The
  // official snippet uses `arguments` for exactly this reason.
  window.gtag ??= function gtagQueue() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  } as Window["gtag"];
}

function setDefaultConsent() {
  ensureGtagQueue();
  window.gtag!("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

function updateAnalyticsConsent(choice: ConsentChoice) {
  ensureGtagQueue();
  window.gtag!("consent", "update", {
    analytics_storage: choice,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function loadGoogleTag(measurementId: string) {
  if (document.querySelector("script[data-wormifi-ga4]")) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.wormifiGa4 = "true";
  document.head.append(script);
}

function sendEvent(name: string, parameters: AnalyticsParameters = {}) {
  if (!active || !window.gtag) return;
  window.gtag("event", name, compact(parameters));
}

function startAnalytics(measurementId: string) {
  if (active) return;
  updateAnalyticsConsent("granted");
  loadGoogleTag(measurementId);
  window.gtag!("js", new Date());

  const pageLocation = sanitizePageLocation(window.location);
  const pageReferrer = sanitizeReferrer(document.referrer, window.location.origin);
  window.gtag!("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: "SameSite=Lax;Secure",
    page_location: pageLocation,
    ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
  });

  active = true;
  setAnalyticsState("active");
  sendEvent("page_view", {
    page_title: document.title,
    page_location: pageLocation,
    page_referrer: pageReferrer,
    ...readSafeCampaignParameters(window.location.search),
  });
}

function consentPanel(measurementId: string): HTMLElement {
  const panel = document.createElement("aside");
  panel.className = "analytics-consent";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Optional analytics choice");
  panel.innerHTML = `
    <div>
      <strong>HELP IMPROVE WORMIFI?</strong>
      <p>Allow privacy-conscious gameplay analytics. We do not send your arena name, room number, challenge link, or full URL.</p>
      <a href="/privacy.html">Privacy details</a>
    </div>
    <div class="analytics-consent-actions">
      <button type="button" data-analytics-choice="denied">NO THANKS</button>
      <button type="button" class="analytics-consent-accept" data-analytics-choice="granted">ALLOW ANALYTICS</button>
    </div>
  `;
  panel.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-analytics-choice]");
    if (!target) return;
    const choice = target.dataset.analyticsChoice as ConsentChoice;
    setWormifiAnalyticsConsent(choice);
    if (choice === "granted") startAnalytics(measurementId);
    panel.remove();
  });
  return panel;
}

function selectedSoloMode(): "rush" | "endless" {
  const activeTab = document.querySelector<HTMLButtonElement>('.mode-tabs button[aria-pressed="true"]');
  return activeTab?.textContent?.includes("ENDLESS") ? "endless" : "rush";
}

function numericResult(label: string): number | undefined {
  const rows = document.querySelectorAll<HTMLDivElement>(".result-stats > div");
  for (const row of rows) {
    const key = row.querySelector("dt")?.textContent?.trim();
    if (key !== label) continue;
    const value = Number(row.querySelector("dd")?.textContent?.replace(/[^\d.-]/gu, ""));
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

function installFunnelTracking() {
  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button, a");
    if (!target) return;

    const testId = target.dataset.testid;
    if (testId === "live-lab-button") {
      if (target.textContent?.includes("ACCEPT CHALLENGE")) {
        lastLaunchMode = "challenge";
        sendEvent("level_start", { level_name: "challenge", game_mode: "solo" });
        return;
      }
      lastLaunchMode = "live";
      sendEvent("level_start", { level_name: "live_preview", game_mode: "live" });
      return;
    }
    if (testId === "solo-run-button") {
      lastLaunchMode = selectedSoloMode();
      sendEvent("level_start", { level_name: lastLaunchMode, game_mode: "solo" });
      return;
    }
    if (target.classList.contains("practice-button")) {
      lastLaunchMode = "practice";
      sendEvent("level_start", { level_name: "practice", game_mode: "solo" });
      return;
    }
    if (testId?.startsWith("control-")) {
      const scheme = testId.slice("control-".length);
      if (["drag-anywhere", "left-helm", "right-helm"].includes(scheme)) {
        sendEvent("select_content", { content_type: "control_scheme", item_id: scheme });
      }
      return;
    }
    if (testId === "watch-local-replay") {
      sendEvent("replay_viewed", { game_mode: lastLaunchMode });
      return;
    }
    if (target.classList.contains("share-button")) {
      sendEvent("share_challenge_requested", { content_type: "challenge", game_mode: lastLaunchMode });
      sendEvent("share", {
        method: "share_button",
        content_type: "challenge",
        item_id: "wormifi_invite",
      });
      return;
    }
    if (testId === "pwa-update-button") {
      sendEvent("pwa_update_requested");
    }
  }, { passive: true });

  const seenResults = new WeakSet<Element>();
  const seenLiveCanvases = new WeakSet<Element>();
  let tutorialStarted = false;
  let lastTutorialStage = "";

  const inspect = () => {
    const liveCanvas = document.querySelector<HTMLElement>('[data-testid="live-arena-canvas"][data-authority="server-confirmed"]');
    if (liveCanvas && !seenLiveCanvases.has(liveCanvas)) {
      seenLiveCanvases.add(liveCanvas);
      const humanText = document.querySelector('[data-testid="live-human-count"]')?.textContent ?? "";
      const humanCount = Number(humanText.match(/\d+/u)?.[0] ?? 0);
      sendEvent("live_connection_confirmed", {
        game_mode: "live",
        human_count: Number.isFinite(humanCount) ? humanCount : 0,
      });
      sendEvent("join_group", {
        group_id: "wormifi_live_room",
        human_count: Number.isFinite(humanCount) ? humanCount : 0,
      });
    }

    const tutorial = document.querySelector<HTMLElement>('[data-testid="tutorial-coach"]');
    if (tutorial) {
      const stage = tutorial.dataset.stage ?? "";
      if (!tutorialStarted) {
        tutorialStarted = true;
        sendEvent("tutorial_begin");
      }
      if (stage && stage !== lastTutorialStage) {
        lastTutorialStage = stage;
        sendEvent("tutorial_progress", { tutorial_step: stage });
      }
    } else if (tutorialStarted && lastTutorialStage === "collector") {
      tutorialStarted = false;
      lastTutorialStage = "";
      sendEvent("tutorial_complete");
    }

    const results = document.querySelector('[data-testid="results-panel"]');
    if (results && !seenResults.has(results)) {
      seenResults.add(results);
      const score = numericResult("SCORE");
      const peakSize = numericResult("PEAK SIZE");
      const chainCuts = numericResult("CHAIN CUTS");
      sendEvent("level_end", {
        level_name: lastLaunchMode,
        game_mode: "solo",
        score,
        peak_size: peakSize,
        chain_cuts: chainCuts,
      });
      if (score !== undefined) {
        sendEvent("post_score", { score, level: lastLaunchMode });
      }
    }
  };

  const observer = new MutationObserver(inspect);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-authority", "data-stage"],
  });
  window.addEventListener("appinstalled", () => {
    sendEvent("pwa_install", { platform: "web" });
  }, { once: true });
  inspect();
}

export function initWormifiAnalytics() {
  if (initialized) return;
  initialized = true;

  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
  if (!isValidGa4MeasurementId(measurementId)) {
    setAnalyticsState("missing-id");
    return;
  }
  if (isDoNotTrackEnabled()) {
    setAnalyticsState("do-not-track");
    return;
  }

  setDefaultConsent();
  installFunnelTracking();
  const consent = readConsent();
  if (consent === "granted") {
    startAnalytics(measurementId!);
    return;
  }
  if (consent === "denied") {
    setAnalyticsState("denied");
    return;
  }

  setAnalyticsState("awaiting-consent");
  document.body.append(consentPanel(measurementId!));
}

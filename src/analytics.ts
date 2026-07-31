const CONSENT_STORAGE_KEY = "wormifi.analytics-consent.v1";
const RETENTION_STORAGE_KEY = "wormifi.retention-signals.v1";
const VALID_MEASUREMENT_ID = /^G-[A-Z0-9]{6,20}$/u;
const MAX_CAMPAIGN_VALUE_LENGTH = 80;
const HOUR_MS = 60 * 60 * 1_000;

type ReturnMilestone = "return_d1" | "return_d7";

interface RetentionSignalState {
  version: 1;
  firstConsentedAtMs: number;
  d1Sent: boolean;
  d7Sent: boolean;
}

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

export function inviteEntryType(search: string): "challenge" | "room" | null {
  const query = new URLSearchParams(search);
  if (query.has("c")) return "challenge";
  if (query.has("room") && query.get("match") !== "public") return "room";
  return null;
}

export function retentionMilestonesDue(
  firstConsentedAtMs: number,
  alreadySent: Readonly<{ d1: boolean; d7: boolean }>,
  nowMs: number,
): ReturnMilestone[] {
  if (!Number.isFinite(firstConsentedAtMs) || !Number.isFinite(nowMs) || nowMs < firstConsentedAtMs) {
    return [];
  }
  const ageHours = (nowMs - firstConsentedAtMs) / HOUR_MS;
  const due: ReturnMilestone[] = [];
  // These are return-day windows, not "ever after this age" counters. A first
  // visit on day eight must not be backfilled as a day-one return.
  if (!alreadySent.d1 && ageHours >= 20 && ageHours <= 48) due.push("return_d1");
  if (!alreadySent.d7 && ageHours >= 144 && ageHours <= 192) due.push("return_d7");
  return due;
}

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

function readRetentionSignalState(): RetentionSignalState | null {
  try {
    const value = JSON.parse(localStorage.getItem(RETENTION_STORAGE_KEY) ?? "null") as Partial<RetentionSignalState> | null;
    if (
      value?.version !== 1 ||
      !Number.isFinite(value.firstConsentedAtMs) ||
      typeof value.d1Sent !== "boolean" ||
      typeof value.d7Sent !== "boolean"
    ) {
      return null;
    }
    return value as RetentionSignalState;
  } catch {
    return null;
  }
}

function recordReturnSignals(nowMs = Date.now()) {
  let state = readRetentionSignalState();
  if (!state) {
    state = {
      version: 1,
      firstConsentedAtMs: nowMs,
      d1Sent: false,
      d7Sent: false,
    };
  }

  const due = retentionMilestonesDue(
    state.firstConsentedAtMs,
    { d1: state.d1Sent, d7: state.d7Sent },
    nowMs,
  );
  for (const milestone of due) {
    sendEvent(milestone, { cohort: "consented_browser" });
    if (milestone === "return_d1") state.d1Sent = true;
    if (milestone === "return_d7") state.d7Sent = true;
  }
  try {
    localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Analytics remains optional when browser storage is unavailable.
  }
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
  sendEvent("landing_viewed", {
    entry_type: inviteEntryType(window.location.search) ?? "direct",
    ...readSafeCampaignParameters(window.location.search),
  });
  const inviteEntry = inviteEntryType(window.location.search);
  if (inviteEntry) sendEvent("invite_opened", { invite_type: inviteEntry });
  recordReturnSignals();
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
  const inviteEntry = inviteEntryType(window.location.search);
  let hasSeenResult = false;
  let firstTreasureReportedForRun = false;

  const reportPlayStarted = (
    levelName: typeof lastLaunchMode | "live_preview",
    gameMode: "live" | "solo",
  ) => {
    if (hasSeenResult) sendEvent("retry_started", { game_mode: lastLaunchMode });
    firstTreasureReportedForRun = false;
    sendEvent("play_started", {
      game_mode: levelName,
      entry_type: inviteEntry ?? "direct",
    });
    sendEvent("level_start", { level_name: levelName, game_mode: gameMode });
  };

  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button, a");
    if (!target) return;

    const testId = target.dataset.testid;
    if (testId === "live-lab-button") {
      if (target.textContent?.includes("ACCEPT CHALLENGE")) {
        lastLaunchMode = "challenge";
        reportPlayStarted("challenge", "solo");
        return;
      }
      lastLaunchMode = "live";
      reportPlayStarted("live_preview", "live");
      return;
    }
    if (testId === "solo-run-button") {
      lastLaunchMode = selectedSoloMode();
      reportPlayStarted(lastLaunchMode, "solo");
      return;
    }
    if (target.classList.contains("practice-button")) {
      lastLaunchMode = "practice";
      reportPlayStarted("practice", "solo");
      return;
    }
    if (testId === "skin-studio-launch" || testId === "launcher-choose-look") {
      sendEvent("customization_opened", {
        source: testId === "launcher-choose-look" ? "launcher" : "settings",
      });
      return;
    }
    if (testId?.startsWith("control-")) {
      const scheme = testId.slice("control-".length);
      if (["drag-anywhere", "left-helm", "right-helm"].includes(scheme)) {
        sendEvent("select_content", { content_type: "control_scheme", item_id: scheme });
      }
      return;
    }
    if (testId === "legend-voyage-launch") {
      sendEvent("legend_voyage_opened", {
        content_type: "cosmetic_progression_preview",
        item_id: "legend_voyage_one",
      });
      sendEvent("offer_viewed", { surface: "legend_voyage" });
      return;
    }
    if (testId === "launcher-passport" || testId === "captain-passport-settings") {
      sendEvent("passport_open_requested", {
        source: testId === "launcher-passport" ? "launcher" : "settings",
      });
      return;
    }
    if (testId === "launcher-captain-rooms" || testId === "captain-rooms-settings") {
      sendEvent("hosted_room_offer_viewed", {
        source: testId === "launcher-captain-rooms" ? "launcher" : "settings",
      });
      return;
    }
    if (testId === "captain-room-interest") {
      sendEvent("hosted_room_interest_selected", {
        room_tier: target.dataset.roomTier,
      });
      return;
    }
    if (
      testId === "passport-create-passkey" ||
      testId === "passport-signin-passkey" ||
      testId === "passport-email-option" ||
      testId === "passport-add-passkey" ||
      testId === "passport-add-email"
    ) {
      const method = testId.includes("email") ? "email_link" : "passkey";
      sendEvent("passport_method_selected", {
        method,
        intent: testId.includes("signin") ? "sign_in" : testId.includes("add") ? "add" : "create",
      });
      return;
    }
    if (testId === "lobby-invite" || testId === "in-game-invite") {
      sendEvent("invite_created", {
        source: testId === "in-game-invite" ? "in_game" : "launcher",
      });
      return;
    }
    if (testId === "room-invite-copy" || testId === "room-invite-native-share") {
      sendEvent("invite_shared", {
        method: testId === "room-invite-copy" ? "copy" : "native_share",
      });
      return;
    }
    const commercePlan = target.dataset.commercePlan;
    if (commercePlan && testId !== "legend-voyage-interest") {
      const value = Number(target.dataset.valueUsd);
      sendEvent("captain_offer_selected", {
        currency: "USD",
        value: Number.isFinite(value) ? value : 0,
        item_id: commercePlan,
        billing: target.dataset.billing === "monthly" ? "monthly" : "one_time",
      });
      return;
    }
    const legendTheme = target.dataset.legendTheme;
    if (legendTheme && ["krakens-ink", "phoenix-wake", "leviathan-scale"].includes(legendTheme)) {
      sendEvent("legend_theme_previewed", {
        content_type: "cosmetic_theme_preview",
        item_id: legendTheme,
      });
      return;
    }
    if (testId === "legend-voyage-interest") {
      const value = Number(target.dataset.valueUsd);
      sendEvent("captain_offer_interest", {
        currency: "USD",
        value: Number.isFinite(value) ? value : 0,
        item_id: target.dataset.commercePlan ?? "unknown",
        billing: target.dataset.billing === "monthly" ? "monthly" : "one_time",
      });
      sendEvent("offer_interest_selected", {
        offer_type: target.dataset.billing === "monthly" ? "monthly" : "one_time",
      });
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

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;
    const catalog = target.closest<HTMLElement>(
      '[data-testid="body-skin-catalog"], [data-testid="face-only-catalog"], [data-testid="complete-style-catalog"]',
    );
    if (!catalog) return;
    const category = catalog.dataset.testid === "body-skin-catalog"
      ? "body"
      : catalog.dataset.testid === "face-only-catalog"
        ? "face"
        : "complete";
    sendEvent("customization_selected", { category });
  }, { passive: true });

  window.addEventListener("wormifi:treasure-collected", () => {
    if (firstTreasureReportedForRun) return;
    firstTreasureReportedForRun = true;
    sendEvent("first_treasure_collected", { game_mode: lastLaunchMode });
  });

  const seenResults = new WeakSet<Element>();
  const seenLiveDeaths = new WeakSet<Element>();
  const seenLiveCanvases = new WeakSet<Element>();
  const seenPassportDialogs = new WeakSet<Element>();
  const seenPassportProfiles = new WeakSet<Element>();
  let inviteJoinedSent = false;
  let friendPairBothPlayedSent = false;
  let lastConnectionPhase = "";
  let hadAuthoritativeConnection = false;
  let tutorialStarted = false;
  let lastTutorialStage = "";

  const inspect = () => {
    const liveCanvas = document.querySelector<HTMLElement>('[data-testid="live-arena-canvas"][data-authority="server-confirmed"]');
    const humanText = document.querySelector('[data-testid="live-human-count"]')?.textContent ?? "";
    const parsedHumanCount = Number(humanText.match(/\d+/u)?.[0] ?? 0);
    const humanCount = Number.isFinite(parsedHumanCount) ? parsedHumanCount : 0;
    if (liveCanvas && !seenLiveCanvases.has(liveCanvas)) {
      seenLiveCanvases.add(liveCanvas);
      sendEvent("live_connection_confirmed", {
        game_mode: "live",
        human_count: humanCount,
      });
      sendEvent("join_group", {
        group_id: "wormifi_live_room",
        human_count: humanCount,
      });
    }
    if (liveCanvas && inviteEntry && !inviteJoinedSent) {
      inviteJoinedSent = true;
      sendEvent("invite_joined", { invite_type: inviteEntry });
    }
    if (liveCanvas && inviteEntry && humanCount >= 2 && !friendPairBothPlayedSent) {
      friendPairBothPlayedSent = true;
      sendEvent("friend_pair_both_played", { invite_type: inviteEntry });
    }

    const authorityCard = document.querySelector<HTMLElement>(".live-authority-card[data-phase]");
    const connectionPhase = authorityCard?.dataset.phase ?? "";
    if (connectionPhase && connectionPhase !== lastConnectionPhase) {
      if (
        hadAuthoritativeConnection &&
        (connectionPhase === "reconnecting" || connectionPhase === "error") &&
        lastConnectionPhase === "authoritative"
      ) {
        sendEvent("disconnect", { game_mode: "live" });
      }
      if (
        connectionPhase === "authoritative" &&
        hadAuthoritativeConnection &&
        (lastConnectionPhase === "reconnecting" || lastConnectionPhase === "error")
      ) {
        sendEvent("reconnect", { game_mode: "live" });
      }
      if (connectionPhase === "authoritative") hadAuthoritativeConnection = true;
      lastConnectionPhase = connectionPhase;
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
      hasSeenResult = true;
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
      sendEvent("life_ended", {
        game_mode: lastLaunchMode,
        score,
        peak_size: peakSize,
      });
      if (score !== undefined) {
        sendEvent("post_score", { score, level: lastLaunchMode });
      }
    }

    const liveDeath = document.querySelector('[data-testid="live-death-notice"]');
    if (liveDeath && !seenLiveDeaths.has(liveDeath)) {
      seenLiveDeaths.add(liveDeath);
      hasSeenResult = true;
      sendEvent("life_ended", { game_mode: "live" });
    }

    const savedPassport = document.querySelector('[data-testid="passport-saved-profile"]');
    if (savedPassport && !seenPassportProfiles.has(savedPassport)) {
      seenPassportProfiles.add(savedPassport);
      sendEvent("passport_completed");
    }

    const passportDialog = document.querySelector('[data-testid="captain-passport"]');
    if (passportDialog && !seenPassportDialogs.has(passportDialog)) {
      seenPassportDialogs.add(passportDialog);
      sendEvent("passport_prompt_seen");
    }
  };

  const observer = new MutationObserver(inspect);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-authority", "data-stage", "data-phase"],
  });
  window.addEventListener("appinstalled", () => {
    sendEvent("pwa_install", { platform: "web" });
  }, { once: true });
  window.addEventListener("error", () => {
    sendEvent("client_error", { error_type: "script_error" });
  });
  window.addEventListener("unhandledrejection", () => {
    sendEvent("client_error", { error_type: "unhandled_rejection" });
  });
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

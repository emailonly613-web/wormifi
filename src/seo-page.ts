import { initWormifiAnalytics, setWormifiAnalyticsConsent } from "./analytics";
import { registerWormifiServiceWorker } from "./pwa";
import "./analytics-consent.css";
import "./seo-pages.css";

const ANALYTICS_CONSENT_KEY = "wormifi.analytics-consent.v1";

initWormifiAnalytics();
registerWormifiServiceWorker();

function installFounding50Link() {
  const nav = document.querySelector<HTMLElement>(".seo-nav");
  if (!nav || window.location.pathname === "/founding-50.html") return;
  const link = document.createElement("a");
  link.href = "/founding-50.html?utm_source=wormifi&utm_medium=owned_navigation&utm_campaign=founding_50&utm_id=seo_nav";
  link.className = "seo-founding-50-link";
  link.textContent = "FIRST 50 PLAYTEST";
  nav.append(link);
}

installFounding50Link();

function analyticsChoiceMessage() {
  switch (document.documentElement.dataset.analyticsState) {
    case "active":
      return "Optional analytics is currently allowed in this browser.";
    case "denied":
      return "Optional analytics is currently off in this browser.";
    case "awaiting-consent":
      return "No optional analytics choice has been saved yet.";
    case "do-not-track":
      return "Your browser's Do Not Track signal keeps optional analytics off.";
    default:
      return "Optional analytics is not configured, so it remains off.";
  }
}

function installPrivacyChoiceControl() {
  const footer = document.querySelector<HTMLElement>(".seo-footer");
  if (!footer || document.querySelector("#wormifi-privacy-choices")) return () => undefined;

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "seo-privacy-choice-button";
  openButton.textContent = "Privacy choices";
  openButton.setAttribute("aria-haspopup", "dialog");
  openButton.setAttribute("aria-controls", "wormifi-privacy-choices");
  footer.append(openButton);

  const dialog = document.createElement("dialog");
  dialog.id = "wormifi-privacy-choices";
  dialog.className = "seo-privacy-choice-dialog";
  dialog.setAttribute("aria-labelledby", "wormifi-privacy-choice-title");
  dialog.setAttribute("aria-describedby", "wormifi-privacy-choice-status");
  dialog.innerHTML = `
    <form method="dialog" class="seo-privacy-choice-close-row">
      <button type="submit" class="seo-privacy-choice-close" aria-label="Close privacy choices">×</button>
    </form>
    <h2 id="wormifi-privacy-choice-title">Privacy choices</h2>
    <p id="wormifi-privacy-choice-status" role="status" aria-live="polite"></p>
    <div class="seo-privacy-choice-actions">
      <button type="button" class="seo-button secondary" data-privacy-choice="denied">Keep analytics off</button>
      <button type="button" class="seo-button" data-privacy-choice="review">Review optional analytics</button>
    </div>
    <a href="/privacy.html">Read the privacy details</a>
  `;
  document.body.append(dialog);

  const status = dialog.querySelector<HTMLElement>("#wormifi-privacy-choice-status")!;
  const denyButton = dialog.querySelector<HTMLButtonElement>('[data-privacy-choice="denied"]')!;
  const reviewButton = dialog.querySelector<HTMLButtonElement>('[data-privacy-choice="review"]')!;

  const refresh = () => {
    const state = document.documentElement.dataset.analyticsState;
    status.textContent = analyticsChoiceMessage();
    denyButton.textContent = state === "active" ? "Turn analytics off" : "Keep analytics off";
    reviewButton.disabled = state === "missing-id" || state === "do-not-track";
    reviewButton.title = state === "missing-id"
      ? "Optional analytics is not configured."
      : state === "do-not-track"
        ? "Your browser's Do Not Track signal is active."
        : "";
  };

  openButton.addEventListener("click", () => {
    refresh();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });

  denyButton.addEventListener("click", () => {
    setWormifiAnalyticsConsent("denied");
    refresh();
  });

  reviewButton.addEventListener("click", () => {
    // The analytics module intentionally owns the grant flow. Resetting the
    // saved choice and reloading reopens that existing consent prompt without
    // duplicating tag-loading or consent-mode behavior here.
    setWormifiAnalyticsConsent("denied");
    try {
      localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    } catch {
      status.textContent = "This browser could not reopen the choice. Analytics remains off.";
      return;
    }
    window.location.reload();
  });

  refresh();
  return refresh;
}

const refreshPrivacyChoiceControl = installPrivacyChoiceControl();

document.querySelector<HTMLButtonElement>("#disable-wormifi-analytics")?.addEventListener("click", () => {
  setWormifiAnalyticsConsent("denied");
  const status = document.querySelector<HTMLElement>("#analytics-choice-result");
  if (status) status.textContent = "Analytics permission is withdrawn in this browser.";
  refreshPrivacyChoiceControl();
});

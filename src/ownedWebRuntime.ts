import { initWormifiAnalytics } from "./analytics";
import { registerWormifiServiceWorker } from "./pwa";
import "./analytics-consent.css";
import "./pwa.css";

export function startOwnedWebRuntime(): void {
  registerWormifiServiceWorker();
  initWormifiAnalytics();
}

import { useEffect, useState } from "react";

/**
 * Getting Wormifi onto a phone used to be a small text link in a row of policy
 * links, next to "Privacy choices". On Android that meant the browser's own
 * install prompt was never offered at all, and on iOS - where a site can never
 * trigger an install - nobody was told the two taps that actually do it.
 *
 * This is a single obvious control that does the right thing per platform:
 * Android fires the real prompt, iOS shows the Share sheet steps, and a phone
 * that already has the app installed sees nothing.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "ios" | "android" | "touch";

export function InstallAppCard({
  platform,
  installed,
}: {
  platform: InstallPlatform;
  installed: boolean;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | undefined>();
  const [iosStepsOpen, setIosStepsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const capture = (event: Event) => {
      // Holding the event is what lets us offer the prompt from our own button
      // instead of leaving it to whatever the browser decides to surface.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const installedNow = () => setDismissed(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installedNow);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installedNow);
    };
  }, []);

  if (installed || dismissed) return null;

  const runNativePrompt = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => undefined);
    // A dismissed prompt cannot be replayed, so drop it either way rather than
    // leaving a button that silently does nothing the second time.
    setDeferred(undefined);
    if (choice?.outcome === "accepted") setDismissed(true);
  };

  if (platform === "ios") {
    return (
      <section className="install-app-card" data-testid="install-app-card" data-platform="ios">
        <button type="button" onClick={() => setIosStepsOpen((open) => !open)}>
          <strong>GET THE APP</strong>
          <small>Play from your home screen. No app store.</small>
        </button>
        {iosStepsOpen && (
          <ol className="install-app-steps" data-testid="install-app-steps">
            <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>. Wormifi lands next to your other apps.</li>
          </ol>
        )}
      </section>
    );
  }

  if (deferred) {
    return (
      <section className="install-app-card" data-testid="install-app-card" data-platform="android">
        <button type="button" onClick={() => void runNativePrompt()} data-testid="install-app-prompt">
          <strong>GET THE APP</strong>
          <small>Installs straight from here. No app store.</small>
        </button>
      </section>
    );
  }

  return (
    <section className="install-app-card" data-testid="install-app-card" data-platform={platform}>
      <a href="/install.html">
        <strong>GET THE APP</strong>
        <small>Put Wormifi on your phone. No app store.</small>
      </a>
    </section>
  );
}

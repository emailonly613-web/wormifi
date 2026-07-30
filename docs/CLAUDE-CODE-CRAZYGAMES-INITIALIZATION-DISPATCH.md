# Wormifi — CrazyGames HTML5 v3 initialization dispatch

## Authority and target

- Repository: `D:\wormifi`
- Product: Wormifi, an original responsive HTML5 Canvas/TypeScript/Vite game.
- First portal target: CrazyGames.
- Owned canonical website: `https://wormifi.com/`; do not replace its SEO/PWA build with the portal build.
- Portal artifact: `D:\wormifi\Wormifi_CrazyGames_Ready.zip` with `index.html` at ZIP root.
- No merch, apparel, generic ad network, Stripe, or external login work belongs in this lane.

## Mandatory current SDK contract

Use the official CrazyGames HTML5 SDK v3 only:

```html
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

Await `window.CrazyGames.SDK.init()` before SDK calls. The supported video-ad API is:

```js
window.CrazyGames.SDK.ad.requestAd("midgame", callbacks);
window.CrazyGames.SDK.ad.requestAd("rewarded", callbacks);
```

Never introduce `window.CrazyGames.SDK.gameplay.adBreak()` or `rewardedAdBreak()`; those are not CrazyGames HTML5 v3 methods.

Required lifecycle calls:

- `SDK.game.loadingStart()` and `loadingStop()` around initial game loading.
- `SDK.game.gameplayStart()` whenever active play starts/resumes.
- `SDK.game.gameplayStop()` on menus, pauses, run end, and other game breaks.

During an ad request, block duplicate input. On `adStarted`, pause all local simulation/AI/render loops and suspend audio. On both `adFinished` and `adError`, restore control and audio exactly once. A rewarded item is granted only inside `adFinished`; an error, unfilled request, ad blocker, cooldown, synchronous throw, or rejected promise never grants it.

## Placement policy

- Midgame ads: only at a logical completed-run/death break, after at least 60 seconds of accumulated gameplay. Never during steering or a live multiplayer fight.
- Rewarded offer: menu/post-run only, optional, and paired with an equally visible skip path.
- Rewarded UI remains hidden for Basic Launch because CrazyGames disables monetization there.
- No banner may cover the canvas, helm, sprint control, tutorial, result buttons, or mobile safe areas.
- No external ad SDK is allowed in the CrazyGames build.

## Monetization switches

- `VITE_CRAZYGAMES_MENU_MONETIZATION=off` is the single menu-surface switch. After approval it can become `rewarded-skin` or `currency-store`; the two surfaces are mutually exclusive.
- `VITE_CRAZYGAMES_REWARDED_ENABLED=false` during Basic Launch. The `rewarded-skin` menu still fails closed unless this capability gate is explicitly enabled.
- `VITE_CRAZYGAMES_IAP_AUTHORIZED=false` must remain false until CrazyGames explicitly invites Wormifi to IAP and supplies Xsolla setup.
- `VITE_CRAZYGAMES_STORE_LAYOUT=disabled` can become `currency-packs` only after that authorization. Purchase buttons remain disabled until a verified order/inventory/webhook settlement handler is connected.

Do not add a purchase button that cannot complete. Do not grant currency from an unverified client callback. CrazyGames IAP must use its account ID and approved Xsolla flow, and must be hidden inside CrazyGames iOS/Android apps where Xsolla is unavailable.

## Build and verification

Run:

```powershell
pnpm package:crazygames
```

This must produce:

- `D:\wormifi\Wormifi_CrazyGames_Ready\index.html`
- `D:\wormifi\Wormifi_CrazyGames_Ready.zip`
- `D:\wormifi\proof\crazygames\crazygames-build-verification.json`
- `D:\wormifi\proof\crazygames\crazygames-zip-verification.json`
- `D:\wormifi\proof\crazygames\Wormifi_CrazyGames_Ready.sha256.txt`

The verifier must fail if the SDK is missing, an invented API appears, owned-site GA4 leaks into the portal bundle, source atlases/maps ship, `index.html` is nested, file count exceeds 1,500, or the full package exceeds the 20MB mobile-homepage target.

## Honest launch boundary

The ZIP is a platform-integration candidate, not automatic CrazyGames approval. Basic Launch has no ad revenue. Full Launch and ad monetization require CrazyGames QA. Multiplayer portal room/invite APIs and scale proof are the next official phase; do not claim CrazyGames multiplayer readiness until those tests pass in the Developer Portal Preview tool.

Official references:

- https://docs.crazygames.com/sdk/intro/
- https://docs.crazygames.com/sdk/video-ads/
- https://docs.crazygames.com/sdk/game/
- https://docs.crazygames.com/requirements/ads/
- https://docs.crazygames.com/requirements/technical/
- https://docs.crazygames.com/sdk/in-game-purchases/

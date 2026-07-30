# Wormifi accessibility and browser proof

Verified locally on 2026-07-29 with:

```text
pnpm test:e2e:accessibility
12 passed (1.2m)
```

The same four tests passed in Playwright Chromium 151, Firefox 153, and WebKit
26.5:

1. Keyboard-only launcher, mode selection, tutorial steering, and exit with
   visible focus and focus restoration.
2. Keyboard-operable result dialog, focused `PLAY AGAIN`, and a clean tutorial
   restart.
3. Reduced-motion mode with a frozen decorative preview, disabled canvas
   shake/particles/decorative time motion, preserved essential gameplay, and
   matching focus/reduced-motion semantics in the live multiplayer surface.
4. A 320 CSS-pixel viewport (the effective layout width of a 640px viewport at
   200% zoom) with scrollable launcher content and reachable game controls.

Each browser folder contains five screenshots: returned launcher focus, result
retry focus, reduced-motion gameplay, narrow launcher, and narrow gameplay.

This is automated semantic, focus, layout, and browser-engine proof. It is not
a claim of full WCAG conformance or a substitute for a manual screen-reader
study with disabled players.

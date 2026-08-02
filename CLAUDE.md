# Wormifi — read this first

## Start here

**[SESSION-HANDOFF-2026-08-02.md](./SESSION-HANDOFF-2026-08-02.md)** — what the last
session learned, including the mistakes and the traps that cost the most time. Read it
before touching the renderer, the deploy path, or any measurement of live gameplay.

## Standing order: the daily SEO run

**[SEO-GAMEPLAN.md](./SEO-GAMEPLAN.md) is the owner's standing instruction. Read it
at the start of every session and do the daily run before other work.**

Short version: something ships every day — a new article, a refresh of anything
older than 10 days, and 10 manual index requests in Search Console. Daily SEO is
the owner's stated moat. Never a zero day.

## Which folder to work in

| Folder | Use it? |
|---|---|
| `D:\wormifi-store` | **Yes.** Clean, tracks `origin/main`. Do all work here. |
| `D:\wormifi-art` | **No.** A Codex session works here and it carries heavy uncommitted changes. Never build, commit, or package from it. |
| `D:\wormifi` | Stale, often far behind `origin/main`. Fetch before trusting it. |
| `D:\wormifi-ops` | Not a clone. Holds the daily SEO cron, its log, and the clip cutter. |

Always run `git status --short` before building. **Never ship from a dirty tree** —
a build made from half-finished work can send data the deployed server rejects.

Codex pushes often. Always `git fetch origin && git rebase origin/main` before you
push.

## Adding a page — three places, or it doesn't exist

1. The `.html` file at the repo root
2. `rollupInput` in `vite.config.ts` — otherwise it never gets built
3. `public/sitemap.xml` — otherwise Google never learns about it

Plus at least one internal link (usually from `guides.html`) so it isn't an orphan.

## Build and verify

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --dir server install --frozen-lockfile   # needed, or tsc fails
corepack pnpm build
corepack pnpm seo:verify
```

Push to `main` deploys automatically. A change is done when the URL returns 200 on
`wormifi.com` — not when it is committed. Check with `curl -o /dev/null -w "%{http_code}"`.

Live truth about the running server, no clone required:

```bash
curl https://wormifi.com/healthz
```

## Distribution notes

- Any build hosted on someone else's domain (CrazyGames, Poki, itch.io) **must** set
  `VITE_ARENA_WS_URL=wss://wormifi.com/arena`. Without it the client falls back to
  `wss://<window.location.host>/arena`, which resolves to the portal's domain and
  never reaches the arena.
- The CrazyGames package is built and has never been submitted.

## Writing voice

The guide pages concede where competitors win and where Wormifi falls short. Keep
that. It is the reason the pages are worth citing, and it is what AI search engines
surface. Do not turn them into marketing copy.

# Wormifi SEO Gameplan — the daily moat

**Owner's strategy, in his words:** daily SEO is the moat. Flood the internet with
Wormifi until the compounding starts and other people do the YouTube, TikTok and
backlink work for us. Organic, free, every day, forever.

This file is the standing order. Read it at the start of every session and do the
work below before anything else.

---

## The one-line theory

Search rankings compound. Two hundred pages published over a year beat twenty
pages published in a week, because each page earns a little authority, links to
the others, and the whole set rises together. The only way to lose is to stop.

**So the rule is: something ships every single day.** A new article, a refresh, or
at minimum the indexing pass. Never a zero day.

---

## The daily run — do this in order

### 1. Check the automated pass actually ran
The cron at `D:\wormifi-ops\wormifi-seo-daily.ps1` already resubmits the sitemap,
pings IndexNow (Bing + Yandex + shared endpoint), and logs Google's index status
for a rotating sample.

```
tail -30 D:\wormifi-ops\wormifi-seo-daily.log
```

Look for `--- run end ---` with today's date. If it didn't run, run it manually.
If it failed, fix that before writing anything new — a broken pipeline makes every
other step worthless.

### 2. Manually request indexing for 10 URLs
**This must be done by hand.** Google's URL Inspection API can *check* index status
but cannot *request* indexing — that button exists only in the Search Console web
UI, and the quota is roughly 10–12 URLs per day. That quota is the reason this list
is exactly 10.

Go to Search Console → URL Inspection → paste URL → **Request Indexing**.

Pick today's 10 using the priority order in the next section.

### 3. Publish or refresh
- **New article** if there's a gap worth filling (see the backlog below).
- **Refresh anything older than 10 days.** Find them with:

```bash
cd /d/wormifi-store
grep -l 'dateModified' *.html | while read f; do
  d=$(grep -o '"dateModified": "[0-9-]*"' "$f" | head -1 | grep -o '[0-9-]\{10\}')
  echo "$d $f"
done | sort | head -15
```

A refresh is not a timestamp bump. Change something real — a new section, updated
competitor facts, a new internal link, a sharper opening. Then update both
`dateModified` in the JSON-LD **and** the `<lastmod>` in `public/sitemap.xml`.
Google notices thin edits and ignores them.

### 4. Ship it
```bash
cd /d/wormifi-store
git fetch origin && git rebase origin/main    # Codex pushes often — always rebase first
corepack pnpm build && corepack pnpm seo:verify
git add -A && git commit && git push origin main
```
Deploy is automatic on push to `main` and takes a few minutes. **Verify the page
is actually live (200, not 404) before calling it done.**

---

## How to choose today's 10 indexing requests

Work down this list. Stop at 10.

| Priority | What | Why it earns the slot |
|---|---|---|
| 1 | **Pages published in the last 48h** | Brand-new URLs are invisible until Google crawls them. Manual request is the single fastest path from published to indexed. Highest return per slot, always. |
| 2 | **Pages just refreshed** | Google caches an old copy. Requesting re-index is how the new content actually reaches the index instead of sitting unnoticed. |
| 3 | **"URL is unknown to Google"** in the cron log | Google has never seen these. Nothing else can happen until it does — no impressions, no ranking, no compounding. |
| 4 | **"Discovered – currently not indexed"** | Google knows the URL and chose not to index it. A manual request is a second look, and often enough on a young domain. |
| 5 | **Commercial-intent pages with impressions but position > 20** | These already have proven demand. Re-indexing after a content improvement is how they climb. |
| 6 | **The homepage, weekly** | It's the page every internal link points at. Keeping it freshly crawled helps the whole site get recrawled. |

**Never waste a slot on:** a page already indexed and unchanged, or a devlog with no
search demand. The quota is the scarcest resource in this whole plan — 10 a day is
3,650 a year, and every wasted one is gone.

---

## Article backlog — gaps worth filling

Ordered by value. Cross off as they ship; add new ideas as you find them.

- [ ] `worm-games-no-lag.html` — performance/low-end angle, real long-tail demand
- [ ] `best-io-games-2026.html` — broad genre roundup, evergreen, internal-link hub
- [ ] `wormifi-vs-wormax-io.html` — completes the head-to-head series
- [ ] `worm-game-tips-for-beginners.html` — high-volume beginner intent
- [ ] `paper-io-vs-worm-games.html` — captures the adjacent .io audience
- [ ] `how-to-get-big-fast-worm-games.html` — the single most-searched player question
- [ ] `two-player-worm-games.html` — friend/co-op intent, we have private rooms
- [ ] `worm-games-for-low-end-pc.html` — hardware angle, low competition

**Shipped 2026-08-02:** `worm-games-chromebook`, `games-like-agar-io`,
`games-like-wormax-io`, `wormifi-vs-worms-zone`, `wormifi-vs-little-big-snake`.

---

## Non-negotiable rules

1. **Never build or commit from `D:\wormifi-art`.** Codex works there and it carries
   heavy uncommitted changes. Use `D:\wormifi-store`, and always `git status` first.
2. **Every new page must be registered in three places** or it silently doesn't exist:
   `vite.config.ts` (`rollupInput`), `public/sitemap.xml`, and at least one internal
   link from `guides.html`. An orphan page ranks for nothing.
3. **Every page follows the existing article contract** — full meta, Open Graph,
   Twitter card, canonical, Article + BreadcrumbList JSON-LD, the standard header
   nav, and `<script type="module" src="/src/seo-page.ts">`.
4. **Write honestly.** The existing articles concede where competitors win and where
   Wormifi falls short. That voice is a genuine asset — it's what makes the pages
   worth citing and what AI search engines pick up. Do not turn them into brochures.
5. **Verify before claiming.** A page is shipped when it returns 200 on
   `wormifi.com`, not when it's committed.

---

## What this plan does not do

Stated plainly so it stays honest: SEO on a domain this young takes months to move,
and competitor terms like "games like slither.io" are held by sites with a decade of
backlinks. This plan is a compounding bet, not a switch.

The accelerant is **other sites linking here**. Portal listings, forum mentions and
creator coverage are what make these pages start ranking. When the owner is ready
for those, they multiply everything in this file. Until then, the daily cadence
keeps building the asset that those links will eventually lift.

---

*Last updated: 2026-08-02*

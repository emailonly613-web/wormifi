# Wormifi first-50 autonomous acquisition contract

**Date:** 2026-07-31

**Immediate bottleneck:** too few outside players, not insufficient dashboards

**Goal:** create the first measurable cohort of 50 outside gameplay sessions without a login, checkout, ad spend, or owner-operated form entry

## The law of the land

Work starts from the constraint that is true now. Wormifi cannot optimize retention, conversion, or monetization from an empty sample. Until outside players are actually arriving, the primary job is qualified traffic plus a frictionless first run.

That does not mean manufacturing a vanity counter or calling crawlers players. The first-50 checkpoint is passed only by outside people reaching gameplay. A page view, search impression, bot, developer browser, or copied link is not a player.

## What now runs without owner entry

1. `https://wormifi.com/founding-50.html` is a dedicated, indexable acquisition page with three choices: play one run, host a free room, or invite one friend.
2. Every public guide page adds a visible `FIRST 50 PLAYTEST` link at runtime, so existing search traffic has a direct path into the cohort instead of disappearing into informational content.
3. The campaign page is in the canonical sitemap. The sanctioned deployment sends the entire sitemap to the public IndexNow endpoints after public verification.
4. The play and host actions carry allowlisted `utm_*` labels. Wormifi records them only after the visitor allows optional analytics.
5. `HOST A FREE ROOM` opens Captain Rooms immediately. It does not open Passport, checkout, or another explanation page.
6. Room creation still produces the exact 10/20/30-seat private arena link. The temporary `launch=captain-room` instruction is removed from the friend invite so guests auto-join the room instead of seeing the host screen.
7. `INVITE ONE FRIEND` uses the phone or desktop share sheet when available, with a clipboard fallback. Its referral link is labeled `player_share / referral / founding_50`.
8. No new changelog or developer update post is part of this campaign. The owner explicitly paused that public claim surface.

## Honest measurement

The privacy contract means there are two distinct evidence buckets:

- **Consented funnel evidence:** `landing_viewed` → `first_50_action` → `play_started` → `live_connection_confirmed` → `life_ended`; room virality adds `invite_shared`, `invite_joined`, and `friend_pair_both_played`.
- **Operational evidence:** the live server and HUD show connected humans separately from labeled AI. This proves current presence but is not a durable unique-person counter.

Declining analytics must continue to work. Therefore, consented analytics will undercount total players. The team must never inflate the first-50 claim by treating all page views as people or by treating 50 sessions as 50 unique humans without additional evidence.

For the next decision round, use this minimum evidence bundle:

- at least 50 outside gameplay starts or an explicitly labeled lower-bound of 50 consented starts;
- completed-run rate;
- replay rate;
- live connection success rate;
- share/host action rate;
- invite join rate;
- at least five observed phone sessions and five observed desktop sessions;
- the top three repeated failure or confusion points.

## Traffic lanes and responsibility boundary

| Lane | Automatic now | Needs an outside identity or terms acceptance | Why it matters |
|---|---:|---:|---|
| Existing Wormifi search pages → Founding 50 | Yes | No | Converts traffic Wormifi already earns |
| Sitemap + IndexNow discovery | Yes after deploy | No | Announces the new page to supported search engines |
| Player native share / clipboard | Yes after one visitor arrives | No | Creates the only truly compounding loop in the owned product |
| Free Captain Room invites | Yes after one visitor hosts | No | Turns one player into a real multiplayer cohort |
| Direct `wormifi.com/founding-50.html` link | Ready | Someone still has to place the first link | Clean universal entry point |
| CrazyGames Basic Launch submission | Upload package ready | Yes | Portal account, submission, terms, and review |
| itch.io / Game Jolt / Newgrounds listing | Copy and assets ready | Yes | Account, platform terms, and submission |
| Reddit, Discord, X, TikTok, creator outreach | Copy and tracked links ready | Yes | Posting under a real person's or brand's identity |
| Paid acquisition | No | Yes, plus spend authority | Intentionally not justified before retention evidence |

## Brutal constraint

Owned code can remove friction, expose the campaign to existing traffic, ping supported indexes, and make each player capable of recruiting the next one. It cannot guarantee that 50 humans arrive quickly when there is no seed audience. The remaining seed step is distribution under an accountable external identity. Codex must not silently create accounts, accept terms, impersonate the owner, or spend money.

The safe autonomous maximum is therefore: deploy the owned engine, prove every route, produce upload-ready packages and tracked copy, and reduce the external seed action to a small number of deliberate submissions. Once any seed visitor arrives, the player-share and Captain Room loop can operate without owner entry.

## Decision after the first cohort

Do not choose the next large feature by taste. Rank the next work by observed loss:

1. arrival → first play;
2. first play → first treasure;
3. first treasure → completed run;
4. completed run → replay;
5. replay → share or room host;
6. invite open → joined arena;
7. joined arena → both friends actually playing;
8. phone versus desktop failure rate;
9. repeated visual or control complaints;
10. only then, monetization interest.

Stripe and paid Captain Rooms remain outside this gate.

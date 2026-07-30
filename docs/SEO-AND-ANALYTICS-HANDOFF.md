# Wormifi SEO and analytics handoff

## Honest status

The repository now contains a production-oriented technical SEO foundation. It
has **not** been deployed by this lane, and indexing or ranking is never
guaranteed. Search engines decide when and whether to crawl, index, and rank a
page.

No GA4 Measurement ID was present in the repository, DigitalOcean spec, or
local environment at implementation time. The Google Analytics Admin API was
enabled for the active Google Cloud project, but the authenticated account did
not have Analytics Admin API permission to enumerate or create properties. No
ID was invented.

## Search assets now in source

- Root title, description, canonical, robots directives, Open Graph, Twitter
  card, large preview image metadata, and crawlable pre-render fallback copy.
- `WebSite` plus `VideoGame` / `SoftwareApplication` JSON-LD on the game page.
  It describes a free browser game and calls network play a preview; it does not
  claim scale, retention, revenue, no lag, or competitor parity.
- Distinct crawlable guides at `/how-to-play.html`, `/multiplayer.html`, and
  `/pirate-treasure.html`, plus `/privacy.html`.
- One canonical sitemap at `/sitemap.xml` and crawler policy at `/robots.txt`.
- A multi-page Vite build, so the guide HTML is emitted as real static pages
  rather than client-only routes.
- `pnpm seo:verify` validates titles, descriptions, canonical URLs, social
  cards, valid JSON-LD, sitemap coverage, robots discovery, consent safeguards,
  and built-page presence.

## GA4 activation contract

Analytics fails closed. A Google tag request is made only when all of these are
true:

1. `VITE_GA4_MEASUREMENT_ID` contains a syntactically valid real `G-...` Web
   data-stream ID at **build time**.
2. The browser does not send Do Not Track.
3. The visitor explicitly selects `ALLOW ANALYTICS`.

Consent defaults to denied for analytics and every advertising category. The
integration disables Google Signals and advertising-personalization signals in
code. It sends a deliberate sanitized `page_view` with `send_page_view: false`
to avoid duplicate automatic views.

The page location is reduced to origin plus pathname. Internal referrers lose
query and fragment data; external referrers are reduced to origin. Only
`utm_source`, `utm_medium`, `utm_campaign`, and `utm_id` are allowlisted, length
limited, and rejected when they resemble an email address or a long number.
The code never reads or transmits the arena-name input, room number, reconnect
token, challenge token, or full query string.

### Funnel events

| Event | Meaning | Parameters intentionally allowed |
| --- | --- | --- |
| `page_view` | Consented visit | sanitized page location/referrer and safe campaign fields |
| `level_start` | Live, rush, endless, or practice button selected | mode only |
| `live_connection_confirmed` | Server-authoritative canvas confirmed | numeric human count; no room ID |
| `tutorial_begin` | Built-in tutorial appeared | none |
| `tutorial_progress` | Tutorial moved to a named product step | fixed step name only |
| `tutorial_complete` | Final tutorial step completed | none |
| `level_end` | Solo result panel appeared | mode and numeric score/size/cut totals |
| `post_score` | GA4 recommended game score event | numeric score and mode |
| `replay_viewed` | Exact local replay selected | mode only |
| `share_challenge_requested` | Share button selected | content type and mode; this is not reported as a completed share |
| `select_content` | Mobile control scheme selected | one fixed allowlisted scheme |

## Owner actions before analytics activation

1. In Google Analytics, create or select the Wormifi GA4 property and Web data
   stream for `https://wormifi.com` using an account with Analytics Editor or
   Administrator access.
2. Review the legal owner identity, public privacy contact, consent language,
   jurisdiction requirements, retention duration, data-sharing controls,
   internal-traffic filter, and unwanted-referral list. Keep user-provided data
   collection, Google Signals, and ads personalization off unless a later legal
   and product decision explicitly changes the contract.
3. Add the real ID as build-time environment variable
   `VITE_GA4_MEASUREMENT_ID` on the **web static-site component**. Do not put an
   Analytics API credential in the browser; a Measurement ID is public
   configuration, not an API secret.
4. Build and deploy, grant consent in a clean browser, then confirm exactly one
   sanitized `page_view` and the allowlisted game events in GA4 Realtime and
   DebugView. Confirm denied consent and Do Not Track produce no Google tag
   request.

Official setup and validation references:

- [GA4 single-page applications](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [GA4 page and screen views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GA4 recommended events for games](https://support.google.com/analytics/answer/9267735?hl=en)
- [Google tag troubleshooting](https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot)
- [Google consent management](https://support.google.com/analytics/answer/12329599?hl=en)

## Search-engine launch actions

1. Verify a **Domain property** for `wormifi.com` in Google Search Console using
   the DNS TXT record it supplies. This covers apex, `www`, HTTP, and HTTPS.
2. Submit `https://wormifi.com/sitemap.xml` in Search Console only after the new
   files are deployed and return `200` with the correct content types.
3. Inspect the root and three guide URLs in Search Console. Request indexing
   after confirming Google sees the intended canonical and rendered content.
4. Run the root URL through Google's Rich Results Test and Schema Markup
   Validator. Structured data improves machine understanding but does not
   guarantee a rich result.
5. Create or verify Bing Webmaster Tools, import the Search Console property if
   desired, and submit the same sitemap.
6. Test the deployed root with the sharing debuggers used by target networks so
   they refresh the 1200x630 card. Do not advertise unfinished features in
   social copy.
7. Review Search Console Coverage, Core Web Vitals, search queries, and GA4
   acquisition only after enough real data exists. Add future content because
   it answers real player questions, not to manufacture keyword doorway pages.

Google's current crawl and structured-data references:

- [Crawling and indexing overview](https://developers.google.com/search/docs/crawling-indexing)
- [Canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Software application structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)

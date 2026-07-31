export const FOUNDING_50_CAMPAIGN = "founding_50";
export const FOUNDING_50_PAGE_PATH = "/founding-50.html";

export type GrowthLaunchIntent = "captain-room";
export type Founding50Action = "play" | "host" | "share";

export function readGrowthLaunchIntent(
  search: string | URLSearchParams,
): GrowthLaunchIntent | null {
  const query = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return query.get("launch") === "captain-room" ? "captain-room" : null;
}

export function buildFounding50GameUrl(
  action: Exclude<Founding50Action, "share">,
  origin = "https://wormifi.com",
): string {
  const url = new URL("/", origin);
  url.searchParams.set("utm_source", "founding50");
  url.searchParams.set("utm_medium", "owned_campaign");
  url.searchParams.set("utm_campaign", FOUNDING_50_CAMPAIGN);
  url.searchParams.set("utm_id", action);
  if (action === "host") url.searchParams.set("launch", "captain-room");
  return url.toString();
}

export function buildFounding50ShareUrl(
  origin = "https://wormifi.com",
): string {
  const url = new URL(FOUNDING_50_PAGE_PATH, origin);
  url.searchParams.set("utm_source", "player_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", FOUNDING_50_CAMPAIGN);
  url.searchParams.set("utm_id", "founding_crew");
  return url.toString();
}

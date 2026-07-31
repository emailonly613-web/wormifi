export type CaptainCommerceOffer = Readonly<{
  id: "captain-club-monthly-v1" | "legend-voyage-lifetime-v1";
  label: string;
  shortLabel: string;
  billing: "monthly" | "one_time";
  priceResearchUsdCents: number;
  priceResearchLabel: string;
  relationship: "access_while_active" | "permanent_ownership";
  relationshipLabel: string;
  promise: string;
  includes: readonly string[];
  cancellation: string | null;
  purchasable: false;
}>;

export const FORBIDDEN_PAID_GAMEPLAY_ADVANTAGES = Object.freeze([
  "xp",
  "score",
  "size",
  "speed",
  "boost",
  "collision power",
  "multipliers",
  "zoom",
  "radar",
  "relic power",
  "lives",
  "rank",
  "skips",
  "loot-box odds",
] as const);

export const CAPTAIN_COMMERCE_OFFERS = Object.freeze([
  Object.freeze({
    id: "captain-club-monthly-v1",
    label: "CAPTAIN CLUB",
    shortLabel: "$1.99 / MONTH",
    billing: "monthly",
    priceResearchUsdCents: 199,
    priceResearchLabel: "$1.99",
    relationship: "access_while_active",
    relationshipLabel: "ACCESS WHILE ACTIVE",
    promise: "Unlimited use of the Captain Club cosmetic catalog while membership is active.",
    includes: Object.freeze([
      "All Captain Club identities, wakes, flourishes, and nameplates while active",
      "New Club cosmetics join the catalog when they are published",
      "Free themes and permanent purchases always remain yours",
    ]),
    cancellation: "Cancel online any time. Club access continues through the paid period, then ends.",
    purchasable: false,
  }),
  Object.freeze({
    id: "legend-voyage-lifetime-v1",
    label: "OWN FOREVER",
    shortLabel: "$9.99 ONCE",
    billing: "one_time",
    priceResearchUsdCents: 999,
    priceResearchLabel: "$9.99",
    relationship: "permanent_ownership",
    relationshipLabel: "PERMANENT OWNERSHIP",
    promise: "Own the fixed Legend Voyage collection permanently on every restored Captain Passport.",
    includes: Object.freeze([
      "Three complete Legend identities and signature wakes",
      "Arrival and triumph flourishes plus the Voyage Master nameplate",
      "Permanent restoration with your future Captain Passport",
    ]),
    cancellation: null,
    purchasable: false,
  }),
] satisfies readonly CaptainCommerceOffer[]);

export type CaptainCommerceOfferId = (typeof CAPTAIN_COMMERCE_OFFERS)[number]["id"];

export function getCaptainCommerceOffer(id: CaptainCommerceOfferId): CaptainCommerceOffer {
  const offer = CAPTAIN_COMMERCE_OFFERS.find((candidate) => candidate.id === id);
  if (!offer) throw new Error(`Unknown Captain commerce offer: ${id}`);
  return offer;
}

export const DEFAULT_CAPTAIN_COMMERCE_OFFER_ID: CaptainCommerceOfferId = "captain-club-monthly-v1";

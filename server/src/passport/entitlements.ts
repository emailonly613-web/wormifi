import type {
  CaptainEntitlementEventAction,
  CaptainEntitlementEventRecord,
  CaptainEntitlementProductId,
  CaptainEntitlementState,
} from "./types";

export const CAPTAIN_ENTITLEMENT_PRODUCTS = Object.freeze({
  "captain-club-monthly-v1": Object.freeze({
    relationship: "access_while_active" as const,
  }),
  "legend-voyage-lifetime-v1": Object.freeze({
    relationship: "permanent_ownership" as const,
  }),
});

export function isCaptainEntitlementProductId(
  value: unknown,
): value is CaptainEntitlementProductId {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(CAPTAIN_ENTITLEMENT_PRODUCTS, value);
}

export function isCaptainEntitlementEventAction(
  value: unknown,
): value is CaptainEntitlementEventAction {
  return value === "grant" ||
    value === "renew" ||
    value === "cancel_at_period_end" ||
    value === "reverse" ||
    value === "correct";
}

function ordered(
  events: readonly CaptainEntitlementEventRecord[],
): CaptainEntitlementEventRecord[] {
  return [...events].sort((first, second) =>
    first.occurredAtMs - second.occurredAtMs ||
    first.eventId.localeCompare(second.eventId)
  );
}

/**
 * Derives access from immutable events. A reversal suppresses only its named
 * target. Monthly paid-through time is the maximum surviving verified grant,
 * so delayed or reordered delivery cannot duplicate or shorten access.
 */
export function deriveCaptainEntitlements(
  events: readonly CaptainEntitlementEventRecord[],
  nowMs = Date.now(),
): CaptainEntitlementState[] {
  const sorted = ordered(events);
  const reversedIds = new Set(
    sorted
      .filter((event) => event.action === "reverse" && event.reversesEventId)
      .map((event) => event.reversesEventId as string),
  );

  return (Object.keys(CAPTAIN_ENTITLEMENT_PRODUCTS) as CaptainEntitlementProductId[])
    .map((productId): CaptainEntitlementState => {
      const product = CAPTAIN_ENTITLEMENT_PRODUCTS[productId];
      const history = sorted.filter((event) => event.productId === productId);
      const surviving = history.filter((event) =>
        event.action !== "reverse" && !reversedIds.has(event.eventId)
      );
      const latestSurviving = surviving.at(-1);
      const latestCancellation = [...surviving]
        .reverse()
        .find((event) => event.action === "cancel_at_period_end");
      const latestAccessEvent = [...surviving]
        .reverse()
        .find((event) =>
          event.action === "grant" ||
          event.action === "renew" ||
          event.action === "correct"
        );

      if (product.relationship === "permanent_ownership") {
        const permanent = Boolean(latestAccessEvent);
        return {
          productId,
          relationship: product.relationship,
          active: permanent,
          permanent,
          paidThroughMs: null,
          cancelAtPeriodEnd: false,
          lastEventAtMs: history.at(-1)?.occurredAtMs ?? null,
          history,
        };
      }

      const paidThroughMs = surviving.reduce((maximum, event) =>
        event.paidThroughMs === null
          ? maximum
          : Math.max(maximum, event.paidThroughMs), 0) || null;
      const cancelAtPeriodEnd = Boolean(
        latestCancellation &&
        (!latestAccessEvent || latestCancellation.occurredAtMs >= latestAccessEvent.occurredAtMs),
      );
      return {
        productId,
        relationship: product.relationship,
        active: paidThroughMs !== null && nowMs < paidThroughMs,
        permanent: false,
        paidThroughMs,
        cancelAtPeriodEnd,
        lastEventAtMs: history.at(-1)?.occurredAtMs ?? null,
        history,
      };
    });
}

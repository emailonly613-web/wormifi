import { readFile } from "node:fs/promises";

const scorecardUrl = new URL("../docs/WORMIFI-REVENUE-READINESS-SCORECARD.json", import.meta.url);
const scorecard = JSON.parse(await readFile(scorecardUrl, "utf8"));

const requiredGateIds = [
  "commercial_offer",
  "identity",
  "recovery",
  "sessions",
  "progression",
  "entitlements",
  "fairness",
  "privacy_age_legal",
  "accessibility",
  "reliability",
  "operations",
  "value",
  "independent_audit",
];

if (!Number.isInteger(scorecard.passingScore) || scorecard.passingScore !== 8) {
  throw new Error("Revenue readiness must require a score of 8 or higher.");
}

const gates = new Map(scorecard.nonPaymentGates.map((gate) => [gate.id, gate]));
for (const gateId of requiredGateIds) {
  const gate = gates.get(gateId);
  if (!gate) throw new Error(`Missing non-payment revenue gate: ${gateId}`);
  if (!Number.isInteger(gate.score) || gate.score < 0 || gate.score > 10) {
    throw new Error(`Invalid score for revenue gate ${gateId}`);
  }
  if (!gate.evidence || !gate.nextProof) {
    throw new Error(`Revenue gate ${gateId} must name evidence and the next proof.`);
  }
}

if (gates.size !== requiredGateIds.length) {
  throw new Error("Revenue scorecard contains an unknown or duplicate gate.");
}

const allNonPaymentGatesPass = [...gates.values()].every((gate) => gate.score >= scorecard.passingScore);
if (scorecard.stripeDetailsAllowed !== allNonPaymentGatesPass) {
  throw new Error("Stripe-details permission does not match the fail-closed non-payment gate result.");
}
if (scorecard.checkoutEnabled !== false) {
  throw new Error("Public checkout must remain disabled during readiness work.");
}
if (scorecard.paymentRail.score !== 0 || scorecard.paymentRail.status !== "not_started") {
  throw new Error("Payment rail must remain unstarted until the user enters the gated Stripe setup phase.");
}

const lowest = [...gates.values()].sort((left, right) => left.score - right.score)[0];
console.log(`REVENUE_READINESS=BLOCKED STRIPE_DETAILS_ALLOWED=NO LOWEST_GATE=${lowest.id}:${lowest.score}`);

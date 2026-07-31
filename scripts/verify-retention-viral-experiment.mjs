import { readFileSync } from "node:fs";

const contract = JSON.parse(readFileSync(
  new URL("../docs/WORMIFI-RETENTION-VIRAL-EXPERIMENT-V1.json", import.meta.url),
  "utf8",
));

const failures = [];
if (contract.schemaVersion !== 1) failures.push("schemaVersion must be 1");
if (contract.status !== "predeclared_not_run") failures.push("pilot must remain explicitly unrun");
if (contract.minimumSample?.firstTimePlayers < 20) failures.push("minimum first-time sample must be at least 20");
if (contract.minimumSample?.uncoachedFriendPairs < 5) failures.push("minimum friend-pair sample must be at least 5");
if (contract.privacy?.emailAddressesInObservationSheet !== false) failures.push("observation sheet must exclude email");
if (contract.privacy?.namesInObservationSheet !== false) failures.push("observation sheet must exclude names");
if (!Array.isArray(contract.gates) || contract.gates.length < 11) failures.push("all predeclared gates are required");
for (const gate of contract.gates ?? []) {
  if (!gate.id || !gate.numerator || !gate.denominator) failures.push("every gate needs exact counting fields");
  if (!(gate.minimumRate >= 0 && gate.minimumRate <= 1)) failures.push(`invalid minimum rate for ${gate.id}`);
}
for (const required of [
  "play_started",
  "life_ended",
  "retry_started",
  "invite_created",
  "invite_joined",
  "passport_prompt_seen",
  "passport_completed",
  "hosted_room_offer_viewed",
  "hosted_room_interest_selected",
  "return_d1",
  "return_d7",
]) {
  if (!contract.requiredEventVocabulary?.includes(required)) {
    failures.push(`missing event vocabulary: ${required}`);
  }
}
if (!String(contract.claimBoundary).includes("would not prove virality")) {
  failures.push("claim boundary must reject viral extrapolation");
}

if (failures.length > 0) {
  process.stderr.write(`RETENTION_VIRAL_EXPERIMENT=INVALID\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `RETENTION_VIRAL_EXPERIMENT=PREDECLARED_NOT_RUN FIRST_TIME_PLAYERS=${contract.minimumSample.firstTimePlayers} FRIEND_PAIRS=${contract.minimumSample.uncoachedFriendPairs} GATES=${contract.gates.length}\n`,
);

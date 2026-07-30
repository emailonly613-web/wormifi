export const DEFAULT_ROOM_ID = "public-1";

const ROOM_ID_PATTERN = /^[a-z0-9-]{1,32}$/u;

export function normalizeRoomId(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 32);
  return ROOM_ID_PATTERN.test(normalized) ? normalized : DEFAULT_ROOM_ID;
}

export function readRoomId(search = window.location.search): string {
  return normalizeRoomId(new URLSearchParams(search).get("room"));
}

export function writeRoomIdToLocation(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("room", normalizeRoomId(roomId));
  window.history.replaceState(null, "", url);
}

export function buildRoomInviteUrl(roomId: string, href = window.location.href): string {
  const url = new URL(href);
  url.searchParams.delete("c");
  url.searchParams.delete("arena_ws");
  url.searchParams.set("room", normalizeRoomId(roomId));
  url.hash = "";
  return url.toString();
}

export function createCrewRoomId(random = crypto.getRandomValues(new Uint32Array(1))[0]): string {
  return `crew-${String(random % 1_000_000).padStart(6, "0")}`;
}

export function roomIdentityLabel(roomId: string): string {
  return `ROOM #${normalizeRoomId(roomId).toUpperCase()}`;
}

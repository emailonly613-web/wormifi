const GIT_REVISION = /^[0-9a-f]{7,64}$/u;

/** Fail closed when a deployment provider did not supply a real Git revision. */
export function normalizeBuildRevision(value: unknown): string {
  if (typeof value !== "string") return "development";
  const normalized = value.trim().toLowerCase();
  return GIT_REVISION.test(normalized) ? normalized : "development";
}

/** The exact deployed revision embedded by Vite into the owned-site HTML. */
export function readBuildRevision(): string {
  if (typeof document === "undefined") return "development";
  return normalizeBuildRevision(
    document.querySelector('meta[name="wormifi-build-revision"]')?.getAttribute("content"),
  );
}

/** Compact human-readable release identity; the full revision remains public. */
export function buildVersionLabel(revision: unknown): string {
  const normalized = normalizeBuildRevision(revision);
  return normalized === "development" ? "LOCAL DEV" : `v${normalized.slice(0, 7)}`;
}

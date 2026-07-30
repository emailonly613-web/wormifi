const GIT_REVISION = /^[0-9a-f]{7,64}$/u;

/** Fail closed when a deployment provider did not supply a real Git revision. */
export function normalizeBuildRevision(value: unknown): string {
  if (typeof value !== "string") return "development";
  const normalized = value.trim().toLowerCase();
  return GIT_REVISION.test(normalized) ? normalized : "development";
}

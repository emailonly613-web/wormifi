const DEVELOPMENT_REVISION = "development";
const GIT_REVISION_PATTERN = /^[0-9a-f]{7,64}$/iu;

/** Keep deployment identity public, stable and non-secret. DigitalOcean binds
 * the component's exact Git revision into WORMIFI_COMMIT_HASH at runtime. */
export function normalizeBuildRevision(value: string | undefined): string {
  const revision = value?.trim().toLowerCase();
  return revision && GIT_REVISION_PATTERN.test(revision)
    ? revision
    : DEVELOPMENT_REVISION;
}

export const SERVER_BUILD_REVISION = normalizeBuildRevision(
  process.env.WORMIFI_COMMIT_HASH,
);

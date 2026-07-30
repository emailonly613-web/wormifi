import { describe, expect, it } from "vitest";

import { buildVersionLabel, normalizeBuildRevision } from "../src/buildRevision";

describe("client build revision", () => {
  it("publishes a normalized Git identity", () => {
    expect(normalizeBuildRevision(" 8BE3F8212C16C18E ")).toBe("8be3f8212c16c18e");
    expect(normalizeBuildRevision("a".repeat(64))).toBe("a".repeat(64));
  });

  it("fails closed for placeholders and non-revisions", () => {
    expect(normalizeBuildRevision(undefined)).toBe("development");
    expect(normalizeBuildRevision("${_self.COMMIT_HASH}")).toBe("development");
    expect(normalizeBuildRevision("not-a-revision")).toBe("development");
    expect(normalizeBuildRevision("abc123")).toBe("development");
  });

  it("shows a compact public version while preserving local honesty", () => {
    expect(buildVersionLabel("8be3f8212c16c18e")).toBe("v8be3f82");
    expect(buildVersionLabel("not-a-revision")).toBe("LOCAL DEV");
  });
});

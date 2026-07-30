import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Open Graph share preview", () => {
  it("ships the exact PNG dimensions and complete image/card metadata", () => {
    const verifier = path.resolve("scripts", "verify-og-card.mjs");
    const result = spawnSync(process.execPath, [verifier], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OG_OK image=1200x630 metadata=17");
  });
});

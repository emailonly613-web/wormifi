import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { BoostChips } from "../src/components/BoostChips";

describe("BoostChips strip (top-screen multiplier stack)", () => {
  it("renders one chip per running tier plus the combined total", () => {
    const markup = renderToStaticMarkup(createElement(BoostChips, {
      chips: [
        { tier: 10, remainingSeconds: 4 },
        { tier: 3, remainingSeconds: 12 },
        { tier: 2, remainingSeconds: 38 },
      ],
    }));
    expect(markup).toContain("×10");
    expect(markup).toContain("4s");
    expect(markup).toContain("×3");
    expect(markup).toContain("×2");
    expect(markup).toContain("38s");
    // 10 * 3 * 2 — the overlap multiplies.
    expect(markup).toContain("×60");
    expect(markup).toContain("TOTAL");
    expect(markup).toContain('aria-label="Treasure multiplier ×60 active"');
  });

  it("renders a single tier without the redundant total chip", () => {
    const markup = renderToStaticMarkup(createElement(BoostChips, {
      chips: [{ tier: 2, remainingSeconds: 20 }],
    }));
    expect(markup).toContain("×2");
    expect(markup).not.toContain("TOTAL");
  });

  it("renders nothing at all when no boost is running", () => {
    expect(renderToStaticMarkup(createElement(BoostChips, { chips: [] }))).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { appendDeathReleaseParticles } from "../src/game/deathRelease";

describe("death release presentation", () => {
  it("releases restrained particles along the defeated centerline, never a radial blast", () => {
    const particles: Parameters<typeof appendDeathReleaseParticles>[0] = [];
    const player = {
      position: { x: 20, y: 10 },
      body: Array.from({ length: 30 }, (_, index) => ({
        x: 20 - (index + 1) * 6,
        y: 10,
      })),
    };

    appendDeathReleaseParticles(particles, player, ["#fff", "#0ff"], 4);

    expect(particles).toHaveLength(20);
    expect(particles.every((particle) => particle.y === 10)).toBe(true);
    expect(Math.max(...particles.map((particle) => Math.abs(particle.vy)))).toBeLessThanOrEqual(20);
    expect(Math.max(...particles.map((particle) => Math.abs(particle.vx)))).toBeLessThanOrEqual(3);
    expect(Math.max(...particles.map((particle) => particle.radius))).toBeLessThan(4);
    expect(Math.max(...particles.map((particle) => particle.maxLife))).toBeLessThan(0.7);
  });
});

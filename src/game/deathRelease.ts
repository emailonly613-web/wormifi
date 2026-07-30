import type { Vec2 } from "./types";

export interface DeathReleaseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

interface DeathReleaseShape {
  position: Vec2;
  body: readonly Vec2[];
}

/**
 * A restrained centerline release that preserves the defeated creature's
 * silhouette. It deliberately avoids a radial explosion: the authoritative
 * death drops already carry the reward and remain in exact worm shape.
 */
export function appendDeathReleaseParticles(
  particles: DeathReleaseParticle[],
  player: DeathReleaseShape,
  colors: readonly string[],
  seed: number,
  maximumParticles = 180,
): void {
  if (colors.length === 0) return;
  const points = [player.position, ...player.body];
  const count = Math.min(20, points.length);
  if (count === 0) return;

  for (let sample = 0; sample < count; sample += 1) {
    const index = count === 1
      ? 0
      : Math.round(sample * (points.length - 1) / (count - 1));
    const point = points[index];
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.max(1e-9, Math.hypot(tangentX, tangentY));
    const normalX = -tangentY / length;
    const normalY = tangentX / length;
    const side = (sample + seed) % 2 === 0 ? 1 : -1;
    const drift = 11 + (sample % 4) * 3;
    particles.push({
      x: point.x,
      y: point.y,
      vx: normalX * drift * side + tangentX / length * 3,
      vy: normalY * drift * side + tangentY / length * 3,
      life: 0.42 + (sample % 3) * 0.05,
      maxLife: 0.58,
      radius: 2.2 + (sample % 3) * 0.55,
      color: colors[(sample + seed) % colors.length],
    });
  }

  if (particles.length > maximumParticles) {
    particles.splice(0, particles.length - maximumParticles);
  }
}

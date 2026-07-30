import type { Vec2 } from "./types";

export interface RandomResult<T> {
  value: T;
  state: number;
}

const NON_ZERO_FALLBACK = 0x6d2b79f5;

/** FNV-1a gives strings and numeric seeds one stable 32-bit representation. */
export function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  const unsigned = hash >>> 0;
  return unsigned === 0 ? NON_ZERO_FALLBACK : unsigned;
}

/** Pure xorshift32 step. Keeping RNG state in GameState makes replays portable. */
export function nextRandomState(state: number): number {
  let nextState = state >>> 0;
  if (nextState === 0) nextState = NON_ZERO_FALLBACK;

  nextState ^= nextState << 13;
  nextState ^= nextState >>> 17;
  nextState ^= nextState << 5;
  nextState >>>= 0;

  return nextState;
}

/** Pure xorshift32 step. Keeping RNG state in GameState makes replays portable. */
export function nextRandom(state: number): RandomResult<number> {
  const nextState = nextRandomState(state);

  return {
    value: nextState / 0x1_0000_0000,
    state: nextState,
  };
}

export function randomBetween(
  state: number,
  minimum: number,
  maximum: number,
): RandomResult<number> {
  const next = nextRandom(state);
  return {
    value: minimum + (maximum - minimum) * next.value,
    state: next.state,
  };
}

export function randomUnitVector(state: number): RandomResult<Vec2> {
  const angle = randomBetween(state, 0, Math.PI * 2);
  return {
    value: { x: Math.cos(angle.value), y: Math.sin(angle.value) },
    state: angle.state,
  };
}

/** Uniform by area rather than clustering points around the circle center. */
export function randomPointInCircle(
  state: number,
  radius: number,
): RandomResult<Vec2> {
  const angle = randomBetween(state, 0, Math.PI * 2);
  const radialSample = nextRandom(angle.state);
  const distance = Math.sqrt(radialSample.value) * radius;

  return {
    value: {
      x: Math.cos(angle.value) * distance,
      y: Math.sin(angle.value) * distance,
    },
    state: radialSample.state,
  };
}

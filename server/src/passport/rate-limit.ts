interface RateLimitEntry {
  windowStartedAtMs: number;
  failures: number;
  blockedUntilMs: number;
}

export class PassportRateLimiter {
  readonly #entries = new Map<string, RateLimitEntry>();

  constructor(
    private readonly maximumFailures = 5,
    private readonly windowMs = 15 * 60_000,
    private readonly blockMs = 15 * 60_000,
  ) {}

  isAllowed(key: string, nowMs: number) {
    const entry = this.#entries.get(key);
    if (!entry) return true;
    if (entry.blockedUntilMs > nowMs) return false;
    if (nowMs - entry.windowStartedAtMs >= this.windowMs) {
      this.#entries.delete(key);
      return true;
    }
    return entry.failures < this.maximumFailures;
  }

  recordFailure(key: string, nowMs: number) {
    const current = this.#entries.get(key);
    const entry = !current || nowMs - current.windowStartedAtMs >= this.windowMs
      ? { windowStartedAtMs: nowMs, failures: 0, blockedUntilMs: 0 }
      : current;

    entry.failures += 1;
    if (entry.failures >= this.maximumFailures) entry.blockedUntilMs = nowMs + this.blockMs;
    this.#entries.set(key, entry);
  }

  clear(key: string) {
    this.#entries.delete(key);
  }
}

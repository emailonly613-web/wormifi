import { createGamePlatformAdapter } from "./crazyGames";

/** One process-wide adapter so SDK initialization and lifecycle calls cannot
 * be duplicated by separate React components. */
export const gamePlatform = createGamePlatformAdapter();
export const isCrazyGamesDistribution = gamePlatform.channel === "crazygames";

export function reportPlatformError(stage: string, error: unknown): void {
  document.documentElement.dataset.platformError = stage;
  // CrazyGames' preview console is part of the required QA workflow. Avoid
  // serializing user, room, or challenge data into this diagnostic.
  console.error(`[Wormifi platform] ${stage}`, error);
}

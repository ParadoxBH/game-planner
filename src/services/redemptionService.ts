const STORAGE_KEY_PREFIX = "game_planner_collected_codes_";

/**
 * Service to handle persistence of redemption codes.
 * Currently uses localStorage, but can be easily migrated to a database later.
 */
export const redemptionService = {
  /**
   * Retrieves the list of collected codes for a specific game.
   */
  getCollectedCodes(gameId: string): string[] {
    const key = `${STORAGE_KEY_PREFIX}${gameId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as string[];
    } catch (e) {
      console.error("Error parsing collected codes from localStorage", e);
      return [];
    }
  },

  /**
   * Marks a code as collected for a specific game.
   */
  saveCollectedCode(gameId: string, code: string): void {
    const key = `${STORAGE_KEY_PREFIX}${gameId}`;
    const current = this.getCollectedCodes(gameId);
    if (!current.includes(code)) {
      const updated = [...current, code];
      localStorage.setItem(key, JSON.stringify(updated));
    }
  },

  /**
   * Unmarks a code as collected (optional functionality).
   */
  removeCollectedCode(gameId: string, code: string): void {
    const key = `${STORAGE_KEY_PREFIX}${gameId}`;
    const current = this.getCollectedCodes(gameId);
    const updated = current.filter(c => c !== code);
    localStorage.setItem(key, JSON.stringify(updated));
  },

  /**
   * Checks if a code is already collected.
   */
  isCodeCollected(gameId: string, code: string): boolean {
    const current = this.getCollectedCodes(gameId);
    return current.includes(code);
  }
};

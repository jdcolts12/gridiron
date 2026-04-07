import type { Player } from "@/lib/types";

/**
 * Computes a simple contribution weight for match simulation from a player.
 * Uses speed, strength, passing, shooting, and stamina (see `public.players`).
 * @param player - Roster member
 * @returns Numeric weight (higher = stronger impact)
 */
export function playerSimWeight(player: Player): number {
  return (
    player.speed +
    player.strength +
    player.passing +
    player.shooting +
    player.stamina
  ) / 5;
}

/**
 * Filters eligible players for a match (e.g. stamina gate); extend when injuries exist.
 * @param players - Full roster slice
 * @returns Players that can take the field
 */
export function eligibleForMatch(players: Player[]): Player[] {
  return players.filter((p) => p.stamina > 0);
}

/**
 * Aggregates team strength from a lineup for the simulation engine.
 * @param lineup - Players assumed to participate
 * @returns Combined strength scalar
 */
export function aggregateLineupStrength(lineup: Player[]): number {
  return lineup.reduce((sum, p) => sum + playerSimWeight(p), 0);
}

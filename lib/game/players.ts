import type { Player } from "@/lib/types";

/**
 * Computes a simple contribution weight for match simulation from a player.
 * Uses speed, strength, passing, catching, and stamina.
 */
export function playerSimWeight(player: Player): number {
  return (
    player.speed +
    player.strength +
    player.passing +
    player.catching +
    player.stamina
  ) / 5;
}

/**
 * Filters eligible players for a match (e.g. stamina gate); extend when injuries exist.
 */
export function eligibleForMatch(players: Player[]): Player[] {
  return players.filter((p) => p.stamina > 0);
}

/**
 * Aggregates team strength from a lineup for the simulation engine.
 */
export function aggregateLineupStrength(lineup: Player[]): number {
  return lineup.reduce((sum, p) => sum + playerSimWeight(p), 0);
}

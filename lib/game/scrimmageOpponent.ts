import type { Player, Team } from "@/lib/types";
import type { TeamWithSquad } from "@/lib/game/simulate";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampStat(v: number): number {
  return Math.max(40, Math.min(99, v));
}

/**
 * CPU opponent for scrimmages: same roster shape as home, stats jittered so games feel competitive.
 */
export function buildScrimmageOpponent(home: TeamWithSquad): TeamWithSquad {
  const awayTeamId = randomId();
  const players: Player[] = home.players.map((p) => ({
    ...p,
    id: randomId(),
    team_id: awayTeamId,
    name: `${p.name} (scout)`,
    speed: clampStat(p.speed + rng(-2, 2)),
    strength: clampStat(p.strength + rng(-2, 2)),
    passing: clampStat(p.passing + rng(-2, 2)),
    catching: clampStat(p.catching + rng(-2, 2)),
    stamina: clampStat(p.stamina + rng(-2, 2)),
    created_at: p.created_at,
  }));

  const awayTeam: Team = {
    ...home,
    id: awayTeamId,
    user_id: home.user_id,
    name: "Scrimmage opponent",
    cash: home.cash,
    gems: home.gems,
    stadium_level: home.stadium_level,
    training_level: home.training_level,
    coaching_level: home.coaching_level,
    league_points: home.league_points,
    created_at: home.created_at,
  };

  return { ...awayTeam, players };
}

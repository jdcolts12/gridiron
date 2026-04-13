import type { SupabaseClient } from "@supabase/supabase-js";
import type { Player } from "@/lib/types";

export const STAT_MAX = 99;

/** Training bundle when a job completes: +2 SPD, +1 each elsewhere. */
export const TRAINING_DELTA = {
  speed: 2,
  strength: 1,
  passing: 1,
  catching: 1,
  stamina: 1,
} as const;

export function playerOverall(p: Player): number {
  const sum =
    p.speed + p.strength + p.passing + p.catching + p.stamina;
  return Math.round(sum / 5);
}

export function teamOverall(players: Player[]): number {
  if (players.length === 0) return 0;
  const t = players.reduce((acc, p) => acc + playerOverall(p), 0);
  return Math.round(t / players.length);
}

export function tierStars(tier: number): string {
  const n = Math.min(3, Math.max(1, tier));
  return "⭐".repeat(n) + (tier > 3 ? "✨" : "");
}

/** Cash cost for next training (tier scales price). */
export function playerTrainingCostCash(tier: number): number {
  const t = Math.min(3, Math.max(1, tier));
  return 120 + t * 45 + t * t * 25;
}

/** Wall-clock training duration (ms). */
export function playerTrainingDurationMs(tier: number): number {
  const t = Math.min(3, Math.max(1, tier));
  return 120_000 * t;
}

const STARTER_SLOTS: { position: string; count: number }[] = [
  { position: "QB", count: 1 },
  { position: "RB", count: 1 },
  { position: "WR", count: 2 },
  { position: "TE", count: 1 },
  { position: "OL", count: 2 },
  { position: "DL", count: 2 },
  { position: "LB", count: 2 },
  { position: "DB", count: 2 },
];

/**
 * 11-man style starters from a 15-player roster; rest are bench.
 */
export function computeDepthChart(players: Player[]): {
  starters: Player[];
  bench: Player[];
} {
  const pool = players.map((p) => ({ ...p }));
  const byPos = new Map<string, Player[]>();
  for (const p of pool) {
    const k = p.position.trim().toUpperCase();
    const list = byPos.get(k) ?? [];
    list.push(p);
    byPos.set(k, list);
  }
  for (const list of Array.from(byPos.values())) {
    list.sort((a, b) => playerOverall(b) - playerOverall(a));
  }

  const starters: Player[] = [];
  const used = new Set<string>();

  for (const { position, count } of STARTER_SLOTS) {
    const list = byPos.get(position) ?? [];
    let taken = 0;
    for (const p of list) {
      if (taken >= count) break;
      if (used.has(p.id)) continue;
      starters.push(p);
      used.add(p.id);
      taken++;
    }
  }

  const bench = players.filter((p) => !used.has(p.id));
  bench.sort(
    (a, b) =>
      a.position.localeCompare(b.position) || a.name.localeCompare(b.name)
  );

  return { starters, bench };
}

export type PlayerUpgradeJobRow = {
  id: string;
  player_id: string;
  team_id: string;
  cost_cash: number;
  completes_at: string;
  completed: boolean;
  created_at: string;
};

export async function applyDuePlayerUpgrades(
  supabase: SupabaseClient,
  teamId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("player_upgrade_jobs")
    .select("*")
    .eq("team_id", teamId)
    .eq("completed", false)
    .lte("completes_at", nowIso);

  if (error || !due?.length) return;

  for (const job of due) {
    const j = job as PlayerUpgradeJobRow;
    const { data: pl, error: pErr } = await supabase
      .from("players")
      .select("*")
      .eq("id", j.player_id)
      .eq("team_id", teamId)
      .maybeSingle<Player>();

    if (pErr || !pl) {
      await supabase
        .from("player_upgrade_jobs")
        .update({ completed: true })
        .eq("id", j.id);
      continue;
    }

    const next = {
      speed: Math.min(STAT_MAX, pl.speed + TRAINING_DELTA.speed),
      strength: Math.min(STAT_MAX, pl.strength + TRAINING_DELTA.strength),
      passing: Math.min(STAT_MAX, pl.passing + TRAINING_DELTA.passing),
      catching: Math.min(STAT_MAX, pl.catching + TRAINING_DELTA.catching),
      stamina: Math.min(STAT_MAX, pl.stamina + TRAINING_DELTA.stamina),
    };

    const { error: uErr } = await supabase.from("players").update(next).eq("id", pl.id);
    if (uErr) continue;

    await supabase
      .from("player_upgrade_jobs")
      .update({ completed: true })
      .eq("id", j.id);
  }
}

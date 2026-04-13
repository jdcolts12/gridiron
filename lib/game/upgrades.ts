import { STADIUM_MAX_LEVEL } from "@/lib/game/stadium";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/types";

export const FACILITY_TYPES = ["stadium", "training", "coaching"] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const MAX_FACILITY_LEVEL = 20;

export function isFacilityType(s: string): s is FacilityType {
  return (FACILITY_TYPES as readonly string[]).includes(s);
}

/** DB column on `teams` for this facility upgrade type. */
export function facilityLevelColumn(
  type: FacilityType
): keyof Pick<Team, "stadium_level" | "training_level" | "coaching_level"> {
  switch (type) {
    case "stadium":
      return "stadium_level";
    case "training":
      return "training_level";
    case "coaching":
      return "coaching_level";
  }
}

export function currentLevelForType(team: Team, type: FacilityType): number {
  return team[facilityLevelColumn(type)];
}

/** Cash cost to go from `fromLevel` → `fromLevel + 1`. */
export function upgradeCostCash(fromLevel: number): number {
  return Math.max(50, 80 * fromLevel * fromLevel);
}

/** Wall-clock duration before the level applies. */
export function upgradeDurationMs(fromLevel: number): number {
  return 45_000 + fromLevel * 30_000;
}

function capUpgradeTargetLevel(type: FacilityType, toLevel: number): number {
  if (type === "stadium") {
    return Math.min(toLevel, STADIUM_MAX_LEVEL);
  }
  return Math.min(toLevel, MAX_FACILITY_LEVEL);
}

/**
 * Apply any finished upgrades: bump facility level and mark rows complete.
 * Safe to call often (GET stadium, POST start, etc.).
 */
export async function applyDueUpgrades(
  supabase: SupabaseClient,
  teamId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("upgrades")
    .select("*")
    .eq("team_id", teamId)
    .eq("completed", false)
    .lte("completes_at", nowIso)
    .order("completes_at", { ascending: true });

  if (error || !due?.length) return;

  for (const u of due) {
    if (!isFacilityType(u.type)) continue;
    const col = facilityLevelColumn(u.type);
    const targetLevel = capUpgradeTargetLevel(u.type, u.to_level);
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ [col]: targetLevel })
      .eq("id", teamId);
    if (teamErr) continue;
    await supabase.from("upgrades").update({ completed: true }).eq("id", u.id);
  }
}

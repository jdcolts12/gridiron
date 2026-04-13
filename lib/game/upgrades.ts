import { facilityMultiplier } from "@/lib/game/facilityBonuses";
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

/** How many upcoming steps to show on the stadium roadmap UI. */
export const FACILITY_PREVIEW_STEPS = 6;

export type FacilityPreviewRow = {
  toLevel: number;
  cost: number;
  durationMs: number;
  /** Simulator power multiplier once this level is reached. */
  multiplier: number;
};

/** Next `stepCount` single-step upgrades from `currentLevel` (capped at max level). */
export function previewFacilityUpgrades(
  type: FacilityType,
  currentLevel: number,
  stepCount: number
): FacilityPreviewRow[] {
  const out: FacilityPreviewRow[] = [];
  for (let i = 1; i <= stepCount; i++) {
    const toLevel = currentLevel + i;
    if (toLevel > MAX_FACILITY_LEVEL) break;
    const fromLevel = toLevel - 1;
    out.push({
      toLevel,
      cost: upgradeCostCash(fromLevel),
      durationMs: upgradeDurationMs(fromLevel),
      multiplier: facilityMultiplier(type, toLevel),
    });
  }
  return out;
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
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ [col]: u.to_level })
      .eq("id", teamId);
    if (teamErr) continue;
    await supabase.from("upgrades").update({ completed: true }).eq("id", u.id);
  }
}

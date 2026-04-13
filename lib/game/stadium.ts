import {
  FACILITY_BONUS_RATE,
  facilityMultiplier,
} from "@/lib/game/facilityBonuses";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/types";

export const STADIUM_MIN_LEVEL = 1;
export const STADIUM_MAX_LEVEL = 10;

export function clampStadiumLevel(level: number): number {
  return Math.min(
    STADIUM_MAX_LEVEL,
    Math.max(STADIUM_MIN_LEVEL, Math.floor(level))
  );
}

/** Tooltip / copy for stadium HFA stat in UI. */
export const HOME_FIELD_ADVANTAGE_TOOLTIP =
  "Crowd noise makes it harder for opponents to perform.";

const STADIUM_TIER_NAMES: readonly string[] = [
  "High School Field",
  "Local Stadium",
  "Small College Stadium",
  "College Stadium",
  "Pro Stadium",
  "Major Stadium",
  "Packed Stadium",
  "Elite Stadium",
  "Legendary Stadium",
  "Dynasty Stadium",
];

export function stadiumTierName(level: number): string {
  const lv = clampStadiumLevel(level);
  return STADIUM_TIER_NAMES[lv - 1] ?? STADIUM_TIER_NAMES[0];
}

/**
 * Total home defensive rating boost from stadium (additive % vs baseline).
 * Matches sim: `1 + level * FACILITY_BONUS_RATE.stadium`.
 */
export function homeFieldAdvantagePercent(level: number): number {
  const lv = clampStadiumLevel(level);
  return Math.round(lv * FACILITY_BONUS_RATE.stadium * 100);
}

/** Flavor tier for crowd intensity (UI only for now). */
export function stadiumCrowdNoiseLabel(level: number): string {
  const lv = clampStadiumLevel(level);
  if (lv <= 1) return "Quiet Crowd";
  if (lv <= 2) return "Hometown Buzz";
  if (lv <= 3) return "Rising Chant";
  if (lv <= 4) return "Rowdy Stands";
  if (lv === 5) return "Loud Crowd";
  if (lv <= 6) return "Roaring Dome";
  if (lv <= 7) return "Deafening Noise";
  if (lv <= 8) return "Wall of Sound";
  if (lv === 9) return "Ear-splitting Roar";
  return "Legendary Crowd";
}

const MS_PER_DAY = 86_400_000;
/** Avoid unbounded catch-up if someone returns after a long break. */
const MAX_CATCH_UP_DAYS = 14;

/** Snapshot for UI and API (derived from stadium level). */
export type StadiumState = {
  level: number;
  tier_name: string;
  fan_capacity: number;
  daily_income_cash: number;
  /** Home-defense power multiplier in match sims (same formula as `facilityBonuses`). */
  performance_multiplier: number;
  /** Whole-number % for display, e.g. level 3 → +9%. */
  home_field_advantage_percent: number;
  crowd_noise_label: string;
};

/** Seating — scales roughly 8k–44k across levels 1–10. */
export function stadiumFanCapacity(level: number): number {
  const lv = clampStadiumLevel(level);
  return 8000 + (lv - 1) * 4000;
}

/** Passive cash credited once per full day since last collection (see sync). */
export function stadiumDailyIncomeCash(level: number): number {
  const lv = clampStadiumLevel(level);
  return 120 + (lv - 1) * 90;
}

export function stadiumPerformanceMultiplier(level: number): number {
  return facilityMultiplier("stadium", clampStadiumLevel(level));
}

export function buildStadiumState(level: number): StadiumState {
  const lv = clampStadiumLevel(level);
  return {
    level: lv,
    tier_name: stadiumTierName(lv),
    fan_capacity: stadiumFanCapacity(lv),
    daily_income_cash: stadiumDailyIncomeCash(lv),
    performance_multiplier: stadiumPerformanceMultiplier(lv),
    home_field_advantage_percent: homeFieldAdvantagePercent(lv),
    crowd_noise_label: stadiumCrowdNoiseLabel(lv),
  };
}

/** Cash to upgrade from `fromLevel` to `fromLevel + 1` (fromLevel in 1..9). */
export function stadiumUpgradeCostCash(fromLevel: number): number {
  const lv = clampStadiumLevel(fromLevel);
  if (lv >= STADIUM_MAX_LEVEL) return 0;
  return Math.max(100, Math.round(180 * Math.pow(1.6, lv - 1)));
}

export type StadiumUpgradePreviewRow = {
  to_level: number;
  tier_name: string;
  home_field_advantage_percent: number;
  crowd_noise_label: string;
  cost_cash: number;
  fan_capacity: number;
  daily_income_cash: number;
  performance_multiplier: number;
};

export function previewStadiumUpgrades(
  currentLevel: number,
  maxSteps: number
): StadiumUpgradePreviewRow[] {
  const start = clampStadiumLevel(currentLevel);
  const out: StadiumUpgradePreviewRow[] = [];
  for (let i = 1; i <= maxSteps; i++) {
    const to = start + i;
    if (to > STADIUM_MAX_LEVEL) break;
    const from = to - 1;
    out.push({
      to_level: to,
      tier_name: stadiumTierName(to),
      home_field_advantage_percent: homeFieldAdvantagePercent(to),
      crowd_noise_label: stadiumCrowdNoiseLabel(to),
      cost_cash: stadiumUpgradeCostCash(from),
      fan_capacity: stadiumFanCapacity(to),
      daily_income_cash: stadiumDailyIncomeCash(to),
      performance_multiplier: stadiumPerformanceMultiplier(to),
    });
  }
  return out;
}

function teamIncomeLastAt(team: Team): number {
  const ext = team as Team & {
    stadium_income_last_collected_at?: string;
  };
  const raw = ext.stadium_income_last_collected_at;
  if (raw) return new Date(raw).getTime();
  return new Date(team.created_at).getTime();
}

/**
 * Credits full days of stadium income since `stadium_income_last_collected_at`.
 * Call from stadium GET, dashboard load, etc.
 */
export async function syncStadiumIncome(
  supabase: SupabaseClient,
  team: Team
): Promise<{ cashAdded: number; team: Team }> {
  const level = clampStadiumLevel(team.stadium_level);
  const daily = stadiumDailyIncomeCash(level);
  const lastMs = teamIncomeLastAt(team);
  const now = Date.now();
  const fullDays = Math.floor((now - lastMs) / MS_PER_DAY);
  const daysToPay = Math.min(Math.max(0, fullDays), MAX_CATCH_UP_DAYS);
  const cashAdded = daysToPay * daily;

  if (cashAdded <= 0) {
    return { cashAdded: 0, team };
  }

  const newLastMs = lastMs + daysToPay * MS_PER_DAY;
  const newCash = team.cash + cashAdded;

  const { error } = await supabase
    .from("teams")
    .update({
      cash: newCash,
      stadium_income_last_collected_at: new Date(newLastMs).toISOString(),
    })
    .eq("id", team.id)
    .eq("cash", team.cash);

  if (error) {
    return { cashAdded: 0, team };
  }

  return {
    cashAdded,
    team: {
      ...team,
      cash: newCash,
      stadium_income_last_collected_at: new Date(newLastMs).toISOString(),
    } as Team,
  };
}

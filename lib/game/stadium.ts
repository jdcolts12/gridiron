import { facilityMultiplier } from "@/lib/game/facilityBonuses";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/types";

export const STADIUM_MIN_LEVEL = 1;
export const STADIUM_MAX_LEVEL = 10;

const MS_PER_DAY = 86_400_000;
/** Avoid unbounded catch-up if someone returns after a long break. */
const MAX_CATCH_UP_DAYS = 14;

/** Snapshot for UI and API (derived from level + timers elsewhere). */
export type StadiumState = {
  level: number;
  fan_capacity: number;
  daily_income_cash: number;
  /** Home-defense power multiplier in match sims (same formula as `facilityBonuses`). */
  performance_multiplier: number;
};

export function clampStadiumLevel(level: number): number {
  return Math.min(
    STADIUM_MAX_LEVEL,
    Math.max(STADIUM_MIN_LEVEL, Math.floor(level))
  );
}

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
    fan_capacity: stadiumFanCapacity(lv),
    daily_income_cash: stadiumDailyIncomeCash(lv),
    performance_multiplier: stadiumPerformanceMultiplier(lv),
  };
}

/** Cash to upgrade from `fromLevel` to `fromLevel + 1` (fromLevel in 1..9). */
export function stadiumUpgradeCostCash(fromLevel: number): number {
  const lv = clampStadiumLevel(fromLevel);
  if (lv >= STADIUM_MAX_LEVEL) return 0;
  return Math.max(100, Math.round(180 * Math.pow(1.6, lv - 1)));
}

/** Real-time build duration for the next tier. */
export function stadiumUpgradeDurationMs(fromLevel: number): number {
  const lv = clampStadiumLevel(fromLevel);
  if (lv >= STADIUM_MAX_LEVEL) return 0;
  return 90_000 + lv * 60_000;
}

export type StadiumUpgradePreviewRow = {
  to_level: number;
  cost_cash: number;
  duration_ms: number;
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
      cost_cash: stadiumUpgradeCostCash(from),
      duration_ms: stadiumUpgradeDurationMs(from),
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

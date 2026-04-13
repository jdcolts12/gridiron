import type { FacilityType } from "@/lib/game/upgrades";

/** Per-level multipliers (must match `computePowers` in `simulate.ts`). */
export const FACILITY_BONUS_RATE: Record<FacilityType, number> = {
  /** `defense *= 1 + stadium_level * rate` */
  stadium: 0.03,
  /** `trench *= 1 + training_level * rate` */
  training: 0.04,
  /** `attack *= 1 + coaching_level * rate` */
  coaching: 0.05,
};

export function facilityMultiplier(type: FacilityType, level: number): number {
  return 1 + level * FACILITY_BONUS_RATE[type];
}

export function facilityEffectTitle(type: FacilityType): string {
  switch (type) {
    case "stadium":
      return "Home defense";
    case "training":
      return "Trench / line";
    case "coaching":
      return "Offense";
  }
}

/** Human-readable sim hook, e.g. "Home defense power in match sims". */
export function facilityEffectDescription(type: FacilityType): string {
  switch (type) {
    case "stadium":
      return "Multiplies defensive front ratings when you are the home team.";
    case "training":
      return "Multiplies offensive line trench rating (field position / run setup).";
    case "coaching":
      return "Multiplies skill-position offensive contribution.";
  }
}

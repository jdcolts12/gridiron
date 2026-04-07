import type { Upgrade } from "@/lib/types";

/** Columns required to insert into `public.upgrades` (defaults cover the rest). */
export type UpgradeInsert = Pick<
  Upgrade,
  "team_id" | "type" | "from_level" | "to_level" | "cost_cash" | "completes_at"
>;

/** Static definition for one node in the upgrade tree. */
export type UpgradeDefinition = {
  key: string;
  tier: number;
  costCash: number;
  durationMs: number;
  /** Parent key for dependency chains; undefined for root upgrades. */
  requiresKey?: string;
  requiresTier?: number;
};

/**
 * Returns the full upgrade tree configuration (all tiers / keys).
 */
export function getUpgradeTree(): UpgradeDefinition[] {
  return [];
}

/**
 * Looks up the definition for a key at a target tier.
 */
export function getUpgradeDef(
  _key: string,
  _tier: number
): UpgradeDefinition | undefined {
  return undefined;
}

/**
 * Whether the team may start this upgrade given current state.
 */
export function canStartUpgrade(
  _teamId: string,
  _key: string,
  _nextTier: number
): boolean {
  return false;
}

/**
 * Builds payload for inserting into `public.upgrades`.
 * @param teamId - Owning team uuid
 * @param upgradeType - 'stadium' | 'training' | 'coaching'
 * @param fromLevel - Current facility level on the team
 * @param toLevel - Target level after upgrade
 * @param costCash - Cash charged when starting
 * @param completesAt - ISO timestamptz when the upgrade finishes
 */
export function buildUpgradeRecord(
  _teamId: string,
  _upgradeType: string,
  _fromLevel: number,
  _toLevel: number,
  _costCash: number,
  _completesAt: string
): UpgradeInsert | null {
  return null;
}

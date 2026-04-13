import {
  buildStadiumState,
  type StadiumState,
  syncStadiumIncome,
} from "@/lib/game/stadium";
import { applyDueUpgrades } from "@/lib/game/upgrades";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/types";

export type StadiumSession = {
  team: Team;
  stadium: StadiumState;
  incomeApplied: number;
};

/**
 * Finishes legacy timed upgrades, credits stadium ticket revenue.
 */
export async function getStadiumSession(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: false; status: number; message: string }
  | ({ ok: true } & StadiumSession)
> {
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<Team>();

  if (teamErr) {
    return { ok: false, status: 500, message: teamErr.message };
  }
  if (!team) {
    return { ok: false, status: 400, message: "No team" };
  }

  await applyDueUpgrades(supabase, team.id);

  const { data: afterDue, error: reloadErr } = await supabase
    .from("teams")
    .select("*")
    .eq("id", team.id)
    .maybeSingle<Team>();

  if (reloadErr || !afterDue) {
    return {
      ok: false,
      status: 500,
      message: reloadErr?.message ?? "Team not found",
    };
  }

  const { cashAdded, team: afterIncome } = await syncStadiumIncome(
    supabase,
    afterDue
  );

  let final = afterIncome;
  if (cashAdded > 0) {
    const { data: fresh } = await supabase
      .from("teams")
      .select("*")
      .eq("id", team.id)
      .maybeSingle<Team>();
    if (fresh) final = fresh;
  }

  return {
    ok: true,
    team: final,
    stadium: buildStadiumState(final.stadium_level),
    incomeApplied: cashAdded,
  };
}

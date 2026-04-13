import {
  applyDuePlayerUpgrades,
  teamOverall,
} from "@/lib/game/squadHelpers";
import { createClient } from "@/lib/supabase/server";
import type { Player, PlayerUpgradeJob, Team } from "@/lib/types";
import { redirect } from "next/navigation";
import SquadClient from "./SquadClient";

export default async function SquadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/squad");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Team>();

  if (!team) {
    redirect("/onboarding");
  }

  try {
    await applyDuePlayerUpgrades(supabase, team.id);
  } catch {
    /* migration 005 may not be applied locally */
  }

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", team.id)
    .returns<Player[]>();

  const roster = players ?? [];

  let jobs: PlayerUpgradeJob[] = [];
  const { data: jobRows, error: jobsErr } = await supabase
    .from("player_upgrade_jobs")
    .select("*")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!jobsErr && jobRows) {
    jobs = jobRows as PlayerUpgradeJob[];
  }

  const teamOvr = teamOverall(roster);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Squad</h1>
        <p className="text-sm text-zinc-400">
          Build your roster, train on timers, and climb team OVR.
        </p>
      </div>

      <SquadClient
        initialTeam={team}
        initialPlayers={roster}
        initialJobs={jobs}
        initialTeamOvr={teamOvr}
      />
    </div>
  );
}

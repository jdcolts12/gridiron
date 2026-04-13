import {
  applyDuePlayerUpgrades,
  teamOverall,
} from "@/lib/game/squadHelpers";
import { createClient } from "@/lib/supabase/server";
import type { Player, PlayerUpgradeJob, Team } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * GET /api/squad — finishes due training, returns roster + jobs for refresh/polling.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<Team>();

    if (teamErr) {
      return NextResponse.json({ ok: false, error: teamErr.message }, { status: 500 });
    }
    if (!team) {
      return NextResponse.json({ ok: false, error: "No team" }, { status: 400 });
    }

    try {
      await applyDuePlayerUpgrades(supabase, team.id);
    } catch {
      /* table may not exist until migration 005 */
    }

    const { data: players, error: pErr } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", team.id)
      .returns<Player[]>();

    if (pErr) {
      return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
    }

    let jobs: PlayerUpgradeJob[] = [];
    const { data: jobRows, error: jErr } = await supabase
      .from("player_upgrade_jobs")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!jErr && jobRows) {
      jobs = jobRows as PlayerUpgradeJob[];
    }

    const roster = players ?? [];
    const ovr = teamOverall(roster);

    return NextResponse.json({
      ok: true,
      team,
      players: roster,
      jobs,
      team_ovr: ovr,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

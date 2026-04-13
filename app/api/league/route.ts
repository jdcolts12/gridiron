import {
  aggregateStandings,
  fetchLeagueStandings,
  type MatchMinimal,
  type StandingRow,
} from "@/lib/game/league";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * GET /api/league — standings by win % (needs `SUPABASE_SERVICE_ROLE_KEY` for full table).
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

    const { data: myTeam, error: teamErr } = await supabase
      .from("teams")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teamErr) {
      return NextResponse.json({ ok: false, error: teamErr.message }, { status: 500 });
    }
    if (!myTeam) {
      return NextResponse.json({ ok: false, error: "No team" }, { status: 400 });
    }

    let standings: StandingRow[] = [];
    let standingsWarning: string | null = null;
    let fullTable = false;

    try {
      const admin = createServiceClient();
      const result = await fetchLeagueStandings(admin);
      if (result.error) {
        standingsWarning = result.error;
        const { data: myMatches } = await supabase
          .from("matches")
          .select("home_team_id, away_team_id, winner_id")
          .or(`home_team_id.eq.${myTeam.id},away_team_id.eq.${myTeam.id}`);
        standings = aggregateStandings(
          [myTeam],
          (myMatches ?? []) as MatchMinimal[]
        );
        fullTable = false;
      } else {
        standings = result.rows;
        fullTable = result.rows.length > 0;
      }
    } catch {
      standingsWarning =
        "Set SUPABASE_SERVICE_ROLE_KEY on the server to load the full league table.";
      const { data: myMatches } = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, winner_id")
        .or(`home_team_id.eq.${myTeam.id},away_team_id.eq.${myTeam.id}`);
      standings = aggregateStandings(
        [myTeam],
        (myMatches ?? []) as MatchMinimal[]
      );
      fullTable = false;
    }

    const rank =
      standings.findIndex((r) => r.id === myTeam.id) >= 0
        ? standings.findIndex((r) => r.id === myTeam.id) + 1
        : null;

    return NextResponse.json({
      ok: true,
      myTeamId: myTeam.id,
      myRank: rank,
      standings,
      fullTable,
      warning: standingsWarning,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

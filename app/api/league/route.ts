import { fetchLeagueStandings } from "@/lib/game/league";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * GET /api/league — standings (needs `SUPABASE_SERVICE_ROLE_KEY` to see all teams).
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
      .select("id, name, league_points")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teamErr) {
      return NextResponse.json({ ok: false, error: teamErr.message }, { status: 500 });
    }
    if (!myTeam) {
      return NextResponse.json({ ok: false, error: "No team" }, { status: 400 });
    }

    let standings: Awaited<ReturnType<typeof fetchLeagueStandings>>["rows"] = [];
    let standingsWarning: string | null = null;
    let fullTable = false;

    try {
      const admin = createServiceClient();
      const result = await fetchLeagueStandings(admin);
      if (result.error) {
        standings = [
          {
            id: myTeam.id,
            name: myTeam.name,
            league_points: myTeam.league_points,
          },
        ];
        standingsWarning = result.error;
        fullTable = false;
      } else {
        standings = result.rows;
        fullTable = result.rows.length > 0;
      }
    } catch {
      standings = [
        {
          id: myTeam.id,
          name: myTeam.name,
          league_points: myTeam.league_points,
        },
      ];
      standingsWarning =
        "Set SUPABASE_SERVICE_ROLE_KEY on the server to load the full league table.";
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

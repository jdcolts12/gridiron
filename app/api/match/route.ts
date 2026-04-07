import { simulateMatch } from "@/lib/game/simulate";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * POST /api/match
 * Body: `{ opponentTeamId: string }`
 *
 * Authenticated user's team is **home**; opponent is **away**.
 * Loads squads (service role for opponent rows — set `SUPABASE_SERVICE_ROLE_KEY`),
 * runs {@link simulateMatch}, inserts into `public.matches`, returns the saved row.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const opponentTeamId =
      typeof body === "object" &&
      body !== null &&
      "opponentTeamId" in body &&
      typeof (body as { opponentTeamId: unknown }).opponentTeamId === "string"
        ? (body as { opponentTeamId: string }).opponentTeamId
        : null;

    if (!opponentTeamId) {
      return NextResponse.json(
        { ok: false, error: "opponentTeamId (string) is required" },
        { status: 400 }
      );
    }

    const { data: myTeam, error: myTeamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (myTeamErr) {
      return NextResponse.json(
        { ok: false, error: myTeamErr.message },
        { status: 500 }
      );
    }

    if (!myTeam) {
      return NextResponse.json(
        { ok: false, error: "No team found for this user" },
        { status: 400 }
      );
    }

    if (myTeam.id === opponentTeamId) {
      return NextResponse.json(
        { ok: false, error: "Cannot schedule a match against your own team" },
        { status: 400 }
      );
    }

    let admin;
    try {
      admin = createServiceClient();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server misconfigured: set SUPABASE_SERVICE_ROLE_KEY to load opponent team and players (RLS blocks cross-team reads with the anon key).",
        },
        { status: 503 }
      );
    }

    const { data: oppTeam, error: oppTeamErr } = await admin
      .from("teams")
      .select("*")
      .eq("id", opponentTeamId)
      .maybeSingle();

    if (oppTeamErr) {
      return NextResponse.json(
        { ok: false, error: oppTeamErr.message },
        { status: 500 }
      );
    }

    if (!oppTeam) {
      return NextResponse.json(
        { ok: false, error: "Opponent team not found" },
        { status: 404 }
      );
    }

    const [{ data: homePlayers, error: homePlayersErr }, { data: awayPlayers, error: awayPlayersErr }] =
      await Promise.all([
        supabase.from("players").select("*").eq("team_id", myTeam.id),
        admin.from("players").select("*").eq("team_id", opponentTeamId),
      ]);

    if (homePlayersErr || awayPlayersErr) {
      return NextResponse.json(
        {
          ok: false,
          error:
            homePlayersErr?.message ??
            awayPlayersErr?.message ??
            "Failed to load squads",
        },
        { status: 500 }
      );
    }

    const result = simulateMatch(
      { ...myTeam, players: homePlayers ?? [] },
      { ...oppTeam, players: awayPlayers ?? [] }
    );

    const { data: matchRow, error: insertErr } = await supabase
      .from("matches")
      .insert({
        home_team_id: myTeam.id,
        away_team_id: opponentTeamId,
        home_score: result.homeScore,
        away_score: result.awayScore,
        winner_id: result.winnerId,
        match_log: result.matchLog,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { ok: false, error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, match: matchRow });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

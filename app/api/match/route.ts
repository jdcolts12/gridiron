import { buildScrimmageOpponent } from "@/lib/game/scrimmageOpponent";
import { simulateMatch } from "@/lib/game/simulate";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * GET /api/match — recent matches involving the signed-in user’s team.
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
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teamErr) {
      return NextResponse.json({ ok: false, error: teamErr.message }, { status: 500 });
    }
    if (!myTeam) {
      return NextResponse.json({ ok: false, error: "No team" }, { status: 400 });
    }

    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .or(
        `home_team_id.eq.${myTeam.id},away_team_id.eq.${myTeam.id}`
      )
      .order("played_at", { ascending: false })
      .limit(15);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const list = matches ?? [];
    let opponentNames: Record<string, string> = {};

    const otherIds = Array.from(
      new Set(
        list.flatMap((m) =>
          m.home_team_id === myTeam.id
            ? [m.away_team_id]
            : [m.home_team_id]
        )
      )
    );

    if (otherIds.length > 0) {
      try {
        const admin = createServiceClient();
        const { data: nameRows } = await admin
          .from("teams")
          .select("id, name")
          .in("id", otherIds);
        opponentNames = Object.fromEntries(
          (nameRows ?? []).map((t) => [t.id, t.name])
        );
      } catch {
        /* no service key — omit names */
      }
    }

    const enriched = list.map((m) => {
      const kind = (m as { match_kind?: string }).match_kind;
      const oppId =
        m.home_team_id === myTeam.id ? m.away_team_id : m.home_team_id;
      return {
        ...m,
        opponent_name:
          kind === "scrimmage"
            ? "Scrimmage (CPU)"
            : (opponentNames[oppId] ?? null),
      };
    });

    return NextResponse.json({
      ok: true,
      teamId: myTeam.id,
      matches: enriched,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/match
 * Body: `{ opponentTeamId: string }` **or** `{ scrimmage: true }`
 *
 * League: home vs away (needs `SUPABASE_SERVICE_ROLE_KEY` to load the opponent).
 * Scrimmage: CPU opponent from your roster stats — no service role; requires DB migration `006_match_scrimmage_kind`.
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

    const scrimmage =
      typeof body === "object" &&
      body !== null &&
      "scrimmage" in body &&
      (body as { scrimmage?: unknown }).scrimmage === true;

    const opponentTeamId =
      typeof body === "object" &&
      body !== null &&
      "opponentTeamId" in body &&
      typeof (body as { opponentTeamId: unknown }).opponentTeamId === "string"
        ? (body as { opponentTeamId: string }).opponentTeamId.trim()
        : null;

    if (scrimmage && opponentTeamId) {
      return NextResponse.json(
        { ok: false, error: "Send either scrimmage: true or opponentTeamId, not both" },
        { status: 400 }
      );
    }
    if (!scrimmage && !opponentTeamId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Send opponentTeamId (string) for a league game, or { \"scrimmage\": true } vs CPU",
        },
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

    if (!scrimmage && myTeam.id === opponentTeamId) {
      return NextResponse.json(
        { ok: false, error: "Cannot schedule a match against your own team" },
        { status: 400 }
      );
    }

    if (scrimmage) {
      const { data: homePlayers, error: homePlayersErr } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", myTeam.id);

      if (homePlayersErr) {
        return NextResponse.json(
          { ok: false, error: homePlayersErr.message },
          { status: 500 }
        );
      }

      const homeWithSquad = { ...myTeam, players: homePlayers ?? [] };
      const awayWithSquad = buildScrimmageOpponent(homeWithSquad);
      const result = simulateMatch(homeWithSquad, awayWithSquad);

      let winnerId: string | null = null;
      if (result.winnerId === myTeam.id) winnerId = myTeam.id;

      const { data: matchRow, error: insertErr } = await supabase
        .from("matches")
        .insert({
          home_team_id: myTeam.id,
          away_team_id: myTeam.id,
          home_score: result.homeScore,
          away_score: result.awayScore,
          winner_id: winnerId,
          match_log: result.matchLog,
          match_kind: "scrimmage",
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json(
          {
            ok: false,
            error:
              insertErr.message +
              (insertErr.message.includes("match_kind")
                ? " — run Supabase migration 006_match_scrimmage_kind.sql"
                : ""),
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, match: matchRow });
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

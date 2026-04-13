import { formatDollars } from "@/lib/format/money";
import {
  buildStadiumState,
  clampStadiumLevel,
  stadiumUpgradeCostCash,
  STADIUM_MAX_LEVEL,
} from "@/lib/game/stadium";
import { getStadiumSession } from "@/lib/game/stadiumSession";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * GET /api/stadium — legacy upgrade cleanup, ticket revenue, current stadium state.
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

    const session = await getStadiumSession(supabase, user.id);
    if (!session.ok) {
      return NextResponse.json(
        { ok: false, error: session.message },
        { status: session.status }
      );
    }

    return NextResponse.json({
      ok: true,
      team: session.team,
      stadium: session.stadium,
      income_applied: session.incomeApplied,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/stadium — buy next stadium level instantly (pay cash, no timer).
 */
export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await getStadiumSession(supabase, user.id);
    if (!session.ok) {
      return NextResponse.json(
        { ok: false, error: session.message },
        { status: session.status }
      );
    }

    const { team } = session;
    const level = clampStadiumLevel(team.stadium_level);

    if (level >= STADIUM_MAX_LEVEL) {
      return NextResponse.json(
        { ok: false, error: `Stadium is max level (${STADIUM_MAX_LEVEL})` },
        { status: 400 }
      );
    }

    const cost = stadiumUpgradeCostCash(level);
    if (team.cash < cost) {
      return NextResponse.json(
        {
          ok: false,
          error: `Need ${formatDollars(cost)} (you have ${formatDollars(team.cash)})`,
        },
        { status: 400 }
      );
    }

    const preCash = team.cash;
    const newCash = preCash - cost;
    const newLevel = level + 1;

    const { data: updated, error: upErr } = await supabase
      .from("teams")
      .update({
        stadium_level: newLevel,
        cash: newCash,
      })
      .eq("id", team.id)
      .eq("stadium_level", level)
      .eq("cash", preCash)
      .select()
      .maybeSingle<Team>();

    if (upErr || !updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not complete expansion; refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      team: updated,
      stadium: buildStadiumState(updated.stadium_level),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

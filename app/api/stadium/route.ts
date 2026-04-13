import {
  buildStadiumState,
  clampStadiumLevel,
  stadiumUpgradeCostCash,
  stadiumUpgradeDurationMs,
  STADIUM_MAX_LEVEL,
} from "@/lib/game/stadium";
import { getStadiumSession } from "@/lib/game/stadiumSession";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * GET /api/stadium — completes due upgrades, credits stadium income, returns stadium state + timer.
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
      activeUpgrade: session.activeUpgrade,
      income_applied: session.incomeApplied,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/stadium — start next stadium upgrade (cost + timer).
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

    let { team } = session;
    const level = clampStadiumLevel(team.stadium_level);

    if (level >= STADIUM_MAX_LEVEL) {
      return NextResponse.json(
        { ok: false, error: `Stadium is max level (${STADIUM_MAX_LEVEL})` },
        { status: 400 }
      );
    }

    if (session.activeUpgrade) {
      return NextResponse.json(
        { ok: false, error: "A stadium upgrade is already in progress" },
        { status: 409 }
      );
    }

    const cost = stadiumUpgradeCostCash(level);
    if (team.cash < cost) {
      return NextResponse.json(
        { ok: false, error: `Need ${cost} cash (have ${team.cash})` },
        { status: 400 }
      );
    }

    const preCash = team.cash;
    const newCash = preCash - cost;

    const { data: cashRow, error: cashErr } = await supabase
      .from("teams")
      .update({ cash: newCash })
      .eq("id", team.id)
      .eq("cash", preCash)
      .select("id")
      .maybeSingle();

    if (cashErr || !cashRow) {
      return NextResponse.json(
        { ok: false, error: "Could not reserve cash; refresh and try again." },
        { status: 409 }
      );
    }

    const completesAt = new Date(
      Date.now() + stadiumUpgradeDurationMs(level)
    ).toISOString();

    const { data: upgradeRow, error: insErr } = await supabase
      .from("upgrades")
      .insert({
        team_id: team.id,
        type: "stadium",
        from_level: level,
        to_level: level + 1,
        cost_cash: cost,
        completes_at: completesAt,
      })
      .select()
      .single();

    if (insErr || !upgradeRow) {
      await supabase.from("teams").update({ cash: preCash }).eq("id", team.id);
      return NextResponse.json(
        { ok: false, error: insErr?.message ?? "Failed to start upgrade" },
        { status: 500 }
      );
    }

    const { data: finalTeam } = await supabase
      .from("teams")
      .select("*")
      .eq("id", team.id)
      .maybeSingle<Team>();

    const t = finalTeam ?? { ...team, cash: newCash };

    return NextResponse.json({
      ok: true,
      upgrade: upgradeRow,
      team: t,
      stadium: buildStadiumState(t.stadium_level),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

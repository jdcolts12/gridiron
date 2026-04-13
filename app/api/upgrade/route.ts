import {
  applyDueUpgrades,
  currentLevelForType,
  isFacilityType,
  MAX_FACILITY_LEVEL,
  upgradeCostCash,
  upgradeDurationMs,
} from "@/lib/game/upgrades";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/upgrade — team snapshot + in-progress upgrades (applies due completions first).
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
      .maybeSingle();

    if (teamErr) {
      return NextResponse.json({ ok: false, error: teamErr.message }, { status: 500 });
    }
    if (!team) {
      return NextResponse.json({ ok: false, error: "No team" }, { status: 400 });
    }

    await applyDueUpgrades(supabase, team.id);

    const { data: fresh, error: freshErr } = await supabase
      .from("teams")
      .select("*")
      .eq("id", team.id)
      .maybeSingle();

    if (freshErr || !fresh) {
      return NextResponse.json(
        { ok: false, error: freshErr?.message ?? "Team not found" },
        { status: 500 }
      );
    }

    const { data: active, error: upErr } = await supabase
      .from("upgrades")
      .select("*")
      .eq("team_id", fresh.id)
      .eq("completed", false)
      .order("completes_at", { ascending: true });

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      team: fresh,
      activeUpgrades: active ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/upgrade — body `{ type: "stadium" | "training" | "coaching" }`
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const typeRaw =
      typeof body === "object" &&
      body !== null &&
      "type" in body &&
      typeof (body as { type: unknown }).type === "string"
        ? (body as { type: string }).type
        : null;

    if (!typeRaw || !isFacilityType(typeRaw)) {
      return NextResponse.json(
        { ok: false, error: 'type must be "stadium", "training", or "coaching"' },
        { status: 400 }
      );
    }
    const type = typeRaw;

    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teamErr) {
      return NextResponse.json({ ok: false, error: teamErr.message }, { status: 500 });
    }
    if (!team) {
      return NextResponse.json({ ok: false, error: "No team" }, { status: 400 });
    }

    await applyDueUpgrades(supabase, team.id);

    const { data: teamAfterDue, error: reloadErr } = await supabase
      .from("teams")
      .select("*")
      .eq("id", team.id)
      .maybeSingle();

    if (reloadErr || !teamAfterDue) {
      return NextResponse.json(
        { ok: false, error: reloadErr?.message ?? "Team not found" },
        { status: 500 }
      );
    }

    const current = currentLevelForType(teamAfterDue, type);
    if (current >= MAX_FACILITY_LEVEL) {
      return NextResponse.json(
        { ok: false, error: `Already at max level (${MAX_FACILITY_LEVEL})` },
        { status: 400 }
      );
    }

    const { data: inProgress } = await supabase
      .from("upgrades")
      .select("id")
      .eq("team_id", teamAfterDue.id)
      .eq("type", type)
      .eq("completed", false)
      .maybeSingle();

    if (inProgress) {
      return NextResponse.json(
        { ok: false, error: "An upgrade is already in progress for this facility" },
        { status: 409 }
      );
    }

    const cost = upgradeCostCash(current);
    if (teamAfterDue.cash < cost) {
      return NextResponse.json(
        { ok: false, error: `Need ${cost} cash (have ${teamAfterDue.cash})` },
        { status: 400 }
      );
    }

    const newCash = teamAfterDue.cash - cost;
    const { data: cashRow, error: cashErr } = await supabase
      .from("teams")
      .update({ cash: newCash })
      .eq("id", teamAfterDue.id)
      .eq("cash", teamAfterDue.cash)
      .select("id")
      .maybeSingle();

    if (cashErr || !cashRow) {
      return NextResponse.json(
        { ok: false, error: "Could not reserve cash; refresh and try again." },
        { status: 409 }
      );
    }

    const completesAt = new Date(
      Date.now() + upgradeDurationMs(current)
    ).toISOString();

    const { data: upgradeRow, error: insErr } = await supabase
      .from("upgrades")
      .insert({
        team_id: teamAfterDue.id,
        type,
        from_level: current,
        to_level: current + 1,
        cost_cash: cost,
        completes_at: completesAt,
      })
      .select()
      .single();

    if (insErr || !upgradeRow) {
      await supabase
        .from("teams")
        .update({ cash: teamAfterDue.cash })
        .eq("id", teamAfterDue.id);
      return NextResponse.json(
        { ok: false, error: insErr?.message ?? "Failed to start upgrade" },
        { status: 500 }
      );
    }

    const { data: finalTeam } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamAfterDue.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      upgrade: upgradeRow,
      team: finalTeam ?? { ...teamAfterDue, cash: newCash },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

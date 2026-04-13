import { formatDollars } from "@/lib/format/money";
import {
  applyDuePlayerUpgrades,
  playerTrainingCostCash,
  playerTrainingDurationMs,
} from "@/lib/game/squadHelpers";
import { createClient } from "@/lib/supabase/server";
import type { Player, Team } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * POST /api/squad/upgrade — body `{ playerId: string }` — pay cash, start timed training.
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
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const playerId =
      typeof body === "object" &&
      body !== null &&
      "playerId" in body &&
      typeof (body as { playerId: unknown }).playerId === "string"
        ? (body as { playerId: string }).playerId.trim()
        : "";

    if (!playerId) {
      return NextResponse.json(
        { ok: false, error: "playerId (string) is required" },
        { status: 400 }
      );
    }

    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<Team>();

    if (teamErr || !team) {
      return NextResponse.json(
        { ok: false, error: teamErr?.message ?? "No team" },
        { status: teamErr ? 500 : 400 }
      );
    }

    await applyDuePlayerUpgrades(supabase, team.id);

    const { data: player, error: plErr } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .eq("team_id", team.id)
      .maybeSingle<Player>();

    if (plErr || !player) {
      return NextResponse.json(
        { ok: false, error: "Player not found" },
        { status: 404 }
      );
    }

    const { data: active } = await supabase
      .from("player_upgrade_jobs")
      .select("id")
      .eq("player_id", playerId)
      .eq("completed", false)
      .maybeSingle();

    if (active) {
      return NextResponse.json(
        { ok: false, error: "Training already in progress for this player" },
        { status: 409 }
      );
    }

    const cost = playerTrainingCostCash(player.tier);
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
    const completesAt = new Date(
      Date.now() + playerTrainingDurationMs(player.tier)
    ).toISOString();

    const { data: cashOk, error: cashErr } = await supabase
      .from("teams")
      .update({ cash: newCash })
      .eq("id", team.id)
      .eq("cash", preCash)
      .select("id")
      .maybeSingle();

    if (cashErr || !cashOk) {
      return NextResponse.json(
        { ok: false, error: "Could not reserve funds; refresh and try again." },
        { status: 409 }
      );
    }

    const { data: job, error: insErr } = await supabase
      .from("player_upgrade_jobs")
      .insert({
        player_id: playerId,
        team_id: team.id,
        cost_cash: cost,
        completes_at: completesAt,
      })
      .select()
      .single();

    if (insErr || !job) {
      await supabase.from("teams").update({ cash: preCash }).eq("id", team.id);
      return NextResponse.json(
        { ok: false, error: insErr?.message ?? "Could not start training" },
        { status: 500 }
      );
    }

    const { data: freshTeam } = await supabase
      .from("teams")
      .select("*")
      .eq("id", team.id)
      .maybeSingle<Team>();

    return NextResponse.json({
      ok: true,
      job,
      team: freshTeam ?? { ...team, cash: newCash },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { buildStarterPlayers } from "@/lib/game/seedRoster";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/team — current user's team (or 404).
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: team, error } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ ok: false, error: "No team" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, team });
}

/**
 * POST /api/team — create first team + starter squad (idempotent: returns existing team).
 * Body: `{ name: string }`
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, team: existing, created: false });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 48) {
    return NextResponse.json(
      { ok: false, error: "Team name must be 2–48 characters" },
      { status: 400 }
    );
  }

  const { data: team, error: insertErr } = await supabase
    .from("teams")
    .insert({ user_id: user.id, name })
    .select()
    .single();

  if (insertErr || !team) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  const players = buildStarterPlayers(team.id);
  const { error: playersErr } = await supabase.from("players").insert(players);

  if (playersErr) {
    await supabase.from("teams").delete().eq("id", team.id);
    return NextResponse.json(
      { ok: false, error: playersErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, team, created: true });
}

/**
 * PATCH /api/team — rename team.
 * Body: `{ name: string }`
 */
export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 48) {
    return NextResponse.json(
      { ok: false, error: "Team name must be 2–48 characters" },
      { status: 400 }
    );
  }

  const { data: team, error } = await supabase
    .from("teams")
    .update({ name })
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ ok: false, error: "No team" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, team });
}

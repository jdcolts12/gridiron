import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * GET /api/opponents
 * Returns other teams’ id + name for matchmaking (requires service role).
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

    let admin;
    try {
      admin = createServiceClient();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Set SUPABASE_SERVICE_ROLE_KEY to list opponents (RLS hides other teams).",
        },
        { status: 503 }
      );
    }

    const { data: teams, error } = await admin
      .from("teams")
      .select("id, name")
      .neq("id", myTeam.id)
      .order("name");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, teams: teams ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

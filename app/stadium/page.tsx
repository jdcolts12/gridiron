import { applyDueUpgrades } from "@/lib/game/upgrades";
import { createClient } from "@/lib/supabase/server";
import type { Team, Upgrade } from "@/lib/types";
import { redirect } from "next/navigation";
import { StadiumClient } from "./StadiumClient";

export default async function StadiumPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/stadium");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Team>();

  if (!team) {
    redirect("/onboarding");
  }

  await applyDueUpgrades(supabase, team.id);

  const { data: fresh } = await supabase
    .from("teams")
    .select("*")
    .eq("id", team.id)
    .maybeSingle<Team>();

  const t = fresh ?? team;

  const { data: active } = await supabase
    .from("upgrades")
    .select("*")
    .eq("team_id", t.id)
    .eq("completed", false)
    .order("completes_at", { ascending: true })
    .returns<Upgrade[]>();

  return <StadiumClient initialTeam={t} initialActive={active ?? []} />;
}

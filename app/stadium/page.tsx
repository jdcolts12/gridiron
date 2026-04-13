import { getStadiumSession } from "@/lib/game/stadiumSession";
import { createClient } from "@/lib/supabase/server";
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

  const session = await getStadiumSession(supabase, user.id);
  if (!session.ok) {
    if (session.status === 400) {
      redirect("/onboarding");
    }
    throw new Error(session.message);
  }

  return (
    <StadiumClient
      initialTeam={session.team}
      initialStadium={session.stadium}
      initialUpgrade={session.activeUpgrade}
      initialIncomeApplied={session.incomeApplied}
    />
  );
}

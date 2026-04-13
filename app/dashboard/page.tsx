import { summarizeTeamRecord } from "@/lib/game/league";
import { createClient } from "@/lib/supabase/server";
import type { Match, Team } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

function lastMatchSummary(teamId: string, rows: Match[]): string | null {
  const m = rows[0];
  if (!m) return null;
  const isHome = m.home_team_id === teamId;
  const forUs = isHome ? m.home_score : m.away_score;
  const against = isHome ? m.away_score : m.home_score;
  let tag: string;
  if (m.winner_id === null) tag = "Draw";
  else if (m.winner_id === teamId) tag = "Win";
  else tag = "Loss";
  return `${tag} ${forUs}–${against}`;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Team>();

  if (!team) {
    redirect("/onboarding");
  }

  const { data: recent } = await supabase
    .from("matches")
    .select("*")
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .order("played_at", { ascending: false })
    .limit(5)
    .returns<Match[]>();

  const recentList = recent ?? [];
  const last = lastMatchSummary(team.id, recentList);

  const { data: recordMatches } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id, winner_id")
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);

  const rec = summarizeTeamRecord(team.id, recordMatches ?? []);
  const recordLabel =
    rec.games === 0
      ? "No games yet"
      : `${rec.wins}–${rec.losses}–${rec.draws} (${(rec.win_pct * 100).toFixed(1)}%)`;

  const cards = [
    { label: "Cash", value: team.cash.toLocaleString() },
    { label: "Gems", value: team.gems.toLocaleString() },
    { label: "Record", value: recordLabel },
    { label: "Stadium", value: `Lv ${team.stadium_level}` },
    { label: "Training", value: `Lv ${team.training_level}` },
    { label: "Coaching", value: `Lv ${team.coaching_level}` },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Hub</h1>
        <p className="text-zinc-400">{team.name}</p>
        {last && (
          <p className="text-sm text-zinc-500">
            Last match: <span className="text-zinc-300">{last}</span>
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {c.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/match"
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
        >
          Play match
        </Link>
        <Link
          href="/squad"
          className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 transition hover:border-zinc-500 hover:text-white"
        >
          Squad
        </Link>
        <Link
          href="/stadium"
          className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 transition hover:border-zinc-500 hover:text-white"
        >
          Stadium
        </Link>
        <Link
          href="/league"
          className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 transition hover:border-zinc-500 hover:text-white"
        >
          League
        </Link>
      </div>
    </div>
  );
}

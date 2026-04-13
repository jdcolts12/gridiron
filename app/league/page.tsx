import {
  aggregateStandings,
  fetchLeagueStandings,
  formatRecordWLT,
  type MatchMinimal,
  type StandingRow,
} from "@/lib/game/league";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Team } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

async function standingsForTeamOnly(
  supabase: ReturnType<typeof createClient>,
  myTeam: Pick<Team, "id" | "name">
): Promise<StandingRow[]> {
  const { data: myMatches } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id, winner_id")
    .or(`home_team_id.eq.${myTeam.id},away_team_id.eq.${myTeam.id}`);
  return aggregateStandings([myTeam], (myMatches ?? []) as MatchMinimal[]);
}

export default async function LeaguePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/league");
  }

  const { data: myTeam } = await supabase
    .from("teams")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle<Pick<Team, "id" | "name">>();

  if (!myTeam) {
    redirect("/onboarding");
  }

  let rows: StandingRow[] = [];
  let warning: string | null = null;

  try {
    const admin = createServiceClient();
    const result = await fetchLeagueStandings(admin);
    if (result.error) {
      warning = result.error;
      rows = await standingsForTeamOnly(supabase, myTeam);
    } else {
      rows = result.rows;
    }
  } catch {
    warning =
      "Set SUPABASE_SERVICE_ROLE_KEY on the server to load the full league table.";
    rows = await standingsForTeamOnly(supabase, myTeam);
  }

  const myIndex = rows.findIndex((r) => r.id === myTeam.id);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">League</h1>
        <p className="text-sm text-zinc-400">
          Standings by win percentage (wins ÷ games). Draws count as games
          played but do not award points. Tiebreakers: wins, then team name.{" "}
          {myRank !== null && (
            <>
              You are{" "}
              <span className="text-zinc-200">#{myRank}</span>.
            </>
          )}
        </p>
      </div>

      {warning && (
        <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200/90">
          {warning}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/60 text-zinc-300">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Team</th>
              <th className="px-4 py-2 font-medium text-right">Win %</th>
              <th className="px-4 py-2 font-medium text-right">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r, i) => {
              const isMine = r.id === myTeam.id;
              return (
                <tr
                  key={r.id}
                  className={
                    isMine
                      ? "bg-emerald-950/25 text-zinc-100"
                      : "text-zinc-300"
                  }
                >
                  <td className="px-4 py-2 font-mono text-zinc-500">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2">
                    {r.name}
                    {isMine && (
                      <span className="ml-2 text-xs text-emerald-400/90">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.games === 0
                      ? "—"
                      : `${(r.win_pct * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400 tabular-nums">
                    {formatRecordWLT(r)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-zinc-500">
        <Link href="/match" className="text-emerald-400 hover:underline">
          Play matches
        </Link>{" "}
        to build your record.
      </p>
    </div>
  );
}

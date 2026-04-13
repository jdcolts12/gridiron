import { formatDollars } from "@/lib/format/money";
import { createClient } from "@/lib/supabase/server";
import type { Player, Team } from "@/lib/types";
import { redirect } from "next/navigation";

function byPosThenName(a: Player, b: Player) {
  return (
    a.position.localeCompare(b.position) ||
    a.name.localeCompare(b.name)
  );
}

export default async function SquadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/squad");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Team>();

  if (!team) {
    redirect("/onboarding");
  }

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", team.id)
    .returns<Player[]>();

  const roster = (players ?? []).slice().sort(byPosThenName);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Squad</h1>
        <p className="text-sm text-zinc-400">
          {team.name} · {formatDollars(team.cash)} · Gems {team.gems}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/60 text-zinc-300">
            <tr>
              <th className="px-4 py-2 font-medium">Pos</th>
              <th className="px-4 py-2 font-medium">Player</th>
              <th className="px-4 py-2 font-medium">SPD</th>
              <th className="px-4 py-2 font-medium">STR</th>
              <th className="px-4 py-2 font-medium">PSA</th>
              <th className="px-4 py-2 font-medium">CTH</th>
              <th className="px-4 py-2 font-medium">STA</th>
              <th className="px-4 py-2 font-medium">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {roster.map((p) => (
              <tr key={p.id} className="text-zinc-200">
                <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                  {p.position}
                </td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.speed}</td>
                <td className="px-4 py-2">{p.strength}</td>
                <td className="px-4 py-2">{p.passing}</td>
                <td className="px-4 py-2">{p.catching}</td>
                <td className="px-4 py-2">{p.stamina}</td>
                <td className="px-4 py-2">{p.tier}</td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-zinc-400" colSpan={8}>
                  No players found for this team.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

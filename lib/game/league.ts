import type { SupabaseClient } from "@supabase/supabase-js";

export type StandingRow = {
  id: string;
  name: string;
  league_points: number;
};

/**
 * Full standings (requires service-role client — RLS hides other teams for anon/user).
 */
export async function fetchLeagueStandings(
  client: SupabaseClient
): Promise<{ rows: StandingRow[]; error: string | null }> {
  const { data, error } = await client
    .from("teams")
    .select("id, name, league_points")
    .order("league_points", { ascending: false })
    .order("name", { ascending: true })
    .limit(100);

  if (error) {
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as StandingRow[], error: null };
}

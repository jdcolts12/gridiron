import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal match row for standings math. */
export type MatchMinimal = {
  home_team_id: string;
  away_team_id: string;
  winner_id: string | null;
};

export type StandingRow = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  /** 0–1; 0 when `games === 0`. */
  win_pct: number;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  draws: number;
  games: number;
  win_pct: number;
};

export function summarizeTeamRecord(
  teamId: string,
  matches: MatchMinimal[]
): TeamRecord {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const m of matches) {
    if (m.home_team_id !== teamId && m.away_team_id !== teamId) continue;
    if (m.winner_id === null) {
      draws += 1;
    } else if (m.winner_id === teamId) {
      wins += 1;
    } else {
      losses += 1;
    }
  }
  const games = wins + losses + draws;
  const win_pct = games > 0 ? wins / games : 0;
  return { wins, losses, draws, games, win_pct };
}

/**
 * Build sorted standings: win % (teams with games before 0-game teams), then wins, then name.
 */
export function aggregateStandings(
  teams: { id: string; name: string }[],
  matches: MatchMinimal[]
): StandingRow[] {
  const byId = new Map<string, { w: number; l: number; d: number }>();
  for (const t of teams) {
    byId.set(t.id, { w: 0, l: 0, d: 0 });
  }

  for (const m of matches) {
    const h = m.home_team_id;
    const a = m.away_team_id;
    if (!byId.has(h) || !byId.has(a)) continue;
    if (m.winner_id === null) {
      byId.get(h)!.d++;
      byId.get(a)!.d++;
    } else if (m.winner_id === h) {
      byId.get(h)!.w++;
      byId.get(a)!.l++;
    } else {
      byId.get(a)!.w++;
      byId.get(h)!.l++;
    }
  }

  const rows: StandingRow[] = teams.map((t) => {
    const s = byId.get(t.id)!;
    const games = s.w + s.l + s.d;
    const win_pct = games > 0 ? s.w / games : 0;
    return {
      id: t.id,
      name: t.name,
      wins: s.w,
      losses: s.l,
      draws: s.d,
      games,
      win_pct,
    };
  });

  rows.sort((a, b) => {
    const playedA = a.games > 0 ? 1 : 0;
    const playedB = b.games > 0 ? 1 : 0;
    if (playedA !== playedB) return playedB - playedA;
    if (a.win_pct !== b.win_pct) return b.win_pct - a.win_pct;
    if (a.wins !== b.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

/** W–L–T, or em dash when no games. */
export function formatRecordWLT(
  row: Pick<StandingRow, "wins" | "losses" | "draws" | "games">
): string {
  if (row.games === 0) return "—";
  return `${row.wins}–${row.losses}–${row.draws}`;
}

/**
 * Full standings (service-role client — needs to read all teams and matches).
 */
export async function fetchLeagueStandings(
  client: SupabaseClient
): Promise<{ rows: StandingRow[]; error: string | null }> {
  const { data: teams, error: tErr } = await client
    .from("teams")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200);

  if (tErr) {
    return { rows: [], error: tErr.message };
  }

  const { data: matches, error: mErr } = await client
    .from("matches")
    .select("home_team_id, away_team_id, winner_id");

  if (mErr) {
    return { rows: [], error: mErr.message };
  }

  const rows = aggregateStandings(teams ?? [], (matches ?? []) as MatchMinimal[]);
  return { rows, error: null };
}

/**
 * Row shapes aligned with `public.*` tables in Supabase (snake_case columns).
 */

/** JSON value as returned by PostgREST / `jsonb` columns. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** `public.teams` */
export type Team = {
  id: string;
  user_id: string;
  name: string;
  cash: number;
  gems: number;
  stadium_level: number;
  training_level: number;
  coaching_level: number;
  league_points: number;
  created_at: string;
};

/** `public.players` — position: GK, DEF, MID, FWD */
export type Player = {
  id: string;
  team_id: string;
  name: string;
  position: string;
  speed: number;
  strength: number;
  passing: number;
  shooting: number;
  stamina: number;
  /** 1 = bronze, 2 = silver, 3 = gold */
  tier: number;
  created_at: string;
};

/** `public.matches` — match_log: replay event array */
export type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string | null;
  match_log: Json | null;
  played_at: string;
};

/** `public.upgrades` — type: stadium | training | coaching */
export type Upgrade = {
  id: string;
  team_id: string;
  type: string;
  from_level: number;
  to_level: number;
  cost_cash: number;
  started_at: string;
  completes_at: string;
  completed: boolean;
};

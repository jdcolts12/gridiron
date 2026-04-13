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
  /** Last time full-day stadium income was credited (`004_stadium_income_and_cap`). */
  stadium_income_last_collected_at?: string;
  created_at: string;
};

/** `public.players` — positions (QB, RB, WR, TE, OL, DL, LB, DB, K). */
export type Player = {
  id: string;
  team_id: string;
  name: string;
  position: string;
  speed: number;
  strength: number;
  passing: number;
  /** Receiving / ball skills. */
  catching: number;
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
  /** `006_match_scrimmage_kind` — `scrimmage` uses away_team_id = home_team_id for storage */
  match_kind?: string;
};

/** `public.player_upgrade_jobs` — timed stat training */
export type PlayerUpgradeJob = {
  id: string;
  player_id: string;
  team_id: string;
  cost_cash: number;
  completes_at: string;
  completed: boolean;
  created_at: string;
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

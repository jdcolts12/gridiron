-- Scrimmage matches: home plays a CPU squad; away_team_id stays equal to home_team_id for FK/RLS.

alter table public.matches
  add column if not exists match_kind text not null default 'league';

alter table public.matches
  drop constraint if exists matches_match_kind_check;

alter table public.matches
  add constraint matches_match_kind_check
  check (match_kind in ('league', 'scrimmage'));

comment on column public.matches.match_kind is
  'league = two real teams; scrimmage = CPU opponent (away_team_id mirrors home for storage).';

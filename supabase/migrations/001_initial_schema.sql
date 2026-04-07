-- Gridiron Dynasty: core tables + RLS (one row per auth user’s team ownership chain).

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  cash integer not null default 1000,
  gems integer not null default 50,
  stadium_level integer not null default 1,
  training_level integer not null default 1,
  coaching_level integer not null default 1,
  league_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  position text not null, -- GK, DEF, MID, FWD
  speed integer not null default 50,
  strength integer not null default 50,
  passing integer not null default 50,
  shooting integer not null default 50,
  stamina integer not null default 50,
  tier integer not null default 1, -- 1 = bronze, 2 = silver, 3 = gold
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references public.teams (id) on delete cascade,
  away_team_id uuid not null references public.teams (id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  winner_id uuid references public.teams (id),
  match_log jsonb, -- array of match events for the replay feed
  played_at timestamptz not null default now()
);

create table public.upgrades (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  type text not null, -- 'stadium', 'training', 'coaching'
  from_level integer not null,
  to_level integer not null,
  cost_cash integer not null,
  started_at timestamptz not null default now(),
  completes_at timestamptz not null,
  completed boolean not null default false
);

create index idx_players_team_id on public.players (team_id);
create index idx_matches_home_team_id on public.matches (home_team_id);
create index idx_matches_away_team_id on public.matches (away_team_id);
create index idx_upgrades_team_id on public.upgrades (team_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.upgrades enable row level security;

-- teams: own row only
create policy "teams_select_own"
  on public.teams for select
  using (auth.uid() = user_id);

create policy "teams_insert_own"
  on public.teams for insert
  with check (auth.uid() = user_id);

create policy "teams_update_own"
  on public.teams for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "teams_delete_own"
  on public.teams for delete
  using (auth.uid() = user_id);

-- players: via owning team
create policy "players_select_own_team"
  on public.players for select
  using (
    exists (
      select 1 from public.teams t
      where t.id = players.team_id and t.user_id = auth.uid()
    )
  );

create policy "players_insert_own_team"
  on public.players for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "players_update_own_team"
  on public.players for update
  using (
    exists (
      select 1 from public.teams t
      where t.id = players.team_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "players_delete_own_team"
  on public.players for delete
  using (
    exists (
      select 1 from public.teams t
      where t.id = players.team_id and t.user_id = auth.uid()
    )
  );

-- matches: participating team owned by user
create policy "matches_select_participant"
  on public.matches for select
  using (
    exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = home_team_id)
    or exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = away_team_id)
  );

create policy "matches_insert_participant"
  on public.matches for insert
  with check (
    exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = home_team_id)
    or exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = away_team_id)
  );

create policy "matches_update_participant"
  on public.matches for update
  using (
    exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = home_team_id)
    or exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = away_team_id)
  )
  with check (
    exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = home_team_id)
    or exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = away_team_id)
  );

create policy "matches_delete_participant"
  on public.matches for delete
  using (
    exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = home_team_id)
    or exists (select 1 from public.teams t where t.user_id = auth.uid() and t.id = away_team_id)
  );

-- upgrades: via owning team
create policy "upgrades_select_own_team"
  on public.upgrades for select
  using (
    exists (
      select 1 from public.teams t
      where t.id = upgrades.team_id and t.user_id = auth.uid()
    )
  );

create policy "upgrades_insert_own_team"
  on public.upgrades for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "upgrades_update_own_team"
  on public.upgrades for update
  using (
    exists (
      select 1 from public.teams t
      where t.id = upgrades.team_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "upgrades_delete_own_team"
  on public.upgrades for delete
  using (
    exists (
      select 1 from public.teams t
      where t.id = upgrades.team_id and t.user_id = auth.uid()
    )
  );

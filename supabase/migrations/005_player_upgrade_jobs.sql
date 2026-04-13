-- Timed player training / upgrade jobs (one active per player).

create table public.player_upgrade_jobs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  cost_cash integer not null,
  completes_at timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_player_upgrade_jobs_team_id on public.player_upgrade_jobs (team_id);
create index idx_player_upgrade_jobs_player_id on public.player_upgrade_jobs (player_id);
create index idx_player_upgrade_jobs_active on public.player_upgrade_jobs (team_id, completed)
  where completed = false;

alter table public.player_upgrade_jobs enable row level security;

create policy "player_upgrade_jobs_select_own_team"
  on public.player_upgrade_jobs for select
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "player_upgrade_jobs_insert_own_team"
  on public.player_upgrade_jobs for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "player_upgrade_jobs_update_own_team"
  on public.player_upgrade_jobs for update
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

create policy "player_upgrade_jobs_delete_own_team"
  on public.player_upgrade_jobs for delete
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.user_id = auth.uid()
    )
  );

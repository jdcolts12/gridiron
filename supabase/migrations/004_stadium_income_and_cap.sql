-- Stadium income accrual + cap legacy stadium levels at 10.

alter table public.teams
  add column if not exists stadium_income_last_collected_at timestamptz not null default now();

update public.teams
set stadium_level = 10
where stadium_level > 10;

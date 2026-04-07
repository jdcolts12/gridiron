-- Idempotent rename if an older 001 used `coins` / `cost_coins`.
-- Skips when `001_initial_schema.sql` already defined `cash` / `cost_cash`.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teams' and column_name = 'coins'
  ) then
    alter table public.teams rename column coins to cash;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'upgrades' and column_name = 'cost_coins'
  ) then
    alter table public.upgrades rename column cost_coins to cost_cash;
  end if;
end $$;

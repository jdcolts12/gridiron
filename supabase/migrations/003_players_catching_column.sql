-- `shooting` → `catching` (receiving / ball skills). Idempotent for existing DBs.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'shooting'
  ) then
    alter table public.players rename column shooting to catching;
  end if;
end $$;

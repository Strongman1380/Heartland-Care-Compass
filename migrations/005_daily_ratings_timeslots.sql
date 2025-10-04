-- Add time-of-day support for multiple ratings per day
begin;

-- Add a time_of_day column to allow morning/day/evening entries
alter table if exists public.daily_ratings
  add column if not exists time_of_day text not null default 'day'
  check (time_of_day in ('morning','day','evening'));

-- Drop old unique constraint on (youth_id, date) if it exists
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.daily_ratings'::regclass
      and conname = 'daily_ratings_youth_id_date_key'
  ) then
    alter table public.daily_ratings drop constraint daily_ratings_youth_id_date_key;
  end if;
end $$;

-- Create new unique constraint including time_of_day
alter table public.daily_ratings
  add constraint daily_ratings_youth_date_slot_unique unique (youth_id, date, time_of_day);

commit;


-- Application-wide data tables for replacing localStorage
-- School scores, academics (credits/grades/steps), school incidents, alerts, notes, report drafts

begin;

-- School daily scores
create table if not exists public.school_scores (
  id uuid primary key default gen_random_uuid(),
  youth_id uuid not null references public.youth(id) on delete cascade,
  date date not null,
  weekday smallint not null check (weekday between 1 and 7),
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (youth_id, date)
);
create index if not exists idx_school_scores_date on public.school_scores(date);
create index if not exists idx_school_scores_youth_date on public.school_scores(youth_id, date desc);

-- Academics
create table if not exists public.academic_credits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.youth(id) on delete cascade,
  date_earned date not null,
  credit_value numeric(4,2) not null check (credit_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_academic_credits_student_date on public.academic_credits(student_id, date_earned desc);

create table if not exists public.academic_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.youth(id) on delete cascade,
  date_entered date not null,
  grade_value numeric(5,2) not null check (grade_value between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_academic_grades_student_date on public.academic_grades(student_id, date_entered desc);

create table if not exists public.academic_steps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.youth(id) on delete cascade,
  date_completed date not null,
  steps_count integer not null check (steps_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_academic_steps_student_date on public.academic_steps(student_id, date_completed desc);

-- School incident reports
create table if not exists public.school_incidents (
  incident_id text primary key,
  date_time timestamptz not null,
  reported_by jsonb not null,
  location text not null,
  incident_type text not null,
  severity text not null check (severity in ('Low','Medium','High','Critical')),
  summary text not null,
  timeline jsonb not null default '[]'::jsonb,
  actions_taken text,
  medical_needed boolean not null default false,
  medical_details text,
  attachments jsonb not null default '[]'::jsonb,
  staff_signatures jsonb not null default '[]'::jsonb,
  follow_up jsonb,
  confidential_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_incident_involved (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.school_incidents(incident_id) on delete cascade,
  resident_id uuid not null references public.youth(id) on delete cascade,
  name text,
  role_in_incident text not null
);
create index if not exists idx_school_incident_involved_incident on public.school_incident_involved(incident_id);

-- Alerts
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  level text not null default 'info',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  youth_id uuid not null references public.youth(id) on delete cascade,
  author_id uuid,
  category text,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_youth on public.notes(youth_id, created_at desc);

-- Report drafts (unify all drafts)
create table if not exists public.report_drafts (
  id uuid primary key default gen_random_uuid(),
  youth_id uuid references public.youth(id) on delete cascade,
  draft_type text not null,
  author_id uuid,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (youth_id, draft_type, author_id)
);
create index if not exists idx_report_drafts_youth_type on public.report_drafts(youth_id, draft_type);

-- RLS
alter table public.school_scores enable row level security;
alter table public.academic_credits enable row level security;
alter table public.academic_grades enable row level security;
alter table public.academic_steps enable row level security;
alter table public.school_incidents enable row level security;
alter table public.school_incident_involved enable row level security;
alter table public.alerts enable row level security;
alter table public.notes enable row level security;
alter table public.report_drafts enable row level security;

-- Simple permissive policies for now (authenticated)
do $$ begin
  perform auth.uid();
  exception when others then
    -- skip in non-supabase context
    return;
end $$;

create policy if not exists "auth_rw_school_scores" on public.school_scores for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_academic_credits" on public.academic_credits for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_academic_grades" on public.academic_grades for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_academic_steps" on public.academic_steps for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_school_incidents" on public.school_incidents for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_school_incident_involved" on public.school_incident_involved for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_alerts" on public.alerts for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_notes" on public.notes for all to authenticated using (true) with check (true);
create policy if not exists "auth_rw_report_drafts" on public.report_drafts for all to authenticated using (true) with check (true);

commit;


create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  zip_code text not null check (zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  role text not null default 'Caregiver',
  employer text not null default '',
  shift text not null default '',
  experience text not null default '',
  communication_preference text not null default 'balanced'
    check (communication_preference in ('gentle', 'direct', 'balanced')),
  support_contact text not null default '',
  last_mental_state text not null default 'restless'
    check (last_mental_state in ('calm', 'restless', 'anxious', 'hopeful', 'tired', 'overwhelmed')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_recipients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_code text not null check (char_length(client_code) between 1 and 120),
  condition text not null,
  stage text not null,
  living_situation text not null,
  mobility text not null default '',
  known_triggers text[] not null default '{}',
  care_notes text not null default '' check (char_length(care_notes) <= 5000),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_code)
);

create unique index if not exists one_active_care_recipient_per_user
  on public.care_recipients (user_id)
  where is_active;

create table if not exists public.checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  checkin_date date not null,
  occurred_at timestamptz not null,
  mental_state text not null,
  zbi_estimate integer not null default 0,
  zbi_answers smallint[] not null default '{}',
  resonance_score integer not null default 50,
  emotions text[] not null default '{}',
  risk_level text not null default 'low',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id),
  check (jsonb_typeof(messages) = 'array')
);

create table if not exists public.care_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  recipient_id text not null references public.care_recipients(id) on delete cascade,
  issue text not null,
  summary text not null,
  risk text not null,
  trigger text,
  outcome text,
  status text not null check (status in ('open', 'resolved')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.action_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  event_id text not null,
  title text not null,
  steps text[] not null default '{}',
  source_title text not null,
  source_url text not null,
  reviewed_at text not null,
  created_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, event_id)
    references public.care_events(user_id, id) on delete cascade
);

create table if not exists public.care_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  recipient_id text not null references public.care_recipients(id) on delete cascade,
  event_id text,
  title text not null,
  owner_name text not null,
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.follow_ups (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  recipient_id text not null references public.care_recipients(id) on delete cascade,
  event_id text not null,
  prompt text not null,
  due_at timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, event_id)
    references public.care_events(user_id, id) on delete cascade
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists care_recipients_user_id_idx on public.care_recipients(user_id);
create index if not exists checkins_user_id_occurred_at_idx on public.checkins(user_id, occurred_at desc);
create index if not exists care_events_user_id_recipient_idx on public.care_events(user_id, recipient_id);
create index if not exists action_plans_user_id_idx on public.action_plans(user_id);
create index if not exists care_tasks_user_id_recipient_idx on public.care_tasks(user_id, recipient_id);
create index if not exists follow_ups_user_id_recipient_idx on public.follow_ups(user_id, recipient_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists care_recipients_set_updated_at on public.care_recipients;
create trigger care_recipients_set_updated_at
before update on public.care_recipients
for each row execute function public.set_updated_at();

drop trigger if exists checkins_set_updated_at on public.checkins;
create trigger checkins_set_updated_at
before update on public.checkins
for each row execute function public.set_updated_at();

drop trigger if exists care_events_set_updated_at on public.care_events;
create trigger care_events_set_updated_at
before update on public.care_events
for each row execute function public.set_updated_at();

drop trigger if exists care_tasks_set_updated_at on public.care_tasks;
create trigger care_tasks_set_updated_at
before update on public.care_tasks
for each row execute function public.set_updated_at();

drop trigger if exists follow_ups_set_updated_at on public.follow_ups;
create trigger follow_ups_set_updated_at
before update on public.follow_ups
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.care_recipients enable row level security;
alter table public.checkins enable row level security;
alter table public.care_events enable row level security;
alter table public.action_plans enable row level security;
alter table public.care_tasks enable row level security;
alter table public.follow_ups enable row level security;

revoke all on public.profiles from anon;
revoke all on public.care_recipients from anon;
revoke all on public.checkins from anon;
revoke all on public.care_events from anon;
revoke all on public.action_plans from anon;
revoke all on public.care_tasks from anon;
revoke all on public.follow_ups from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.care_recipients to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
grant select, insert, update, delete on public.care_events to authenticated;
grant select, insert, update, delete on public.action_plans to authenticated;
grant select, insert, update, delete on public.care_tasks to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "profiles_delete_own"
on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "care_recipients_select_own"
on public.care_recipients for select to authenticated
using ((select auth.uid()) = user_id);
create policy "care_recipients_insert_own"
on public.care_recipients for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "care_recipients_update_own"
on public.care_recipients for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "care_recipients_delete_own"
on public.care_recipients for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "checkins_select_own"
on public.checkins for select to authenticated
using ((select auth.uid()) = user_id);
create policy "checkins_insert_own"
on public.checkins for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "checkins_update_own"
on public.checkins for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "checkins_delete_own"
on public.checkins for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "care_events_select_own"
on public.care_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy "care_events_insert_own"
on public.care_events for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "care_events_update_own"
on public.care_events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "care_events_delete_own"
on public.care_events for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "action_plans_select_own"
on public.action_plans for select to authenticated
using ((select auth.uid()) = user_id);
create policy "action_plans_insert_own"
on public.action_plans for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "action_plans_update_own"
on public.action_plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "action_plans_delete_own"
on public.action_plans for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "care_tasks_select_own"
on public.care_tasks for select to authenticated
using ((select auth.uid()) = user_id);
create policy "care_tasks_insert_own"
on public.care_tasks for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "care_tasks_update_own"
on public.care_tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "care_tasks_delete_own"
on public.care_tasks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "follow_ups_select_own"
on public.follow_ups for select to authenticated
using ((select auth.uid()) = user_id);
create policy "follow_ups_insert_own"
on public.follow_ups for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "follow_ups_update_own"
on public.follow_ups for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "follow_ups_delete_own"
on public.follow_ups for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.complete_onboarding(
  p_recipient_id text,
  p_display_name text,
  p_zip_code text,
  p_client_code text,
  p_condition text,
  p_stage text,
  p_living_situation text,
  p_mobility text,
  p_known_triggers text[],
  p_care_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    zip_code,
    onboarding_completed
  )
  values (
    current_user_id,
    trim(p_display_name),
    trim(p_zip_code),
    true
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      zip_code = excluded.zip_code,
      onboarding_completed = true;

  update public.care_recipients
  set is_active = false
  where user_id = current_user_id;

  insert into public.care_recipients (
    id,
    user_id,
    client_code,
    condition,
    stage,
    living_situation,
    mobility,
    known_triggers,
    care_notes,
    is_active
  )
  values (
    p_recipient_id,
    current_user_id,
    trim(p_client_code),
    p_condition,
    p_stage,
    p_living_situation,
    trim(p_mobility),
    coalesce(p_known_triggers, '{}'),
    trim(p_care_notes),
    true
  )
  on conflict (user_id, client_code) do update
  set condition = excluded.condition,
      stage = excluded.stage,
      living_situation = excluded.living_situation,
      mobility = excluded.mobility,
      known_triggers = excluded.known_triggers,
      care_notes = excluded.care_notes,
      is_active = true;
end;
$$;

revoke all on function public.complete_onboarding(
  text, text, text, text, text, text, text, text, text[], text
) from public, anon;
grant execute on function public.complete_onboarding(
  text, text, text, text, text, text, text, text, text[], text
) to authenticated;

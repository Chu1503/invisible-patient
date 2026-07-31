alter table public.care_tasks
  add column if not exists details text not null default '',
  add column if not exists recurrence text not null default 'none',
  add column if not exists reminder_minutes integer,
  add column if not exists last_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'care_tasks_recurrence_check'
      and conrelid = 'public.care_tasks'::regclass
  ) then
    alter table public.care_tasks
      add constraint care_tasks_recurrence_check
      check (recurrence in ('none', 'daily', 'weekly'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'care_tasks_reminder_minutes_check'
      and conrelid = 'public.care_tasks'::regclass
  ) then
    alter table public.care_tasks
      add constraint care_tasks_reminder_minutes_check
      check (
        reminder_minutes is null
        or reminder_minutes between 0 and 10080
      );
  end if;
end;
$$;

create index if not exists care_tasks_user_id_due_at_idx
on public.care_tasks(user_id, due_at)
where completed = false;

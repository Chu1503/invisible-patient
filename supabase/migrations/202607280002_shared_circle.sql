create table if not exists public.circle_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anonymous_tag text not null
    check (char_length(anonymous_tag) between 3 and 40),
  topic text not null
    check (char_length(topic) between 1 and 120),
  content text not null
    check (char_length(content) between 1 and 2000),
  likes_count integer not null default 0
    check (likes_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circle_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anonymous_tag text not null
    check (char_length(anonymous_tag) between 3 and 40),
  content text not null
    check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.circle_likes (
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists circle_posts_created_at_idx
on public.circle_posts(created_at desc);

create index if not exists circle_replies_post_created_at_idx
on public.circle_replies(post_id, created_at);

create or replace function public.update_circle_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.circle_posts
    set likes_count = likes_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.circle_posts
  set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists circle_likes_count_after_insert on public.circle_likes;
create trigger circle_likes_count_after_insert
after insert on public.circle_likes
for each row execute function public.update_circle_likes_count();

drop trigger if exists circle_likes_count_after_delete on public.circle_likes;
create trigger circle_likes_count_after_delete
after delete on public.circle_likes
for each row execute function public.update_circle_likes_count();

drop trigger if exists circle_posts_set_updated_at on public.circle_posts;
create trigger circle_posts_set_updated_at
before update on public.circle_posts
for each row execute function public.set_updated_at();

alter table public.circle_posts enable row level security;
alter table public.circle_replies enable row level security;
alter table public.circle_likes enable row level security;

revoke all on public.circle_posts from anon, authenticated;
revoke all on public.circle_replies from anon, authenticated;
revoke all on public.circle_likes from anon, authenticated;

grant select (
  id,
  anonymous_tag,
  topic,
  content,
  likes_count,
  created_at,
  updated_at
) on public.circle_posts to authenticated;
grant insert (
  anonymous_tag,
  topic,
  content
) on public.circle_posts to authenticated;
grant delete on public.circle_posts to authenticated;

grant select (
  id,
  post_id,
  anonymous_tag,
  content,
  created_at
) on public.circle_replies to authenticated;
grant insert (
  post_id,
  anonymous_tag,
  content
) on public.circle_replies to authenticated;
grant delete on public.circle_replies to authenticated;

grant select (post_id) on public.circle_likes to authenticated;
grant insert (post_id) on public.circle_likes to authenticated;
grant delete on public.circle_likes to authenticated;

drop policy if exists "circle_posts_read_authenticated"
on public.circle_posts;
create policy "circle_posts_read_authenticated"
on public.circle_posts for select to authenticated
using (true);

drop policy if exists "circle_posts_insert_own"
on public.circle_posts;
create policy "circle_posts_insert_own"
on public.circle_posts for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "circle_posts_delete_own"
on public.circle_posts;
create policy "circle_posts_delete_own"
on public.circle_posts for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "circle_replies_read_authenticated"
on public.circle_replies;
create policy "circle_replies_read_authenticated"
on public.circle_replies for select to authenticated
using (true);

drop policy if exists "circle_replies_insert_own"
on public.circle_replies;
create policy "circle_replies_insert_own"
on public.circle_replies for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "circle_replies_delete_own"
on public.circle_replies;
create policy "circle_replies_delete_own"
on public.circle_replies for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "circle_likes_read_own"
on public.circle_likes;
create policy "circle_likes_read_own"
on public.circle_likes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "circle_likes_insert_own"
on public.circle_likes;
create policy "circle_likes_insert_own"
on public.circle_likes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "circle_likes_delete_own"
on public.circle_likes;
create policy "circle_likes_delete_own"
on public.circle_likes for delete to authenticated
using ((select auth.uid()) = user_id);

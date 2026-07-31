alter table public.circle_posts
add column if not exists edited_at timestamptz;

alter table public.circle_replies
add column if not exists edited_at timestamptz;

grant select (edited_at) on public.circle_posts to authenticated;
grant select (edited_at) on public.circle_replies to authenticated;

revoke update, delete on public.circle_posts from authenticated;
revoke update, delete on public.circle_replies from authenticated;

drop policy if exists "circle_posts_delete_own"
on public.circle_posts;

drop policy if exists "circle_replies_delete_own"
on public.circle_replies;

create or replace function public.get_my_circle_content_ids()
returns table (
  content_type text,
  content_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'post'::text, post.id
  from public.circle_posts as post
  where post.user_id = (select auth.uid())

  union all

  select 'reply'::text, reply.id
  from public.circle_replies as reply
  where reply.user_id = (select auth.uid());
$$;

create or replace function public.update_circle_post(
  p_post_id uuid,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_content is null
    or char_length(btrim(p_content)) < 1
    or char_length(btrim(p_content)) > 2000 then
    raise exception 'Post content must contain between 1 and 2000 characters'
      using errcode = '22023';
  end if;

  update public.circle_posts
  set
    content = btrim(p_content),
    edited_at = now()
  where id = p_post_id
    and user_id = (select auth.uid());

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Post not found or not owned by this account'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.update_circle_reply(
  p_reply_id uuid,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_content is null
    or char_length(btrim(p_content)) < 1
    or char_length(btrim(p_content)) > 2000 then
    raise exception 'Response content must contain between 1 and 2000 characters'
      using errcode = '22023';
  end if;

  update public.circle_replies
  set
    content = btrim(p_content),
    edited_at = now()
  where id = p_reply_id
    and user_id = (select auth.uid());

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Response not found or not owned by this account'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.delete_circle_post(
  p_post_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.circle_posts
  where id = p_post_id
    and user_id = (select auth.uid());

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Post not found or not owned by this account'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.delete_circle_reply(
  p_reply_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.circle_replies
  where id = p_reply_id
    and user_id = (select auth.uid());

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Response not found or not owned by this account'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.get_my_circle_content_ids() from public;
revoke all on function public.update_circle_post(uuid, text) from public;
revoke all on function public.update_circle_reply(uuid, text) from public;
revoke all on function public.delete_circle_post(uuid) from public;
revoke all on function public.delete_circle_reply(uuid) from public;

grant execute on function public.get_my_circle_content_ids() to authenticated;
grant execute on function public.update_circle_post(uuid, text) to authenticated;
grant execute on function public.update_circle_reply(uuid, text) to authenticated;
grant execute on function public.delete_circle_post(uuid) to authenticated;
grant execute on function public.delete_circle_reply(uuid) to authenticated;

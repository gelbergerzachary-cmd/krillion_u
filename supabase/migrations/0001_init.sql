-- Daily Dose schema. Paste this whole file into Supabase → SQL Editor → Run.

-- ── Tables ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_.]{2,24}$'),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique default lower(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game text not null check (game in ('krillion', 'wordle', 'connections', 'feetle', 'globle')),
  play_date date not null,
  solved boolean not null,
  value int,
  points int not null check (points between 0 and 100),
  raw text check (char_length(raw) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, game, play_date)
);
create index scores_date_idx on public.scores (play_date);

-- ── Helpers (security definer so RLS policies don't recurse) ───────────────
create function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members where group_id = gid and user_id = auth.uid()
  );
$$;

create function public.shares_group(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.scores enable row level security;

create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members see their groups" on public.groups
  for select to authenticated using (public.is_group_member(id));

create policy "members see fellow members" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "leave a group" on public.group_members
  for delete to authenticated using (user_id = auth.uid());

create policy "see own and groupmates' scores" on public.scores
  for select to authenticated using (user_id = auth.uid() or public.shares_group(user_id));
create policy "insert own scores" on public.scores
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own scores" on public.scores
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own scores" on public.scores
  for delete to authenticated using (user_id = auth.uid());

-- ── RPCs for creating / joining groups ──────────────────────────────────────
create function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.groups (name, created_by) values (trim(p_name), auth.uid()) returning * into g;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end;
$$;

create function public.join_group(p_code text)
returns public.groups language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from public.groups where invite_code = lower(trim(p_code));
  if g.id is null then raise exception 'No group with that invite code'; end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid())
    on conflict do nothing;
  return g;
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.shares_group(uuid) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.shares_group(uuid) to authenticated;

-- ── Create a profile automatically on sign-up ──────────────────────────────
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^A-Za-z0-9_.]', '', 'g');
  candidate text;
begin
  if char_length(base) < 2 then base := 'player'; end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    candidate := base || floor(random() * 1000)::int;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

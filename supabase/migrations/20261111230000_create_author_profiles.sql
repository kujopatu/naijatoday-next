create table if not exists public.author_profiles (
  author_name text primary key check (char_length(trim(author_name)) between 1 and 100),
  bio text not null default '' check (char_length(bio) <= 1200),
  avatar_url text,
  role_title text not null default 'NaijaToday Contributor' check (char_length(role_title) <= 100),
  updated_at timestamptz not null default now()
);

alter table public.author_profiles enable row level security;

drop policy if exists "Public can read author profiles" on public.author_profiles;
create policy "Public can read author profiles"
  on public.author_profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage author profiles" on public.author_profiles;
create policy "Admins manage author profiles"
  on public.author_profiles for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.author_profiles from public;
grant select on public.author_profiles to anon, authenticated;
grant insert, update, delete on public.author_profiles to authenticated;

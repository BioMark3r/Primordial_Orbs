create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key,
  created_at timestamptz not null default now(),
  owner uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('HOTSEAT', 'CPU', 'NETWORK')),
  result text not null check (result in ('WIN', 'LOSS')),
  opponent_type text not null check (opponent_type in ('CPU', 'HUMAN')),
  meta jsonb not null default '{}'::jsonb
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "matches_insert_own"
  on public.matches
  for insert
  with check (auth.uid() = owner);

create policy "matches_select_own"
  on public.matches
  for select
  using (auth.uid() = owner);

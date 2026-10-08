create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null default 'ayrshare',
  provider_profile_id text,
  provider_profile_key text not null,
  connected_platforms text[] not null default '{}',
  last_linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_profiles enable row level security;
drop policy if exists "users read own social profile" on public.social_profiles;
create policy "users read own social profile" on public.social_profiles for select using (auth.uid() = user_id);
comment on table public.social_profiles is 'Ayrshare profile keys; never expose them to the client, only use through the social Edge Function';

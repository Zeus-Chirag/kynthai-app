-- ==========================================================================
-- Kynthai US — Migration 003: Doctor Presence + Free Tier Gates
-- ==========================================================================

-- ── Doctor presence tracking ─────────────────────────────────────────────────
-- Allows tracking when a doctor was last active so we can show real
-- online/away/offline status to patients.

alter table public.doctor_profiles
  add column if not exists last_active_at timestamptz;

create index if not exists idx_doctor_profiles_last_active
  on public.doctor_profiles(last_active_at);

-- Doctors can update their own presence
drop policy if exists "Doctors update own presence" on public.doctor_profiles;
create policy "Doctors update presence" on public.doctor_profiles
  for update using (auth.uid() = user_id);

-- ── Subscription tier on users ───────────────────────────────────────────────
-- Tracks which plan each user is on.

alter table public.users
  add column if not exists subscription_tier text not null default 'free';

create index if not exists idx_users_subscription_tier
  on public.users(subscription_tier);

-- ── Free tier daily usage tracking ───────────────────────────────────────────
-- Records how many times a free-tier user has used restricted features
-- today. Resets automatically each day via date column.

create table if not exists public.free_tier_usage (
  user_id    uuid not null references public.users(id) on delete cascade,
  usage_date date not null default current_date,
  medicines_added integer not null default 0,
  ai_chats_used   integer not null default 0,
  created_at      timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists idx_free_tier_usage_user
  on public.free_tier_usage(user_id);

alter table public.free_tier_usage enable row level security;

create policy "Users view own usage" on public.free_tier_usage
  for select using (auth.uid() = user_id);

create policy "Users insert own usage" on public.free_tier_usage
  for insert with check (auth.uid() = user_id);

create policy "Users update own usage" on public.free_tier_usage
  for update using (auth.uid() = user_id);

create policy "Service role full access" on public.free_tier_usage
  for all using (auth.role() = 'service_role');

-- ── Update RLS on users to allow reading subscription_tier ───────────────────
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- ── Trigger for free_tier_usage updated_at ───────────────────────────────────

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_free_tier_usage_updated_at
  before update on public.free_tier_usage
  for each row execute function public.update_updated_at();

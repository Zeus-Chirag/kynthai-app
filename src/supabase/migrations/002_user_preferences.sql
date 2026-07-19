-- ==========================================================================
-- Kyntha US — User Preferences (client-side settings)
-- Migration: 002_user_preferences
-- ==========================================================================

-- User preferences: language, alarm settings, onboarding state, etc.
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  language text not null default 'en',
  alarm_enabled boolean not null default true,
  alarm_mode text not null default 'professional',
  onboarding_complete boolean not null default false,
  onboarding_role text,
  tutorial_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_preferences_user on public.user_preferences(user_id);

alter table public.user_preferences enable row level security;

create policy "Users view own prefs" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "Users update own prefs" on public.user_preferences
  for all using (auth.uid() = user_id);

create policy "Service role full access" on public.user_preferences
  for all using (auth.role() = 'service_role');

-- Trigger for auto-update updated_at
create trigger trg_user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.update_updated_at();

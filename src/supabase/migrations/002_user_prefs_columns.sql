-- ==========================================================================
-- Kynthai US — User preference columns on users table
-- Migration: 002_user_prefs_columns
-- ==========================================================================

alter table public.users add column if not exists onboarding_complete boolean not null default false;
alter table public.users add column if not exists onboarding_role text;
alter table public.users add column if not exists language text not null default 'en';
alter table public.users add column if not exists alarm_enabled boolean not null default true;
alter table public.users add column if not exists alarm_mode text not null default 'professional';

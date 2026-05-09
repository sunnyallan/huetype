-- Hue Type Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query

-- ──────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────
-- Profiles (mirrors auth.users)
-- ──────────────────────────────────────────
create table public.profiles (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  email              text,
  display_name       text,
  avatar_url         text,
  subscription_tier  text        not null default 'free'
                                 check (subscription_tier in ('free', 'pro', 'studio')),
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

-- Auto-create profile row whenever a new user signs up via Google OAuth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────
-- Projects
-- ──────────────────────────────────────────
create table public.projects (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text        not null default '',
  status      text        not null default 'draft'
                          check (status in ('draft', 'building', 'ready', 'error')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- Glyphs (one per uploaded icon)
-- ──────────────────────────────────────────
create table public.glyphs (
  id               uuid        primary key default uuid_generate_v4(),
  project_id       uuid        not null references public.projects(id) on delete cascade,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  name             text        not null,
  codepoint        text        not null,   -- e.g. "E001" (private use area U+E000–U+F8FF)
  svg_storage_path text,                   -- svgs/{user_id}/{project_id}/{id}.svg
  layer_count      int         not null default 1,
  upload_order     int         not null default 0,
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- Font Jobs
-- ──────────────────────────────────────────
create table public.font_jobs (
  id                 uuid        primary key default uuid_generate_v4(),
  project_id         uuid        not null references public.projects(id) on delete cascade,
  user_id            uuid        not null references auth.users(id) on delete cascade,
  status             text        not null default 'queued'
                                 check (status in ('queued', 'processing', 'complete', 'failed')),
  color_format       text        not null default 'glyf_colr_1',
  error_message      text,
  font_storage_path  text,       -- fonts/{user_id}/{project_id}/{id}.woff2
  ttf_storage_path   text,       -- fonts/{user_id}/{project_id}/{id}.ttf
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.projects  enable row level security;
alter table public.glyphs    enable row level security;
alter table public.font_jobs enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- projects
create policy "projects_select" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete" on public.projects for delete using (auth.uid() = user_id);

-- glyphs
create policy "glyphs_select" on public.glyphs for select using (auth.uid() = user_id);
create policy "glyphs_insert" on public.glyphs for insert with check (auth.uid() = user_id);
create policy "glyphs_update" on public.glyphs for update using (auth.uid() = user_id);
create policy "glyphs_delete" on public.glyphs for delete using (auth.uid() = user_id);

-- font_jobs (users can read; backend service role writes)
create policy "jobs_select" on public.font_jobs for select using (auth.uid() = user_id);
create policy "jobs_insert" on public.font_jobs for insert with check (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- Storage Buckets (run AFTER creating buckets in Supabase dashboard)
-- ──────────────────────────────────────────
-- In Supabase Dashboard → Storage, create two PRIVATE buckets:
--   1. "svgs"
--   2. "fonts"
-- Then add these storage policies:

-- Allow authenticated users to manage their own SVGs
-- (Supabase storage policies are set in the dashboard under Storage > Policies)
-- Policy for svgs bucket:
--   SELECT: ((bucket_id = 'svgs') AND ((storage.foldername(name))[1] = auth.uid()::text))
--   INSERT: same condition
--   DELETE: same condition
-- Policy for fonts bucket:
--   SELECT: ((bucket_id = 'fonts') AND ((storage.foldername(name))[1] = auth.uid()::text))
-- (Fonts bucket write is service-role only — no INSERT policy for authenticated users)

-- Migration: add font_type and palette to projects
-- Run this in Supabase Dashboard → SQL Editor → New Query

alter table public.projects
  add column if not exists font_type text not null default 'illustration'
    check (font_type in ('illustration', 'duo', 'tri'));

alter table public.projects
  add column if not exists palette jsonb not null default '[]'::jsonb;

-- Backfill: existing projects keep illustration mode (no palette)
update public.projects
  set font_type = 'illustration',
      palette = '[]'::jsonb
  where font_type is null;

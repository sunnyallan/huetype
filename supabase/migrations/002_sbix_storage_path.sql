-- Add SBIX storage path column to font_jobs
-- SBIX fonts are Safari/iOS compatible TTF files with bitmap strikes
ALTER TABLE font_jobs
  ADD COLUMN IF NOT EXISTS sbix_storage_path TEXT;

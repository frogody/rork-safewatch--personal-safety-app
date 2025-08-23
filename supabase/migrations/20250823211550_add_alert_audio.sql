-- Add audio_url column and storage policy for alert audio
alter table public.alerts add column if not exists audio_url text;

-- Create a storage bucket for alert audio if not exists (run via dashboard if needed)
-- Note: Supabase SQL cannot create storage buckets directly; do this in Dashboard > Storage.

-- RLS stays unchanged; audio_url is readable per alerts select policy.


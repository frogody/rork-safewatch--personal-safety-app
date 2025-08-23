# rork-safewatch--personal-safety-app

Created by Rork

## Supabase Setup (Production)

1. Create a Supabase project and note the Project URL and Anon Key.
2. In `app.json` set `extra.EXPO_PUBLIC_SUPABASE_URL` and `extra.EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. In Supabase SQL editor, run the SQL in `supabase/schema.sql` to create tables and RLS policies.
4. Configure Auth providers in Supabase (email/password or OTP). The app expects a profile row in `profiles` with the same `id` as the auth user.

## Environment Variables

You can also provide env via Expo: set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

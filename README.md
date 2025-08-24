# rork-safewatch--personal-safety-app

Created by Rork

## Supabase Setup (Production)

1. Create a Supabase project and note the Project URL and Anon Key.
2. In `app.json` set `extra.EXPO_PUBLIC_SUPABASE_URL` and `extra.EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. In Supabase SQL editor, run the SQL in `supabase/schema.sql` to create tables and RLS policies.
4. Configure Auth providers in Supabase (email/password or OTP). The app expects a profile row in `profiles` with the same `id` as the auth user.

## Environment Variables

This project uses `app.config.ts` and Expo public env for runtime config.

- Required:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Optional:
  - `EXPO_PUBLIC_SENTRY_DSN` (for Sentry error monitoring)
  - `EXPO_PUBLIC_APP_NAME`, `EXPO_PUBLIC_APP_SLUG` (branding)

Create an `.env` file in the project root (see example below) and ensure you add secrets in EAS as well for CI builds.

Example `.env`:

```
EXPO_PUBLIC_APP_NAME=SafeWatch: Personal Safety App
EXPO_PUBLIC_APP_SLUG=safewatch-personal-safety-app
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
EXPO_PUBLIC_SENTRY_DSN=
EXPO_IOS_BUNDLE_ID=app.rork.safewatch-personal-safety-app
EXPO_ANDROID_PACKAGE=app.rork.safewatch-personal-safety-app
EAS_PROJECT_ID=
```

## Production build

- Install deps: `bun install` (or `npm i`)
- Set env in `.env` and/or EAS secrets (`eas secret:create`)
- Build with EAS: `eas build -p ios` / `eas build -p android`

Sentry is initialized in `app/_layout.tsx` and will capture unhandled exceptions in production.

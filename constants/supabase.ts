import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extra = (Constants?.expoConfig?.extra ?? {}) as any;
const supabaseUrl = (extra?.EXPO_PUBLIC_SUPABASE_URL as string | undefined)
  ?? (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined);
const supabaseAnonKey = (extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined)
  ?? (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'Supabase URL/key are not set. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are defined in app.config.ts extra or .env (EXPO_PUBLIC_*). Restart the dev server with -c after changes.';
  // Fail fast so we get a clear error close to the source
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table schemas
export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  user_type: 'safety-seeker' | 'responder';
  phone_number?: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_verified: boolean;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAlert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  user_id: string;
  response_deadline?: string;
  current_batch?: number;
  max_batches?: number;
  responders_per_batch?: number;
  total_responders?: number;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAlertResponse {
  id: string;
  alert_id: string;
  user_id: string;
  timestamp: string;
  action: 'acknowledge' | 'respond';
  created_at: string;
}

export interface DatabaseJourney {
  id: string;
  user_id: string;
  destination_name: string;
  dest_lat: number;
  dest_lon: number;
  transport: 'walk' | 'bike' | 'car' | 'public';
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  share_token: string;
}

export interface DatabaseJourneyLocation {
  id: number;
  journey_id: string;
  ts: string;
  lat: number;
  lon: number;
  speed: number | null;
}
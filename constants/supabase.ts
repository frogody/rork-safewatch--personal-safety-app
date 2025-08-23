import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined)
  || (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined)
  || (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL/key are not set. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

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
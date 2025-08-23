import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and anon key
// For demo purposes, using a public demo instance
const supabaseUrl = 'https://xyzcompany.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTU2NzI0MCwiZXhwIjoxOTYxMTQzMjQwfQ.Wd0F7o8rRoweEka6ia9jFWBqNsM0o4ojfpWbJkMg_8U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Mock database functions for demo (replace with actual Supabase calls)
export const mockDatabase = {
  users: new Map<string, DatabaseUser>(),
  alerts: new Map<string, DatabaseAlert>(),
  alertResponses: new Map<string, DatabaseAlertResponse[]>(),
  
  // Initialize with demo data
  init() {
    // Demo users
    const seekerUser: DatabaseUser = {
      id: 'demo-seeker-1',
      email: 'seeker@safewatch.com',
      name: 'Sarah Johnson',
      user_type: 'safety-seeker',
      phone_number: '+1 (555) 123-4567',
      is_email_verified: true,
      is_phone_verified: true,
      is_verified: true,
      profile_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const responderUser: DatabaseUser = {
      id: 'demo-responder-1',
      email: 'responder@safewatch.com',
      name: 'Mike Thompson',
      user_type: 'responder',
      phone_number: '+1 (555) 987-6543',
      is_email_verified: true,
      is_phone_verified: true,
      is_verified: true,
      profile_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    this.users.set(seekerUser.id, seekerUser);
    this.users.set(responderUser.id, responderUser);
    
    // Demo alerts
    const alert1: DatabaseAlert = {
      id: '1',
      title: 'Safety Alert from Sarah M.',
      description: 'User has not moved for 5 minutes and may need assistance.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Market St, San Francisco, CA',
      status: 'active',
      user_id: 'demo-seeker-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    this.alerts.set(alert1.id, alert1);
    this.alertResponses.set(alert1.id, [
      {
        id: 'response-1',
        alert_id: alert1.id,
        user_id: 'demo-responder-1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        action: 'acknowledge',
        created_at: new Date().toISOString(),
      }
    ]);
  }
};

// Initialize mock database
mockDatabase.init();
import { supabase, DatabaseUser, DatabaseAlert, DatabaseAlertResponse } from '@/constants/supabase';
import * as FileSystem from 'expo-file-system';

// Database service functions
export class DatabaseService {
  // User operations
  static async createUser(user: Omit<DatabaseUser, 'created_at' | 'updated_at'>): Promise<DatabaseUser> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: user.name,
          user_type: user.user_type,
          phone_number: user.phone_number,
          is_email_verified: user.is_email_verified,
          is_phone_verified: user.is_phone_verified,
          is_verified: user.is_verified,
          profile_complete: user.profile_complete,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as DatabaseUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  static async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return (data as DatabaseUser) ?? null;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      throw error;
    }
  }

  static async getUserById(id: string): Promise<DatabaseUser | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as DatabaseUser) ?? null;
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  }

  static async updateUser(id: string, updates: Partial<DatabaseUser>): Promise<DatabaseUser | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as DatabaseUser;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // Alert operations
  static async createAlert(alert: Omit<DatabaseAlert, 'created_at' | 'updated_at'>): Promise<DatabaseAlert> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          ...alert,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as DatabaseAlert;
    } catch (error) {
      console.error('❌ Error creating alert:', error);
      throw error;
    }
  }

  static async getAlerts(): Promise<DatabaseAlert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'active')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return (data as DatabaseAlert[]) ?? [];
    } catch (error) {
      console.error('❌ Error getting alerts:', error);
      throw error;
    }
  }

  static async updateAlert(id: string, updates: Partial<DatabaseAlert>): Promise<DatabaseAlert | null> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as DatabaseAlert;
    } catch (error) {
      console.error('❌ Error updating alert:', error);
      throw error;
    }
  }

  static async uploadAlertAudio(alertId: string, localUri: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri, { size: true });
      if (!fileInfo.exists) return null;
      const filePath = `${alertId}/${Date.now()}.m4a`;
      const file = {
        uri: localUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any;
      const { data, error } = await supabase.storage
        .from('alert-audio')
        .upload(filePath, file, { contentType: 'audio/m4a', upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('alert-audio').getPublicUrl(filePath);
      const publicUrl = pub?.publicUrl ?? null;
      if (publicUrl) {
        await this.updateAlert(alertId, { audio_url: publicUrl } as any);
      }
      return publicUrl;
    } catch (e) {
      console.error('❌ Upload audio failed', e);
      return null;
    }
  }

  // Alert response operations
  static async createAlertResponse(response: Omit<DatabaseAlertResponse, 'created_at'>): Promise<DatabaseAlertResponse> {
    try {
      const { data, error } = await supabase
        .from('alert_responses')
        .insert({
          ...response,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as DatabaseAlertResponse;
    } catch (error) {
      console.error('❌ Error creating alert response:', error);
      throw error;
    }
  }

  static async getAlertResponses(alertId: string): Promise<DatabaseAlertResponse[]> {
    try {
      const { data, error } = await supabase
        .from('alert_responses')
        .select('*')
        .eq('alert_id', alertId)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      return (data as DatabaseAlertResponse[]) ?? [];
    } catch (error) {
      console.error('❌ Error getting alert responses:', error);
      throw error;
    }
  }

  // Real-time subscriptions via Supabase
  private static alertsChannel: ReturnType<typeof supabase.channel> | null = null;
  private static responsesChannel: ReturnType<typeof supabase.channel> | null = null;
  private static alertSubscribers: Array<(alert: DatabaseAlert) => void> = [];
  private static responseSubscribers: Array<(response: DatabaseAlertResponse) => void> = [];

  private static ensureAlertChannel() {
    if (this.alertsChannel) return;
    this.alertsChannel = supabase.channel('alerts-changes');
    this.alertsChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        const newRecord = payload.new as DatabaseAlert;
        if (!newRecord) return;
        this.alertSubscribers.forEach((cb) => {
          try { cb(newRecord); } catch (e) { console.error(e); }
        });
      })
      .subscribe();
  }

  private static ensureResponseChannel() {
    if (this.responsesChannel) return;
    this.responsesChannel = supabase.channel('alert-responses-changes');
    this.responsesChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_responses' }, (payload) => {
        const newRecord = payload.new as DatabaseAlertResponse;
        if (!newRecord) return;
        this.responseSubscribers.forEach((cb) => {
          try { cb(newRecord); } catch (e) { console.error(e); }
        });
      })
      .subscribe();
  }

  static subscribeToAlerts(callback: (alert: DatabaseAlert) => void): () => void {
    this.alertSubscribers.push(callback);
    this.ensureAlertChannel();
    return () => {
      const idx = this.alertSubscribers.indexOf(callback);
      if (idx >= 0) this.alertSubscribers.splice(idx, 1);
      if (this.alertSubscribers.length === 0 && this.alertsChannel) {
        supabase.removeChannel(this.alertsChannel);
        this.alertsChannel = null;
      }
    };
  }

  static subscribeToAlertResponses(callback: (response: DatabaseAlertResponse) => void): () => void {
    this.responseSubscribers.push(callback);
    this.ensureResponseChannel();
    return () => {
      const idx = this.responseSubscribers.indexOf(callback);
      if (idx >= 0) this.responseSubscribers.splice(idx, 1);
      if (this.responseSubscribers.length === 0 && this.responsesChannel) {
        supabase.removeChannel(this.responsesChannel);
        this.responsesChannel = null;
      }
    };
  }

  // Authentication helpers
  static async authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
    try {
      // Placeholder: Use Supabase Auth in auth-store instead. Here, we simply lookup profile by email.
      const user = await this.getUserByEmail(email);
      return user;
    } catch (error) {
      console.error('❌ Error authenticating user:', error);
      throw error;
    }
  }
}
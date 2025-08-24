import { supabase, DatabaseUser, DatabaseAlert, DatabaseAlertResponse, DatabaseJourney, DatabaseJourneyLocation } from '@/constants/supabase';
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
      // Ensure row-level security passes: user_id must equal auth.uid()
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const authedUserId = authData.user?.id;
      if (!authedUserId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          ...alert,
          user_id: authedUserId,
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
      const res = await fetch(localUri);
      const blob = await res.blob();
      const { data, error } = await supabase.storage
        .from('alert-audio')
        .upload(filePath, blob, { contentType: 'audio/m4a', upsert: true });
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

  // Journey sharing
  static async createJourney(payload: Omit<DatabaseJourney, 'id' | 'started_at' | 'ended_at' | 'is_active'>): Promise<DatabaseJourney> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('journeys')
        .insert({
          user_id: payload.user_id,
          destination_name: payload.destination_name,
          dest_lat: payload.dest_lat,
          dest_lon: payload.dest_lon,
          transport: payload.transport,
          started_at: now,
          is_active: true,
          share_token: payload.share_token,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as DatabaseJourney;
    } catch (e) {
      console.error('❌ Error creating journey:', e);
      throw e;
    }
  }

  static async endJourney(journeyId: string): Promise<DatabaseJourney | null> {
    try {
      const { data, error } = await supabase
        .from('journeys')
        .update({ ended_at: new Date().toISOString(), is_active: false })
        .eq('id', journeyId)
        .select('*')
        .single();
      if (error) throw error;
      return data as DatabaseJourney;
    } catch (e) {
      console.error('❌ Error ending journey:', e);
      throw e;
    }
  }

  static async addJourneyLocation(journeyId: string, lat: number, lon: number, speed?: number | null): Promise<DatabaseJourneyLocation | null> {
    try {
      const { data, error } = await supabase
        .from('journey_locations')
        .insert({ journey_id: journeyId, lat, lon, speed: speed ?? null })
        .select('*')
        .single();
      if (error) throw error;
      return data as DatabaseJourneyLocation;
    } catch (e) {
      console.error('❌ Error adding journey location:', e);
      return null;
    }
  }

  static async fetchJourneyFeed(token: string): Promise<{ journey: DatabaseJourney | null; points: DatabaseJourneyLocation[] }>
  {
    try {
      const { data, error } = await supabase.rpc('get_journey_feed', { token });
      if (error) throw error;
      const rows = (data as any[]) || [];
      if (rows.length === 0) return { journey: null, points: [] };
      const head = rows[0];
      const journey: DatabaseJourney = {
        id: head.journey_id,
        user_id: '', // not returned by RPC to anon; omit
        destination_name: head.destination_name,
        dest_lat: head.dest_lat,
        dest_lon: head.dest_lon,
        transport: head.transport,
        started_at: head.started_at,
        ended_at: head.ended_at,
        is_active: head.is_active,
        share_token: token,
      } as any;
      const points: DatabaseJourneyLocation[] = rows.filter(r => r.point_time).map(r => ({
        id: 0,
        journey_id: head.journey_id,
        ts: r.point_time,
        lat: r.lat,
        lon: r.lon,
        speed: r.speed,
      }));
      return { journey, points };
    } catch (e) {
      console.error('❌ Error fetching journey feed:', e);
      return { journey: null, points: [] };
    }
  }
}
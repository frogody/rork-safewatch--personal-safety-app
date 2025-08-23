import { supabase, DatabaseUser, DatabaseAlert, DatabaseAlertResponse } from '@/constants/supabase';

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

  static subscribeToAlerts(callback: (alert: DatabaseAlert) => void): () => void {
    if (!this.alertsChannel) {
      this.alertsChannel = supabase.channel('alerts-changes');
      this.alertsChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
          const newRecord = payload.new as DatabaseAlert;
          if (newRecord) {
            callback(newRecord);
          }
        })
        .subscribe();
    }

    // Return unsubscribe that unsubscribes the channel if no other listeners are required
    return () => {
      if (this.alertsChannel) {
        supabase.removeChannel(this.alertsChannel);
        this.alertsChannel = null;
      }
    };
  }

  static subscribeToAlertResponses(callback: (response: DatabaseAlertResponse) => void): () => void {
    if (!this.responsesChannel) {
      this.responsesChannel = supabase.channel('alert-responses-changes');
      this.responsesChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_responses' }, (payload) => {
          const newRecord = payload.new as DatabaseAlertResponse;
          if (newRecord) {
            callback(newRecord);
          }
        })
        .subscribe();
    }

    return () => {
      if (this.responsesChannel) {
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
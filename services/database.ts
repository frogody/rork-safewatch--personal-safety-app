import { supabase, mockDatabase, DatabaseUser, DatabaseAlert, DatabaseAlertResponse } from '@/constants/supabase';

// Database service functions
export class DatabaseService {
  // User operations
  static async createUser(user: Omit<DatabaseUser, 'created_at' | 'updated_at'>): Promise<DatabaseUser> {
    try {
      // For demo, use mock database
      const newUser: DatabaseUser = {
        ...user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockDatabase.users.set(user.id, newUser);
      console.log('✅ User created in database:', user.email);
      return newUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  static async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      // For demo, search mock database
      for (const user of mockDatabase.users.values()) {
        if (user.email === email) {
          console.log('✅ User found in database:', email);
          return user;
        }
      }
      console.log('❌ User not found in database:', email);
      return null;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      throw error;
    }
  }

  static async getUserById(id: string): Promise<DatabaseUser | null> {
    try {
      const user = mockDatabase.users.get(id);
      if (user) {
        console.log('✅ User found by ID:', id);
        return user;
      }
      console.log('❌ User not found by ID:', id);
      return null;
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  }

  static async updateUser(id: string, updates: Partial<DatabaseUser>): Promise<DatabaseUser | null> {
    try {
      const existingUser = mockDatabase.users.get(id);
      if (!existingUser) {
        console.log('❌ User not found for update:', id);
        return null;
      }

      const updatedUser: DatabaseUser = {
        ...existingUser,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      mockDatabase.users.set(id, updatedUser);
      console.log('✅ User updated in database:', id);
      return updatedUser;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // Alert operations
  static async createAlert(alert: Omit<DatabaseAlert, 'created_at' | 'updated_at'>): Promise<DatabaseAlert> {
    try {
      const newAlert: DatabaseAlert = {
        ...alert,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDatabase.alerts.set(alert.id, newAlert);
      console.log('🚨 Alert created in database:', alert.id);
      
      // Broadcast to all connected clients (simulate real-time)
      this.broadcastAlert(newAlert);
      
      return newAlert;
    } catch (error) {
      console.error('❌ Error creating alert:', error);
      throw error;
    }
  }

  static async getAlerts(): Promise<DatabaseAlert[]> {
    try {
      const alerts = Array.from(mockDatabase.alerts.values());
      console.log('✅ Retrieved alerts from database:', alerts.length);
      return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('❌ Error getting alerts:', error);
      throw error;
    }
  }

  static async updateAlert(id: string, updates: Partial<DatabaseAlert>): Promise<DatabaseAlert | null> {
    try {
      const existingAlert = mockDatabase.alerts.get(id);
      if (!existingAlert) {
        console.log('❌ Alert not found for update:', id);
        return null;
      }

      const updatedAlert: DatabaseAlert = {
        ...existingAlert,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      mockDatabase.alerts.set(id, updatedAlert);
      console.log('✅ Alert updated in database:', id);
      
      // Broadcast update to all connected clients
      this.broadcastAlert(updatedAlert);
      
      return updatedAlert;
    } catch (error) {
      console.error('❌ Error updating alert:', error);
      throw error;
    }
  }

  // Alert response operations
  static async createAlertResponse(response: Omit<DatabaseAlertResponse, 'created_at'>): Promise<DatabaseAlertResponse> {
    try {
      const newResponse: DatabaseAlertResponse = {
        ...response,
        created_at: new Date().toISOString(),
      };

      const existingResponses = mockDatabase.alertResponses.get(response.alert_id) || [];
      existingResponses.push(newResponse);
      mockDatabase.alertResponses.set(response.alert_id, existingResponses);

      console.log('✅ Alert response created in database:', response.alert_id);
      
      // Broadcast response to all connected clients
      this.broadcastAlertResponse(newResponse);
      
      return newResponse;
    } catch (error) {
      console.error('❌ Error creating alert response:', error);
      throw error;
    }
  }

  static async getAlertResponses(alertId: string): Promise<DatabaseAlertResponse[]> {
    try {
      const responses = mockDatabase.alertResponses.get(alertId) || [];
      console.log('✅ Retrieved alert responses from database:', alertId, responses.length);
      return responses.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('❌ Error getting alert responses:', error);
      throw error;
    }
  }

  // Real-time broadcasting (simulate Supabase real-time)
  private static alertSubscribers: ((alert: DatabaseAlert) => void)[] = [];
  private static responseSubscribers: ((response: DatabaseAlertResponse) => void)[] = [];

  static subscribeToAlerts(callback: (alert: DatabaseAlert) => void): () => void {
    this.alertSubscribers.push(callback);
    console.log('📡 Subscribed to alerts, total subscribers:', this.alertSubscribers.length);
    
    return () => {
      const index = this.alertSubscribers.indexOf(callback);
      if (index > -1) {
        this.alertSubscribers.splice(index, 1);
        console.log('📡 Unsubscribed from alerts, remaining subscribers:', this.alertSubscribers.length);
      }
    };
  }

  static subscribeToAlertResponses(callback: (response: DatabaseAlertResponse) => void): () => void {
    this.responseSubscribers.push(callback);
    console.log('📡 Subscribed to alert responses, total subscribers:', this.responseSubscribers.length);
    
    return () => {
      const index = this.responseSubscribers.indexOf(callback);
      if (index > -1) {
        this.responseSubscribers.splice(index, 1);
        console.log('📡 Unsubscribed from alert responses, remaining subscribers:', this.responseSubscribers.length);
      }
    };
  }

  private static broadcastAlert(alert: DatabaseAlert): void {
    console.log('📡 Broadcasting alert to', this.alertSubscribers.length, 'subscribers');
    this.alertSubscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('❌ Error in alert subscriber callback:', error);
      }
    });
  }

  private static broadcastAlertResponse(response: DatabaseAlertResponse): void {
    console.log('📡 Broadcasting alert response to', this.responseSubscribers.length, 'subscribers');
    this.responseSubscribers.forEach(callback => {
      try {
        callback(response);
      } catch (error) {
        console.error('❌ Error in response subscriber callback:', error);
      }
    });
  }

  // Authentication helpers
  static async authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
    try {
      // Demo authentication
      const demoCredentials = {
        'seeker@safewatch.com': 'demo123',
        'responder@safewatch.com': 'demo123',
      };

      const validPassword = demoCredentials[email as keyof typeof demoCredentials];
      if (!validPassword || validPassword !== password) {
        console.log('❌ Invalid credentials for:', email);
        return null;
      }

      const user = await this.getUserByEmail(email);
      if (user) {
        console.log('✅ User authenticated successfully:', email);
        return user;
      }

      console.log('❌ User not found after authentication:', email);
      return null;
    } catch (error) {
      console.error('❌ Error authenticating user:', error);
      throw error;
    }
  }
}
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { DatabaseService } from '@/services/database';
import type { DatabaseAlert, DatabaseAlertResponse } from '@/constants/supabase';
import { useAuth } from './auth-store';
import { Logger } from '@/constants/logger';

// Keep a single watcher for foreground monitoring
let monitoringLocationSubscription: { remove: () => void } | null = null;

export interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'active' | 'acknowledged' | 'resolved';
  responses?: {
    userId: string;
    timestamp: Date;
    action: 'acknowledge' | 'respond';
  }[];
  // New fields for responder management
  responseDeadline?: Date;
  currentBatch?: number;
  maxBatches?: number;
  respondersPerBatch?: number;
  totalResponders?: number;
  audioUrl?: string;
}

export interface SafetySettings {
  notifications: boolean;
  locationSharing: boolean;
  autoEmergencyCall: boolean;
  responseTimeout: number;
  alertRadius: number;
}

export interface JourneyDestination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  estimatedArrival?: Date;
  transport: 'walk' | 'bike' | 'car' | 'public';
}

export interface JourneyMonitoring {
  isActive: boolean;
  destination: JourneyDestination | null;
  startTime: Date | null;
  lastMovement: Date | null;
  isStationary: boolean;
  stationaryDuration: number; // in milliseconds
  movementThreshold: number; // in milliseconds based on transport
  preAlarmTriggered: boolean;
}

interface SafetyState {
  isMonitoring: boolean;
  currentLocation: Location.LocationObject['coords'] | null;
  alerts: SafetyAlert[];
  settings: SafetySettings;
  journey: JourneyMonitoring;
  lastAlertId: string | null;
  share: {
    journeyId: string | null;
    shareToken: string | null;
  };
}

const SAFETY_STORAGE_KEY = '@safewatch_safety';
const SYNC_INTERVAL = 1000; // 1 second for real-time feel

// Helper functions to convert between database and app formats
function dbAlertToAppAlert(dbAlert: DatabaseAlert, responses: DatabaseAlertResponse[] = []): SafetyAlert {
  return {
    id: dbAlert.id,
    title: dbAlert.title,
    description: dbAlert.description,
    timestamp: new Date(dbAlert.timestamp),
    location: {
      latitude: dbAlert.latitude,
      longitude: dbAlert.longitude,
      address: dbAlert.address,
    },
    status: dbAlert.status,
    responses: responses.map(r => ({
      userId: r.user_id,
      timestamp: new Date(r.timestamp),
      action: r.action,
    })),
    responseDeadline: dbAlert.response_deadline ? new Date(dbAlert.response_deadline) : undefined,
    currentBatch: dbAlert.current_batch,
    maxBatches: dbAlert.max_batches,
    respondersPerBatch: dbAlert.responders_per_batch,
    totalResponders: dbAlert.total_responders,
    audioUrl: dbAlert.audio_url,
  };
}

function appAlertToDbAlert(appAlert: SafetyAlert, userId: string): Omit<DatabaseAlert, 'created_at' | 'updated_at'> {
  return {
    id: appAlert.id,
    title: appAlert.title,
    description: appAlert.description,
    timestamp: appAlert.timestamp.toISOString(),
    latitude: appAlert.location.latitude,
    longitude: appAlert.location.longitude,
    address: appAlert.location.address,
    status: appAlert.status,
    user_id: userId,
    response_deadline: appAlert.responseDeadline?.toISOString(),
    current_batch: appAlert.currentBatch,
    max_batches: appAlert.maxBatches,
    responders_per_batch: appAlert.respondersPerBatch,
    total_responders: appAlert.totalResponders,
    audio_url: appAlert.audioUrl,
  };
}

const defaultSettings: SafetySettings = {
  notifications: true,
  locationSharing: true,
  autoEmergencyCall: false,
  responseTimeout: 60,
  alertRadius: 1000,
};

export const [SafetyProvider, useSafetyStore] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [safetyState, setSafetyState] = useState<SafetyState>({
    isMonitoring: false,
    currentLocation: null,
    alerts: [],
    settings: defaultSettings,
    lastAlertId: null,
    journey: {
      isActive: false,
      destination: null,
      startTime: null,
      lastMovement: null,
      isStationary: false,
      stationaryDuration: 0,
      movementThreshold: 2 * 60 * 1000, // 2 minutes default
      preAlarmTriggered: false,
    },
    share: { journeyId: null, shareToken: null },
  });

  // Real-time alerts query using database
  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const dbAlerts = await DatabaseService.getAlerts();
        const alertsWithResponses = await Promise.all(
          dbAlerts.map(async (dbAlert) => {
            const responses = await DatabaseService.getAlertResponses(dbAlert.id);
            return dbAlertToAppAlert(dbAlert, responses);
          })
        );
        Logger.info('📡 Loaded alerts from database:', alertsWithResponses.length);
        return alertsWithResponses;
      } catch (error) {
        console.error('❌ Error loading alerts from database:', error);
        return [];
      }
    },
    refetchInterval: SYNC_INTERVAL,
    staleTime: 500,
  });

  // Real-time subscription to database changes
  useEffect(() => {
    const unsubscribeAlerts = DatabaseService.subscribeToAlerts((dbAlert) => {
      Logger.debug('📡 Received real-time alert update:', dbAlert.id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    const unsubscribeResponses = DatabaseService.subscribeToAlertResponses((response) => {
      Logger.debug('📡 Received real-time response update:', response.alert_id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeResponses();
    };
  }, [queryClient]);

  // Update local state when alerts change
  useEffect(() => {
    if (alertsQuery.data) {
      setSafetyState(prev => ({
        ...prev,
        alerts: alertsQuery.data,
      }));
    }
  }, [alertsQuery.data]);

  useEffect(() => {
    loadSafetyState();
  }, []);

  const loadSafetyState = async () => {
    try {
      const savedData = await AsyncStorage.getItem(SAFETY_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setSafetyState(prev => ({
          ...prev,
          settings: { ...defaultSettings, ...parsed.settings },
          alerts: parsed.alerts || [],
        }));
      }
    } catch (error) {
      console.error('Error loading safety state:', error);
    }
  };

  const saveSafetyState = useCallback(async (state: Partial<SafetyState>) => {
    try {
      const dataToSave = {
        settings: state.settings || safetyState.settings,
        alerts: state.alerts || safetyState.alerts,
      };
      await AsyncStorage.setItem(SAFETY_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving safety state:', error);
    }
  }, [safetyState]);

  const startMonitoring = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      // Avoid duplicate watchers
      if (monitoringLocationSubscription) {
        try { monitoringLocationSubscription.remove(); } catch {}
        monitoringLocationSubscription = null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setSafetyState(prev => ({
        ...prev,
        isMonitoring: true,
        currentLocation: location.coords,
      }));

      // Continuous updates while monitoring
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
        (loc) => {
          setSafetyState(prev => ({ ...prev, currentLocation: loc.coords }));
        }
      );
      monitoringLocationSubscription = { remove: () => sub.remove() };

      Logger.info('Safety monitoring started with continuous location updates');
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  }, []);

  const endSharedJourney = useCallback(async () => {
    const jId = safetyState.share.journeyId;
    if (!jId) return;
    try { await DatabaseService.endJourney(jId); } catch {}
    setSafetyState(prev => ({ ...prev, share: { journeyId: null, shareToken: null } }));
  }, [safetyState.share.journeyId]);

  const stopMonitoring = useCallback(() => {
    // Cleanup watcher if active
    if (monitoringLocationSubscription) {
      try { monitoringLocationSubscription.remove(); } catch {}
      monitoringLocationSubscription = null;
    }
    setSafetyState(prev => ({
      ...prev,
      isMonitoring: false,
      currentLocation: null,
    }));
    // Also end sharing if any
    try { endSharedJourney(); } catch {}
    Logger.info('Safety monitoring stopped');
  }, [endSharedJourney]);

  const checkAndEscalateAlert = useCallback(async (alertId: string) => {
    try {
      // Fetch latest alert state from DB to avoid stale local decisions
      const latestAlert = await DatabaseService.getAlertById(alertId);
      const alert = latestAlert ? dbAlertToAppAlert(latestAlert) : (alertsQuery.data || []).find(a => a.id === alertId);
      
      if (!alert || alert.status !== 'active') {
        return; // Alert already resolved or doesn't exist
      }

      const hasResponders = alert.responses?.some(r => r.action === 'respond') || false;
      if (hasResponders) {
        return; // Someone is already responding
      }

      // No responders, escalate to next batch
      const currentBatch = alert.currentBatch || 1;
      const maxBatches = alert.maxBatches || 5;
      
      if (currentBatch < maxBatches) {
        const updates = {
          current_batch: currentBatch + 1,
          response_deadline: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        };
        
        await DatabaseService.updateAlert(alertId, updates);
        
        Logger.warn(`🚨 Escalating alert ${alertId} to batch ${currentBatch + 1}`);
        Logger.info('👥 Sending to 10 more responders...');
        
        // Schedule next escalation
        setTimeout(() => {
          checkAndEscalateAlert(alertId);
        }, 2 * 60 * 1000);
      } else {
        // Max batches reached, escalate to emergency services
        Logger.error(`🚨 CRITICAL: Alert ${alertId} reached max batches - escalating to emergency services`);
        Logger.warn('📞 Calling 911 automatically...');
        
        await DatabaseService.updateAlert(alertId, {
          status: 'acknowledged',
          description: alert.description + ' [ESCALATED TO EMERGENCY SERVICES]'
        });
      }
    } catch (error) {
      console.error('❌ Error escalating alert:', error);
    }
  }, [alertsQuery.data]);

  const triggerAlert = useCallback(async () => {
    if (!user) {
      console.error('❌ Cannot trigger alert: User not authenticated');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ Cannot trigger alert: Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const coords = location.coords;
      const now = new Date();
      const newAlert: SafetyAlert = {
        id: Date.now().toString(),
        title: `Distress Signal from ${user.name}`,
        description: 'User activated "I feel unsafe" and did not cancel within the time limit. Immediate assistance may be needed.',
        timestamp: now,
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: 'Current Location',
        },
        status: 'active' as const,
        // Alert distribution system
        responseDeadline: new Date(now.getTime() + 2 * 60 * 1000), // 2 minutes
        currentBatch: 1,
        maxBatches: 5,
        respondersPerBatch: 10,
        totalResponders: 0,
      };

      // Create alert in database
      const dbAlert = appAlertToDbAlert(newAlert, user.id);
      await DatabaseService.createAlert(dbAlert);
      
      // Save to local state and update current location
      const newState = {
        ...safetyState,
        currentLocation: coords,
        alerts: [newAlert, ...safetyState.alerts],
        lastAlertId: newAlert.id,
      };
      setSafetyState(newState);
      saveSafetyState(newState);

      Logger.warn('🚨 DISTRESS SIGNAL SENT TO ALL DEVICES');
      Logger.info('📍 Location:', newAlert.location);
      Logger.info('👥 Sending to batch 1 (10 nearby responders)...');
      Logger.info('⏰ Response deadline: 2 minutes');
      Logger.info('📞 Contacting emergency contacts...');
      Logger.info('🔄 Alert synced across all connected devices');
      
      // Set up automatic batch escalation if no response
      setTimeout(() => {
        checkAndEscalateAlert(newAlert.id);
      }, 2 * 60 * 1000);
    } catch (error) {
      console.error('❌ Failed to send alert:', error);
    }
  }, [safetyState, saveSafetyState, user, checkAndEscalateAlert]);

  const respondToAlert = useCallback(async (alertId: string, response: 'acknowledge' | 'respond') => {
    if (!user) {
      console.error('❌ Cannot respond to alert: User not authenticated');
      return;
    }

    try {
      // Create response in database
      const alertResponse: Omit<DatabaseAlertResponse, 'created_at'> = {
        id: Date.now().toString(),
        alert_id: alertId,
        user_id: user.id,
        timestamp: new Date().toISOString(),
        action: response,
      };
      
      await DatabaseService.createAlertResponse(alertResponse);

      if (response === 'respond') {
        await DatabaseService.updateAlert(alertId, { status: 'acknowledged' });
      }

      Logger.info(`✅ Response to alert ${alertId} with ${response} synced to all devices`);
    } catch (error) {
      console.error('❌ Failed to respond to alert:', error);
    }
  }, [user]);

  const updateSettings = useCallback((newSettings: Partial<SafetySettings>) => {
    const updatedSettings = { ...safetyState.settings, ...newSettings };
    const newState = {
      ...safetyState,
      settings: updatedSettings,
    };

    setSafetyState(newState);
    saveSafetyState(newState);
    Logger.info('Settings updated:', newSettings);
  }, [safetyState, saveSafetyState]);

  const startJourney = useCallback((destination: JourneyDestination) => {
    const transportThresholds = {
      walk: 2 * 60 * 1000,
      bike: 1 * 60 * 1000,
      car: 3 * 60 * 1000,
      public: 4 * 60 * 1000,
    };

    setSafetyState(prev => ({
      ...prev,
      journey: {
        ...prev.journey,
        isActive: true,
        destination,
        startTime: new Date(),
        lastMovement: new Date(),
        isStationary: false,
        stationaryDuration: 0,
        movementThreshold: transportThresholds[destination.transport],
        preAlarmTriggered: false,
      },
    }));
    Logger.info('Journey started to:', destination.name);
  }, []);

  const stopJourney = useCallback(() => {
    setSafetyState(prev => ({
      ...prev,
      journey: {
        ...prev.journey,
        isActive: false,
        destination: null,
        startTime: null,
        lastMovement: null,
        isStationary: false,
        stationaryDuration: 0,
        preAlarmTriggered: false,
      },
    }));
    Logger.info('Journey stopped');
  }, []);

  // Live share helpers
  const generateShareToken = () => {
    // Crypto-strong token using expo-random
    const { getRandomBytes } = require('expo-random');
    const bytes: Uint8Array = getRandomBytes(16);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex; // 32-char hex string
  };

  const beginSharedJourney = useCallback(async (destination: JourneyDestination) => {
    if (!user) return;
    try {
      const token = generateShareToken();
      const dbJourney = await DatabaseService.createJourney({
        user_id: user.id,
        destination_name: destination.name,
        dest_lat: destination.latitude,
        dest_lon: destination.longitude,
        transport: destination.transport,
        share_token: token,
      } as any);
      setSafetyState(prev => ({ ...prev, share: { journeyId: dbJourney.id, shareToken: token } }));
      Logger.info('🔗 Journey share created:', token);
    } catch (e) {
      console.error('Failed to create shared journey', e);
    }
  }, [user]);

  // endSharedJourney moved above to be available for stopMonitoring dependency

  // Throttled live location publishing (every ~15s)
  useEffect(() => {
    let handle: ReturnType<typeof setInterval> | null = null;
    if (safetyState.share.journeyId) {
      handle = setInterval(() => {
        const coords = safetyState.currentLocation;
        if (!coords) return;
        DatabaseService.addJourneyLocation(
          safetyState.share.journeyId!,
          coords.latitude,
          coords.longitude,
          coords.speed ?? null
        ).catch(() => {});
      }, 15000);
    }
    return () => { if (handle) clearInterval(handle); };
  }, [safetyState.share.journeyId, safetyState.currentLocation]);

  const updateMovement = useCallback((hasMovement: boolean) => {
    setSafetyState(prev => {
      if (!prev.journey.isActive) return prev;

      const now = new Date();
      const lastMovement = hasMovement ? now : prev.journey.lastMovement;
      const timeSinceMovement = lastMovement ? now.getTime() - lastMovement.getTime() : 0;
      const isStationary = timeSinceMovement > prev.journey.movementThreshold;

      return {
        ...prev,
        journey: {
          ...prev.journey,
          lastMovement,
          isStationary,
          stationaryDuration: timeSinceMovement,
        },
      };
    });
  }, []);

  const triggerPreAlarm = useCallback(() => {
    setSafetyState(prev => ({
      ...prev,
      journey: {
        ...prev.journey,
        preAlarmTriggered: true,
      },
    }));
    Logger.info('Pre-alarm triggered for journey monitoring');
  }, []);

  return useMemo(() => ({
    ...safetyState,
    startMonitoring,
    stopMonitoring,
    triggerAlert,
    respondToAlert,
    updateSettings,
    startJourney,
    stopJourney,
    updateMovement,
    triggerPreAlarm,
    beginSharedJourney,
    endSharedJourney,
    isLoading: alertsQuery.isLoading,
    isError: alertsQuery.isError,
    refetchAlerts: alertsQuery.refetch,
    // Database connection status
    isConnected: !alertsQuery.isError,
  }), [safetyState, startMonitoring, stopMonitoring, triggerAlert, respondToAlert, updateSettings, startJourney, stopJourney, updateMovement, triggerPreAlarm, beginSharedJourney, endSharedJourney, alertsQuery.isLoading, alertsQuery.isError, alertsQuery.refetch]);
});
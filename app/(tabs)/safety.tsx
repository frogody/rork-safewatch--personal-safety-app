import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, MapPin, Clock, AlertTriangle, Users, X, Phone, HelpCircle, Navigation, Activity, Pause, CheckCircle2, Route, Play } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useSafetyStore } from '@/store/safety-store';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';

const { width } = Dimensions.get('window');

export default function SafetyScreen() {
  const { user } = useAuth();
  const {
    isMonitoring,
    currentLocation,
    journey,
    startMonitoring,
    stopMonitoring,
    triggerAlert,
    startJourney,
    stopJourney,
    updateMovement,
    simulateStationaryForDemo,
  } = useSafetyStore();
  
  // Prevent responders from accessing this screen
  if (user?.userType === 'responder') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Shield color={Colors.textMuted} size={64} />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>
            Safety monitoring features are only available for Safety Seekers. 
            As a Responder, you can help others through the Alerts and Community tabs.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/alerts')}
          >
            <Text style={styles.backButtonText}>Go to Alerts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPreAlarm, setIsPreAlarm] = useState<boolean>(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const journeySimulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkLocationPermission();
    setupAudio();
    
    return () => {
      cleanupAudio();
      if (journeySimulationRef.current) {
        clearInterval(journeySimulationRef.current);
      }
    };
  }, []);

  // Simulate journey monitoring updates
  useEffect(() => {
    if (journey.isActive && journey.isStationary) {
      journeySimulationRef.current = setInterval(() => {
        updateMovement(false); // Keep updating stationary duration
      }, 1000);
    } else {
      if (journeySimulationRef.current) {
        clearInterval(journeySimulationRef.current);
        journeySimulationRef.current = null;
      }
    }
    
    return () => {
      if (journeySimulationRef.current) {
        clearInterval(journeySimulationRef.current);
      }
    };
  }, [journey.isActive, journey.isStationary, updateMovement]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log('Audio setup error:', error);
    }
  };

  const cleanupAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (error) {
      console.log('Audio cleanup error:', error);
    }
  };

  const playAlarmSound = async () => {
    try {
      // Stop any existing sound
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      // Use system beep sound for pre-alarm
      console.log('🔊 Pre-alarm sound started (using system beep)');
      
      // For web and mobile, use vibration as primary alert
      if (Platform.OS !== 'web') {
        // Create a repeating vibration pattern
        Vibration.vibrate([0, 500, 200, 500], true);
      }
      
      // Skip audio file loading for now
      const sound = null;
      
      soundRef.current = sound;

    } catch (error) {
      console.log('Error playing alarm sound:', error);
      // Fallback to system beep if audio fails
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 200, 100, 200], true);
      }
    }
  };

  const stopAlarmSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        console.log('🔇 Pre-alarm sound stopped');
      }
    } catch (error) {
      console.log('Error stopping alarm sound:', error);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (countdown !== null && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          
          if (prev === 16) {
            // Start pre-alarm phase
            setIsPreAlarm(true);
            console.log('🚨 Pre-alarm phase started - playing alarm sound');
            
            // Start audio alarm
            playAlarmSound();
            
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              // Start vibration pattern for pre-alarm
              Vibration.vibrate([0, 500, 200, 500], true);
            }
          }
          
          if (prev <= 1) {
            // Timer reached zero - will trigger distress signal
            return 0;
          }
          
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      stopAlarmSound();
    };
  }, [countdown]);

  // Separate effect to handle distress signal when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      handleDistressSignal();
    }
  }, [countdown]);

  const checkLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const handleSafetyToggle = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }

    if (!locationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to use safety monitoring.',
        [{ text: 'OK', onPress: checkLocationPermission }]
      );
      return;
    }

    if (isMonitoring) {
      stopMonitoring();
      setCountdown(null);
    } else {
      startMonitoring();
    }
  };

  const handleUnsafeButton = () => {
    console.log('🚨 "I Feel Unsafe" button pressed');
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    // Start timer immediately without confirmation dialog
    console.log('⏱️ Starting 60-second countdown timer');
    setCountdown(60);
    setIsPreAlarm(false);
  };

  const handleDistressSignal = () => {
    if (Platform.OS !== 'web') {
      Vibration.cancel();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Stop alarm sound
    stopAlarmSound();
    
    triggerAlert();
    setCountdown(null);
    setIsPreAlarm(false);
    
    Alert.alert(
      'Distress Signal Sent',
      'Your distress signal has been sent to nearby SafeWatch users and emergency contacts.',
      [{ text: 'OK' }]
    );
  };

  const cancelCountdown = () => {
    setCountdown(null);
    setIsPreAlarm(false);
    
    // Stop alarm sound and vibration
    stopAlarmSound();
    
    if (Platform.OS !== 'web') {
      Vibration.cancel();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    console.log('⏹️ Safety timer cancelled by user');
  };

  const resetTimer = () => {
    console.log('🔄 Timer reset by user');
    
    // Stop current alarm sound and vibration
    stopAlarmSound();
    
    setCountdown(60);
    setIsPreAlarm(false);
    
    if (Platform.OS !== 'web') {
      Vibration.cancel();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  if (countdown !== null) {
    const isInPreAlarm = countdown <= 15;
    const phase = isInPreAlarm ? 'PRE-ALARM' : 'COUNTDOWN';
    const phaseColor = isInPreAlarm ? Colors.error : Colors.yellow;
    const bgColors: [string, string] = isInPreAlarm ? [Colors.background, Colors.surface] : [Colors.background, Colors.surface];
    
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={bgColors}
          style={styles.countdownContainer}
        >
          <View style={styles.countdownContent}>
            <View style={styles.phaseIndicator}>
              <Text style={[styles.phaseText, { color: phaseColor }]}>{phase}</Text>
            </View>
            
            <Text style={styles.countdownTitle}>
              {isInPreAlarm ? 'Final Warning!' : 'Safety Timer Active'}
            </Text>
            <Text style={styles.countdownSubtitle}>
              {isInPreAlarm 
                ? 'Distress signal will be sent in:' 
                : 'Pre-alarm will start in:'}
            </Text>
            
            <View style={[styles.countdownCircle, { backgroundColor: isInPreAlarm ? Colors.error : Colors.yellow }]}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              {isInPreAlarm && (
                <AlertTriangle 
                  color={Colors.text} 
                  size={24} 
                  style={styles.warningIcon}
                />
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.cancelButton, isInPreAlarm && styles.largeCancelButton]}
              onPress={cancelCountdown}
            >
              <X color={isInPreAlarm ? Colors.black : Colors.black} size={isInPreAlarm ? 32 : 20} />
              <Text style={[
                styles.cancelButtonText,
                isInPreAlarm && styles.urgentCancelText
              ]}>
                {isInPreAlarm ? 'CANCEL NOW' : 'Cancel Timer'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resetTimerButton}
              onPress={resetTimer}
            >
              <Clock color={Colors.black} size={32} />
              <Text style={styles.resetTimerButtonText}>Reset Timer</Text>
            </TouchableOpacity>
            
            <Text style={styles.countdownInfo}>
              {isInPreAlarm 
                ? 'Your distress signal will alert nearby users and emergency contacts'
                : 'You have 15 seconds to cancel once the pre-alarm starts'}
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SafeWatch</Text>
        <Text style={styles.headerSubtitle}>Your personal safety network</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Shield 
            color={isMonitoring ? Colors.yellow : Colors.textMuted} 
            size={24} 
          />
          <Text style={[
            styles.statusText,
            { color: isMonitoring ? Colors.yellow : Colors.textMuted }
          ]}>
            {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
          </Text>
        </View>
        
        {currentLocation && (
          <View style={styles.locationInfo}>
            <MapPin color={Colors.textMuted} size={16} />
            <Text style={styles.locationText}>
              Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {journey.isActive && journey.destination ? (
        <View style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <Navigation color={Colors.yellow} size={20} />
            <Text style={styles.journeyTitle}>Journey Monitoring</Text>
            <View style={[
              styles.journeyStatusBadge,
              { backgroundColor: journey.isStationary ? Colors.error : Colors.success }
            ]}>
              <Text style={styles.journeyStatusText}>
                {journey.isStationary ? 'STATIONARY' : 'MOVING'}
              </Text>
            </View>
          </View>
          
          <View style={styles.destinationInfo}>
            <Route color={Colors.textMuted} size={16} />
            <Text style={styles.destinationText} numberOfLines={2}>
              To: {journey.destination.name}
            </Text>
          </View>
          
          <View style={styles.journeyStats}>
            <View style={styles.journeyStat}>
              <Clock color={Colors.textMuted} size={16} />
              <Text style={styles.journeyStatLabel}>Started</Text>
              <Text style={styles.journeyStatValue}>
                {journey.startTime ? new Date(journey.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </Text>
            </View>
            
            <View style={styles.journeyStat}>
              {journey.isStationary ? (
                <Pause color={Colors.error} size={16} />
              ) : (
                <Activity color={Colors.success} size={16} />
              )}
              <Text style={styles.journeyStatLabel}>Movement</Text>
              <Text style={[
                styles.journeyStatValue,
                { color: journey.isStationary ? Colors.error : Colors.success }
              ]}>
                {journey.isStationary 
                  ? `Still ${Math.floor(journey.stationaryDuration / 60000)}m`
                  : 'Active'
                }
              </Text>
            </View>
            
            <View style={styles.journeyStat}>
              <Shield color={Colors.textMuted} size={16} />
              <Text style={styles.journeyStatLabel}>Threshold</Text>
              <Text style={styles.journeyStatValue}>
                {Math.floor(journey.movementThreshold / 60000)}min
              </Text>
            </View>
          </View>
          
          {journey.isStationary && (
            <View style={styles.stationaryWarning}>
              <AlertTriangle color={Colors.error} size={18} />
              <View style={styles.stationaryWarningText}>
                <Text style={styles.stationaryWarningTitle}>No Movement Detected</Text>
                <Text style={styles.stationaryWarningSubtitle}>
                  You've been stationary for {Math.floor(journey.stationaryDuration / 60000)} minutes. 
                  {journey.preAlarmTriggered 
                    ? ' Pre-alarm has been triggered.' 
                    : ` Pre-alarm will trigger if you remain still for ${Math.floor((journey.movementThreshold - journey.stationaryDuration) / 60000)} more minutes.`
                  }
                </Text>
              </View>
            </View>
          )}
          
          {!journey.isStationary && journey.lastMovement && (
            <View style={styles.movementConfirmation}>
              <CheckCircle2 color={Colors.success} size={18} />
              <Text style={styles.movementConfirmationText}>
                Movement detected at {new Date(journey.lastMovement).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. 
                Monitoring continues normally.
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.stopJourneyButton}
            onPress={() => {
              stopJourney();
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <X color={Colors.text} size={16} />
            <Text style={styles.stopJourneyButtonText}>Stop Journey Monitoring</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.journeyPromptCard}>
          <View style={styles.journeyPromptHeader}>
            <Navigation color={Colors.textMuted} size={20} />
            <Text style={styles.journeyPromptTitle}>Journey Monitoring</Text>
          </View>
          <Text style={styles.journeyPromptSubtitle}>
            Set a destination in the Map tab to enable automatic monitoring for unexpected stops during your journey.
          </Text>
          <TouchableOpacity
            style={styles.demoJourneyButton}
            onPress={() => {
              // Demo journey to show functionality
              const demoDestination = {
                id: 'demo-1',
                name: 'Downtown Coffee Shop',
                address: '123 Main St, San Francisco, CA',
                latitude: 37.7849,
                longitude: -122.4094,
                transport: 'walk' as const,
              };
              startJourney(demoDestination);
              
              // Simulate being stationary after 3 seconds for demo
              setTimeout(() => {
                simulateStationaryForDemo();
              }, 3000);
              
              // Add button to simulate movement for demo
              Alert.alert(
                'Demo Journey Started',
                'Journey monitoring is now active. The app will simulate being stationary after 3 seconds to show the monitoring features.',
                [
                  { text: 'OK' },
                  {
                    text: 'Simulate Movement',
                    onPress: () => {
                      updateMovement(true);
                      setTimeout(() => updateMovement(false), 2000);
                    }
                  }
                ]
              );
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
          >
            <Play color={Colors.black} size={16} />
            <Text style={styles.demoJourneyButtonText}>Try Demo Journey</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainActions}>
        <TouchableOpacity
          style={styles.safetyButton}
          onPress={handleSafetyToggle}
        >
          <LinearGradient
            colors={isMonitoring ? [Colors.error, '#D32F2F'] : [Colors.yellow, Colors.darkYellow]}
            style={styles.safetyButtonGradient}
          >
            <Shield color={Colors.black} size={32} />
            <Text style={styles.safetyButtonText}>
              {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.unsafeButton}
          onPress={handleUnsafeButton}
        >
          <LinearGradient
            colors={[Colors.error, '#B71C1C']}
            style={styles.unsafeButtonGradient}
          >
            <AlertTriangle color={Colors.text} size={24} />
            <Text style={styles.unsafeButtonText}>I Feel Unsafe</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionCard}
          onPress={() => router.push('/emergency-contacts')}
        >
          <Phone color={Colors.yellow} size={24} />
          <Text style={styles.quickActionTitle}>Emergency Contacts</Text>
          <Text style={styles.quickActionSubtitle}>Manage trusted contacts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionCard}
          onPress={() => router.push('/tutorial')}
        >
          <HelpCircle color={Colors.yellow} size={24} />
          <Text style={styles.quickActionTitle}>How it Works</Text>
          <Text style={styles.quickActionSubtitle}>Learn safety features</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Clock color={Colors.textMuted} size={20} />
          <Text style={styles.statNumber}>24/7</Text>
          <Text style={styles.statLabel}>Monitoring</Text>
        </View>
        
        <View style={styles.statCard}>
          <Users color={Colors.textMuted} size={20} />
          <Text style={styles.statNumber}>1.2K</Text>
          <Text style={styles.statLabel}>Nearby Users</Text>
        </View>
        
        <View style={styles.statCard}>
          <Shield color={Colors.textMuted} size={20} />
          <Text style={styles.statNumber}>99.9%</Text>
          <Text style={styles.statLabel}>Uptime</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  statusCard: {
    backgroundColor: Colors.card,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: Colors.text,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  mainActions: {
    padding: 20,
    gap: 16,
  },
  safetyButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  safetyButtonGradient: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  safetyButtonText: {
    color: Colors.black,
    fontSize: 20,
    fontWeight: 'bold',
  },
  unsafeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  unsafeButtonGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  unsafeButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.yellow,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  countdownContainer: {
    flex: 1,
  },
  countdownContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  countdownTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  countdownSubtitle: {
    fontSize: 18,
    color: Colors.textMuted,
    marginBottom: 40,
  },
  countdownCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 3,
    borderColor: Colors.yellow,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: Colors.black,
  },
  phaseIndicator: {
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.yellow,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  warningIcon: {
    position: 'absolute',
    bottom: 20,
  },
  cancelButton: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  largeCancelButton: {
    width: width * 0.8,
    height: 120,
    backgroundColor: Colors.yellow,
    borderWidth: 3,
    borderColor: Colors.darkYellow,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 30,
    marginBottom: 24,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
  },
  urgentCancelText: {
    color: Colors.black,
    fontSize: 24,
    fontWeight: 'bold',
  },
  countdownInfo: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetTimerButton: {
    width: width * 0.7,
    height: 180,
    backgroundColor: Colors.yellow,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.darkYellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  resetTimerButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  journeyCard: {
    backgroundColor: Colors.card,
    margin: 20,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  journeyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  journeyStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  destinationText: {
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  journeyStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  journeyStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  journeyStatLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  journeyStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  stationaryWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.error + '15',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  stationaryWarningText: {
    flex: 1,
  },
  stationaryWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 4,
  },
  stationaryWarningSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  movementConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success + '15',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  movementConfirmationText: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  journeyPromptCard: {
    backgroundColor: Colors.card,
    margin: 20,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  journeyPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  journeyPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  journeyPromptSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  demoJourneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.yellow,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  demoJourneyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  stopJourneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  stopJourneyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
  },
});
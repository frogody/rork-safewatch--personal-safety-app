import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Navigation,
  User,
  Timer,
  Play,
  Square,
  Bike,
  Car,
  TramFront,
  Footprints,
  Route,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useSafetyStore } from '@/store/safety-store';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';

// Web-compatible map components
interface MapViewProps {
  ref?: any;
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  children?: React.ReactNode;
}

interface MarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

interface CircleProps {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

// Create fallback components
const createFallbackMapView = (message: string) => React.forwardRef<any, MapViewProps>(({ children, style, ...props }, ref) => {
  React.useImperativeHandle(ref, () => ({
    animateToRegion: () => {}
  }));
  
  return (
    <View style={[{ 
      backgroundColor: Colors.card, 
      justifyContent: 'center', 
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border
    }, style]}>
      <MapPin color={Colors.yellow} size={32} />
      <Text style={{ color: Colors.text, fontSize: 16, marginTop: 8 }}>Interactive Map</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>{message}</Text>
      {children}
    </View>
  );
});

const FallbackMarker: React.FC<MarkerProps> = ({ children, ...props }) => <View>{children}</View>;
const FallbackCircle: React.FC<CircleProps> = ({ ...props }) => <View />;

// Platform-specific map components - use real maps on mobile, fallback on web
let MapView: React.ComponentType<MapViewProps>;
let Marker: React.ComponentType<MarkerProps>;
let Circle: React.ComponentType<CircleProps>;

if (Platform.OS === 'web') {
  // Use fallback components on web to avoid bundling issues
  MapView = createFallbackMapView('Interactive map available on mobile devices');
  Marker = FallbackMarker;
  Circle = FallbackCircle;
} else {
  // Use real react-native-maps on mobile - direct import for better reliability
  try {
    const RNMaps = require('react-native-maps');
    console.log('react-native-maps loaded successfully on mobile');
    MapView = RNMaps.default || RNMaps.MapView || RNMaps;
    Marker = RNMaps.Marker;
    Circle = RNMaps.Circle;
    
    // Verify components are available
    if (!MapView || !Marker || !Circle) {
      console.warn('Some react-native-maps components are missing:', { MapView: !!MapView, Marker: !!Marker, Circle: !!Circle });
      throw new Error('Missing components');
    }
  } catch (error) {
    console.error('Failed to load react-native-maps on mobile:', error);
    MapView = createFallbackMapView('Map loading failed');
    Marker = FallbackMarker;
    Circle = FallbackCircle;
  }
}

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { user } = useAuth();
  const { respondToAlert, triggerAlert, alerts } = useSafetyStore();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject['coords'] | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<typeof alerts[number] | null>(null);
  const [respondingToAlert, setRespondingToAlert] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [destination, setDestination] = useState<string>('');
  interface PlaceSuggestion {
    id: string;
    name: string;
    lat: number;
    lon: number;
    address?: string;
  }
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [isDestinationConfirmed, setIsDestinationConfirmed] = useState<boolean>(false);
  type Transport = 'walk' | 'bike' | 'car' | 'public';
  const [transport, setTransport] = useState<Transport>('walk');
  const [isMovingSession, setIsMovingSession] = useState<boolean>(false);
  const [preAlarmVisible, setPreAlarmVisible] = useState<boolean>(false);
  const [preAlarmCountdown, setPreAlarmCountdown] = useState<number>(60);
  const watchIdRef = useRef<number | null>(null);
  const lastMovementRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation && mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          600,
        );
      } catch (e) {
        console.log('animateToRegion error', e);
      }
    }
  }, [currentLocation]);

  useEffect(() => {
    return () => {
      cleanupWatch();
      clearIntervals();
      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  useEffect(() => {
    const q = destination.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    const handle = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const json: Array<{ place_id: number; display_name: string; lat: string; lon: string; } & Record<string, unknown>> = await res.json();
        const mapped: PlaceSuggestion[] = json.map((it) => ({
          id: String(it.place_id),
          name: it.display_name,
          lat: Number(it.lat),
          lon: Number(it.lon),
          address: it.display_name,
        }));
        setSuggestions(mapped);
      } catch (e) {
        setSearchError('Unable to search address. Please try again.');
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [destination]);

  const getCurrentLocation = async () => {
    try {
      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setCurrentLocation({
                latitude,
                longitude,
                altitude: null as unknown as number,
                accuracy: pos.coords.accuracy ?? 0,
                altitudeAccuracy: null as unknown as number,
                heading: pos.coords.heading ?? 0,
                speed: pos.coords.speed ?? 0,
              });
            },
            (err) => {
              console.log('Geolocation error', err);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
          );
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // No local timers for alerts; backend manages escalation and realtime updates propagate to store

  const handleRespondToAlert = async (alertId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setRespondingToAlert(alertId);
    respondToAlert(alertId, 'respond');

    Alert.alert(
      'Response Confirmed',
      'You are now responding to this alert. The person in distress has been notified.',
      [{ text: 'OK' }]
    );
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    respondToAlert(alertId, 'acknowledge');
  };

  const getTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAlertColor = (status: 'active' | 'acknowledged' | 'resolved') => {
    switch (status) {
      case 'active':
        return Colors.error;
      case 'acknowledged':
        return Colors.yellow;
      case 'resolved':
      default:
        return Colors.textMuted;
    }
  };

  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
    setPlayingId(null);
  }, []);

  const playAlertAudio = useCallback(async (id: string, url: string) => {
    try {
      if (playingId === id) {
        await stopAudio();
        return;
      }
      await stopAudio();
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(id);
      sound.setOnPlaybackStatusUpdate((status) => {
        const s = status as any;
        if (s.didJustFinish) {
          stopAudio();
        }
      });
    } catch (e) {
      setPlayingId(null);
    }
  }, [playingId, stopAudio]);

  const focusOnAlert = (alert: typeof alerts[number]) => {
    setSelectedAlert(alert);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: alert.location.latitude,
        longitude: alert.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const transportThresholds: Record<Transport, number> = useMemo(() => ({
    walk: 2 * 60 * 1000,
    bike: 1 * 60 * 1000,
    car: 3 * 60 * 1000,
    public: 4 * 60 * 1000,
  }), []);

  const minimalMoveMeters = 15;

  const haversine = useCallback((a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }, []);

  const clearIntervals = useCallback(() => {
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
      inactivityIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const cleanupWatch = useCallback(() => {
    if (Platform.OS === 'web') {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        } catch (e) {
          console.log('clearWatch error', e);
        }
      }
      watchIdRef.current = null;
    } else {
      const maybe = (watchIdRef as React.MutableRefObject<any>).current;
      if (maybe && typeof maybe.remove === 'function') {
        try { maybe.remove(); } catch (e) { console.log('native remove error', e); }
      }
      (watchIdRef as React.MutableRefObject<any>).current = null;
    }
  }, []);

  const onPosition = useCallback((lat: number, lon: number) => {
    setCurrentLocation(prev => ({
      latitude: lat,
      longitude: lon,
      altitude: prev?.altitude ?? (null as unknown as number),
      accuracy: prev?.accuracy ?? 0,
      altitudeAccuracy: prev?.altitudeAccuracy ?? (null as unknown as number),
      heading: prev?.heading ?? 0,
      speed: prev?.speed ?? 0,
    }));

    const last = lastPositionRef.current;
    if (!last) {
      lastPositionRef.current = { lat, lon };
      lastMovementRef.current = Date.now();
      return;
    }
    const dist = haversine(last, { lat, lon });
    if (dist >= minimalMoveMeters) {
      lastMovementRef.current = Date.now();
      lastPositionRef.current = { lat, lon };
      if (preAlarmVisible) {
        setPreAlarmVisible(false);
        setPreAlarmCountdown(60);
        clearIntervals();
      }
    }
  }, [haversine, minimalMoveMeters, preAlarmVisible, clearIntervals]);

  const focusOnPlace = useCallback((lat: number, lon: number) => {
    try {
      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      }
    } catch {}
  }, []);

  const startMovingSession = useCallback(async () => {
    if (isMovingSession) return;
    setIsMovingSession(true);
    lastMovementRef.current = Date.now();
    if (currentLocation) {
      lastPositionRef.current = { lat: currentLocation.latitude, lon: currentLocation.longitude };
    }

    if (Platform.OS === 'web') {
      if ('geolocation' in navigator) {
        try {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => onPosition(pos.coords.latitude, pos.coords.longitude),
            (err) => console.log('watchPosition error', err),
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
          );
        } catch (e) {
          console.log('watchPosition failed', e);
        }
      }
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
        }
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
          (loc) => onPosition(loc.coords.latitude, loc.coords.longitude)
        );
        // Store unsubscribe on ref by hijacking as any
        (watchIdRef as React.MutableRefObject<any>).current = { remove: () => sub.remove() };
      } catch (e) {
        console.log('native watchPosition failed', e);
      }
    }

    inactivityIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastMovementRef.current;
      const threshold = transportThresholds[transport];
      if (!preAlarmVisible && elapsed >= threshold) {
        setPreAlarmVisible(true);
        setPreAlarmCountdown(60);
        if (Platform.OS !== 'web') {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
        }
        countdownIntervalRef.current = setInterval(() => {
          setPreAlarmCountdown((prev) => {
            if (prev <= 1) {
              clearIntervals();
              setPreAlarmVisible(false);
              setIsMovingSession(false);
              try { triggerAlert(); } catch (e) { console.log('triggerAlert error', e); }
              return 60;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 1000);
  }, [isMovingSession, currentLocation, transport, transportThresholds, onPosition, clearIntervals, triggerAlert]);

  const stopMovingSession = useCallback(() => {
    setIsMovingSession(false);
    cleanupWatch();
    clearIntervals();
  }, [cleanupWatch, clearIntervals]);

  const cancelPreAlarm = useCallback(() => {
    setPreAlarmVisible(false);
    setPreAlarmCountdown(60);
    lastMovementRef.current = Date.now();
    clearIntervals();
  }, [clearIntervals]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle color={Colors.error} size={48} />
          <Text style={styles.errorText}>Not Signed In</Text>
          <Text style={styles.errorSubtext}>Sign in to access the map.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSelectSuggestion = useCallback((s: PlaceSuggestion) => {
    setSelectedPlace(s);
    setDestination(s.name);
    setIsDestinationConfirmed(false);
    setSuggestions([]);
    focusOnPlace(s.lat, s.lon);
  }, [focusOnPlace]);

  const onConfirmDestination = useCallback(() => {
    if (!selectedPlace) return;
    setIsDestinationConfirmed(true);
    focusOnPlace(selectedPlace.lat, selectedPlace.lon);
  }, [selectedPlace, focusOnPlace]);

  return (
    <SafeAreaView style={styles.container} testID="mapScreen-root">
      <View style={styles.header}>
        <Text style={styles.headerTitle} testID="mapScreen-title">
          {user.userType === 'responder' ? 'Emergency Response Map' : 'Travel Safety Map'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {user.userType === 'responder' ? 'Active distress signals in your area' : 'Share destination and monitor for unexpected stops'}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.latitude || 37.7749,
            longitude: currentLocation?.longitude || -122.4194,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Your Location"
              description="You are here"
            >
              <View style={styles.userMarker}>
                <User color={Colors.text} size={16} />
              </View>
            </Marker>
          )}

          {isDestinationConfirmed && selectedPlace && (
            <Marker
              coordinate={{ latitude: selectedPlace.lat, longitude: selectedPlace.lon }}
              title={selectedPlace.name}
              description="Destination"
            >
              <View style={styles.destinationMarker}>
                <Navigation color={Colors.text} size={18} />
              </View>
            </Marker>
          )}

          {user.userType === 'responder' && alerts.map((alert) => (
            <React.Fragment key={alert.id}>
              <Marker
                coordinate={{
                  latitude: alert.location.latitude,
                  longitude: alert.location.longitude,
                }}
                title={alert.title}
                description={alert.location.address}
                onPress={() => focusOnAlert(alert)}
              >
                <View style={[styles.alertMarker, { backgroundColor: getAlertColor(alert.status) }]}>
                  <AlertTriangle color={Colors.text} size={20} />
                </View>
              </Marker>
              <Circle
                center={{
                  latitude: alert.location.latitude,
                  longitude: alert.location.longitude,
                }}
                radius={500}
                strokeColor={getAlertColor(alert.status)}
                fillColor={`${getAlertColor(alert.status)}20`}
                strokeWidth={2}
              />
            </React.Fragment>
          ))}
        </MapView>
      </View>

      {user.userType === 'responder' ? (
        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          <Text style={styles.alertsTitle}>Active Alerts ({alerts.length})</Text>
          {alerts.map((alert) => {
            const timeRemaining = alert.responseDeadline ? getTimeRemaining(alert.responseDeadline) : '—';
            const isExpired = timeRemaining === 'Expired';
            const isResponding = respondingToAlert === alert.id;
            return (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertCard, selectedAlert?.id === alert.id && styles.selectedAlertCard]}
                onPress={() => focusOnAlert(alert)}
                testID={`alert-card-${alert.id}`}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertUserName}>{alert.title}</Text>
                    <View style={styles.alertMeta}>
                      <MapPin color={Colors.textMuted} size={14} />
                      <Text style={styles.alertAddress}>{alert.location.address}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getAlertColor(alert.status) }]}>
                    <Text style={styles.statusText}>{alert.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.alertDetails}>
                  <View style={styles.timerContainer}>
                    <Timer color={isExpired ? Colors.error : Colors.textMuted} size={16} />
                    <Text style={[styles.timerText, isExpired && styles.expiredText]}>
                      {alert.responseDeadline ? (isExpired ? 'Response time expired' : `Response time: ${timeRemaining}`) : 'Response time: —'}
                    </Text>
                  </View>
                  {alert.audioUrl && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.audioButton} onPress={() => playAlertAudio(alert.id, alert.audioUrl!)}>
                        {playingId === alert.id ? (
                          <Square color={Colors.text} size={16} />
                        ) : (
                          <Play color={Colors.black} size={16} />
                        )}
                        <Text style={playingId === alert.id ? styles.respondButtonText : styles.acknowledgeButtonText}>
                          {playingId === alert.id ? 'Stop Audio' : 'Play Audio'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {alert.status === 'active' && !isResponding && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.acknowledgeButton} onPress={() => handleAcknowledgeAlert(alert.id)} testID={`acknowledge-${alert.id}`}>
                      <CheckCircle color={Colors.black} size={16} />
                      <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.respondButton} onPress={() => handleRespondToAlert(alert.id)} testID={`respond-${alert.id}`}>
                      <Navigation color={Colors.text} size={16} />
                      <Text style={styles.respondButtonText}>Respond</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {alerts.length === 0 && (
            <View style={styles.noAlertsContainer}>
              <CheckCircle color={Colors.success} size={48} />
              <Text style={styles.noAlertsText}>No Active Alerts</Text>
              <Text style={styles.noAlertsSubtext}>All clear in your area</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.seekerPanel} testID="seeker-panel">
          <Text style={styles.alertsTitle}>Share your plan</Text>
          <View style={styles.inputRow}>
            <Route color={Colors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Enter destination address"
              placeholderTextColor={Colors.textMuted}
              value={destination}
              onChangeText={(t) => {
                setDestination(t);
                setIsDestinationConfirmed(false);
                setSelectedPlace(null);
              }}
              testID="destination-input"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {isSearching && <ActivityIndicator size="small" color={Colors.textMuted} />}
          </View>

          {searchError && (
            <Text style={styles.searchError} testID="search-error">{searchError}</Text>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestionsCard} testID="suggestions-card">
              {suggestions.map((s) => (
                <TouchableOpacity key={s.id} style={styles.suggestionRow} onPress={() => onSelectSuggestion(s)} testID={`suggestion-${s.id}`}>
                  <MapPin color={Colors.textMuted} size={16} />
                  <Text style={styles.suggestionText} numberOfLines={2}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedPlace && !isDestinationConfirmed && (
            <TouchableOpacity onPress={onConfirmDestination} style={styles.confirmBtn} testID="confirm-destination">
              <CheckCircle color={Colors.black} size={16} />
              <Text style={styles.confirmBtnText}>Confirm destination</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.transportLabel}>Transport</Text>
          <View style={styles.transportRow}>
            <TouchableOpacity onPress={() => setTransport('walk')} style={[styles.transportChip, transport === 'walk' && styles.transportChipActive]} testID="transport-walk">
              <Footprints color={transport === 'walk' ? Colors.black : Colors.textMuted} size={16} />
              <Text style={[styles.transportText, transport === 'walk' && styles.transportTextActive]}>Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTransport('bike')} style={[styles.transportChip, transport === 'bike' && styles.transportChipActive]} testID="transport-bike">
              <Bike color={transport === 'bike' ? Colors.black : Colors.textMuted} size={16} />
              <Text style={[styles.transportText, transport === 'bike' && styles.transportTextActive]}>Bike</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTransport('car')} style={[styles.transportChip, transport === 'car' && styles.transportChipActive]} testID="transport-car">
              <Car color={transport === 'car' ? Colors.black : Colors.textMuted} size={16} />
              <Text style={[styles.transportText, transport === 'car' && styles.transportTextActive]}>Car</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTransport('public')} style={[styles.transportChip, transport === 'public' && styles.transportChipActive]} testID="transport-public">
              <TramFront color={transport === 'public' ? Colors.black : Colors.textMuted} size={16} />
              <Text style={[styles.transportText, transport === 'public' && styles.transportTextActive]}>Transit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={isMovingSession ? stopMovingSession : startMovingSession}
            style={[styles.primaryCta, isMovingSession ? styles.stopCta : styles.startCta]}
            testID="toggle-moving-session"
          >
            {isMovingSession ? <Square color={Colors.text} size={18} /> : <Play color={Colors.black} size={18} />}
            <Text style={[styles.primaryCtaText, isMovingSession ? styles.primaryCtaTextStop : styles.primaryCtaTextStart]}>
              {isMovingSession ? 'Stop Monitoring' : 'Start Monitoring'}
            </Text>
          </TouchableOpacity>

          <View style={styles.helperTextBox}>
            <Clock color={Colors.textMuted} size={16} />
            <Text style={styles.helperText}>We’ll start a 60s pre-alarm if you are unexpectedly stationary. Threshold: {Math.round(transportThresholds[transport]/60000)} min.</Text>
          </View>

          <Modal visible={preAlarmVisible} transparent animationType="fade">
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard} testID="prealarm-modal">
                <AlertTriangle color={Colors.error} size={32} />
                <Text style={styles.modalTitle}>Are you ok?</Text>
                <Text style={styles.modalSubtitle}>No movement detected. Sending alert in {preAlarmCountdown}s</Text>
                <TouchableOpacity onPress={cancelPreAlarm} style={styles.cancelAlarmBtn} testID="cancel-prealarm">
                  <Text style={styles.cancelAlarmText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  mapContainer: {
    height: height * 0.4,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.text,
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary ?? Colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.text,
  },
  alertMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.text,
  },
  alertsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  seekerPanel: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  transportLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  transportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.card,
  },
  transportChipActive: {
    backgroundColor: Colors.yellow,
    borderColor: Colors.yellow,
  },
  transportText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  transportTextActive: {
    color: Colors.black,
    fontWeight: '600',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  startCta: {
    backgroundColor: Colors.yellow,
  },
  stopCta: {
    backgroundColor: Colors.error,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryCtaTextStart: {
    color: Colors.black,
  },
  primaryCtaTextStop: {
    color: Colors.text,
  },
  helperTextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  suggestionsCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  searchError: {
    color: Colors.error,
    marginBottom: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.yellow,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: Colors.black,
    fontWeight: '700',
    fontSize: 14,
  },
  helperText: {
    flex: 1,
    color: Colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  cancelAlarmBtn: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelAlarmText: {
    color: Colors.black,
    fontWeight: '700',
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedAlertCard: {
    borderColor: Colors.yellow,
    borderWidth: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertAddress: {
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
  },
  alertDetails: {
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  expiredText: {
    color: Colors.error,
    fontWeight: '600',
  },
  respondersCount: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acknowledgeButton: {
    flex: 1,
    backgroundColor: Colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acknowledgeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  respondButton: {
    flex: 1,
    backgroundColor: Colors.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  respondButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  respondingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.success + '20',
    borderRadius: 8,
  },
  respondingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  noAlertsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noAlertsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  noAlertsSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
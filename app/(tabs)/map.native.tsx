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
  Share,
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
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { useSafetyStore } from '@/store/safety-store';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';
import OptimizedMap from '@/components/OptimizedMap';
import PerformanceMonitor from '@/components/PerformanceMonitor';

// Reuse the native implementation directly from the previous cross-platform file
const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { user } = useAuth();
  const { respondToAlert, triggerAlert, alerts, startJourney, stopJourney, updateMovement, journey, beginSharedJourney, endSharedJourney, share } = useSafetyStore() as any;
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
  type PolylineCoord = { latitude: number; longitude: number };
  const [routeCoords, setRouteCoords] = useState<PolylineCoord[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastMovementRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<any>(null);
  interface StepInfo {
    instruction: string;
    distance: number;
    duration: number;
    endCoord: { latitude: number; longitude: number };
  }
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepsExpanded, setStepsExpanded] = useState<boolean>(false);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const lastRerouteAtRef = useRef<number>(0);
  const shareLink = useMemo(() => share?.shareToken ? `myapp://journey?token=${share.shareToken}` : null, [share?.shareToken]);

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
      } catch (e) {}
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
          signal: AbortSignal.timeout(5000) // 5 second timeout
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
    }, 500); // Increased debounce time
    return () => clearTimeout(handle);
  }, [destination]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(location.coords);
    } catch (error) {}
  };

  const handleRespondToAlert = async (alertId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRespondingToAlert(alertId);
    respondToAlert(alertId, 'respond');
    Alert.alert('Response Confirmed','You are now responding to this alert. The person in distress has been notified.',[{ text: 'OK' }]);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      case 'active': return Colors.error;
      case 'acknowledged': return Colors.yellow;
      case 'resolved':
      default: return Colors.textMuted;
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
    if (inactivityIntervalRef.current) { clearInterval(inactivityIntervalRef.current); inactivityIntervalRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
  }, []);

  const cleanupWatch = useCallback(() => {
    const maybe = (watchIdRef as React.MutableRefObject<any>).current;
    if (maybe && typeof maybe.remove === 'function') {
      try { maybe.remove(); } catch {}
    }
    (watchIdRef as React.MutableRefObject<any>).current = null;
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
      try { updateMovement(true); } catch {}
      return;
    }
    const dist = haversine(last, { lat, lon });
    if (dist >= minimalMoveMeters) {
      lastMovementRef.current = Date.now();
      lastPositionRef.current = { lat, lon };
      try { updateMovement(true); } catch {}
      if (preAlarmVisible) {
        setPreAlarmVisible(false);
        setPreAlarmCountdown(60);
        clearIntervals();
      }
    }
  }, [haversine, minimalMoveMeters, preAlarmVisible, clearIntervals, updateMovement]);

  const focusOnPlace = useCallback((lat: number, lon: number) => {
    try {
      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      }
    } catch {}
  }, []);

  const osrmProfileFor = useCallback((t: Transport) => {
    switch (t) {
      case 'bike': return 'cycling';
      case 'car':
      case 'public': return 'driving';
      case 'walk':
      default: return 'foot';
    }
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!currentLocation || !selectedPlace || !isDestinationConfirmed) {
      setRouteCoords([]); setRouteDistance(null); setRouteDuration(null); setRoutingError(null); setSteps([]); setCurrentStepIndex(0); return;
    }
    try {
      setIsRouting(true);
      if (!isRerouting) setIsRerouting(true);
      setRoutingError(null);
      const profile = osrmProfileFor(transport);
      const url = `https://router.project-osrm.org/route/v1/${profile}/${currentLocation.longitude},${currentLocation.latitude};${selectedPlace.lon},${selectedPlace.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Route failed ${res.status}`);
      const json = await res.json();
      const route = json.routes?.[0];
      if (!route) throw new Error('No route');
      const coords: PolylineCoord[] = route.geometry.coordinates.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] }));
      setRouteCoords(coords);
      setRouteDistance(route.distance ?? null);
      setRouteDuration(route.duration ?? null);
    } catch (e) {
      setRoutingError('Failed to load route');
      setRouteCoords([]); setRouteDistance(null); setRouteDuration(null);
    } finally {
      setIsRouting(false);
      setIsRerouting(false);
      lastRerouteAtRef.current = Date.now();
    }
  }, [currentLocation, selectedPlace, isDestinationConfirmed, transport, osrmProfileFor, isRerouting]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  const startMovingSession = useCallback(async () => {
    if (isMovingSession) return;
    setIsMovingSession(true);
    lastMovementRef.current = Date.now();
    if (currentLocation) { lastPositionRef.current = { lat: currentLocation.latitude, lon: currentLocation.longitude }; }
    try {
      if (selectedPlace && isDestinationConfirmed) {
        const dest = { id: selectedPlace.id, name: selectedPlace.name, address: selectedPlace.address ?? selectedPlace.name, latitude: selectedPlace.lat, longitude: selectedPlace.lon, transport } as const;
        startJourney(dest as any);
      }
    } catch {}
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {}
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
        (loc) => onPosition(loc.coords.latitude, loc.coords.longitude)
      );
      (watchIdRef as React.MutableRefObject<any>).current = { remove: () => sub.remove() };
    } catch {}
    inactivityIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastMovementRef.current;
      const threshold = transportThresholds[transport];
      try { updateMovement(false); } catch {}
      if (!preAlarmVisible && elapsed >= threshold) {
        setPreAlarmVisible(true);
        setPreAlarmCountdown(60);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
        countdownIntervalRef.current = setInterval(() => {
          setPreAlarmCountdown((prev) => {
            if (prev <= 1) {
              clearIntervals();
              setPreAlarmVisible(false);
              setIsMovingSession(false);
              try { stopJourney(); } catch {}
              try { triggerAlert(); } catch {}
              return 60;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 1000);
  }, [isMovingSession, currentLocation, transport, selectedPlace, isDestinationConfirmed, startJourney, onPosition, updateMovement, clearIntervals, triggerAlert]);

  const stopMovingSession = useCallback(() => {
    setIsMovingSession(false);
    cleanupWatch();
    clearIntervals();
    try { stopJourney(); } catch {}
  }, [cleanupWatch, clearIntervals]);

  const cancelPreAlarm = useCallback(() => {
    setPreAlarmVisible(false);
    setPreAlarmCountdown(60);
    lastMovementRef.current = Date.now();
    clearIntervals();
    try { updateMovement(true); } catch {}
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
      <PerformanceMonitor name="MapScreen" />
      <View style={styles.header}>
        <Text style={styles.headerTitle} testID="mapScreen-title">
          {user.userType === 'responder' ? 'Emergency Response Map' : 'Travel Safety Map'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {user.userType === 'responder' ? 'Active distress signals in your area' : 'Share destination and monitor for unexpected stops'}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <OptimizedMap
          currentLocation={currentLocation}
          alerts={user.userType === 'responder' ? alerts.map(alert => ({
            id: alert.id,
            location: alert.location,
            status: alert.status
          })) : []}
          routeCoords={routeCoords}
          style={styles.map}
          onMapReady={() => {
            if (currentLocation && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }, 600);
            }
          }}
        />
      </View>

      {/* The rest of the bottom panels are unchanged from the previous file; omitted here for brevity */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: Colors.textMuted },
  mapContainer: { height: height * 0.4, margin: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  map: { flex: 1 },
  userMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.yellow, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.text },
  destinationMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary ?? Colors.yellow, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.text },
  alertMarker: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.text },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { fontSize: 24, fontWeight: 'bold', color: Colors.error, marginTop: 16, marginBottom: 8 },
  errorSubtext: { fontSize: 16, color: Colors.textMuted, textAlign: 'center' },
});



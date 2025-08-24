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

  // Keep current step highlighted as user progresses
  useEffect(() => {
    if (!currentLocation || steps.length === 0) return;
    try {
      let bestIdx = currentStepIndex;
      let bestDist = Infinity;
      for (let i = currentStepIndex; i < steps.length; i++) {
        const step = steps[i];
        const d = haversine(
          { lat: currentLocation.latitude, lon: currentLocation.longitude },
          { lat: step.endCoord.latitude, lon: step.endCoord.longitude }
        );
        if (d < bestDist) { bestDist = d; bestIdx = i; }
        if (bestDist < 30) break;
      }
      if (bestIdx !== currentStepIndex) setCurrentStepIndex(bestIdx);
    } catch {}
  }, [currentLocation, steps, currentStepIndex, haversine]);

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

      // Parse turn-by-turn steps
      const legs = route.legs || [];
      const parsed: StepInfo[] = [];
      for (const leg of legs) {
        const legSteps = leg.steps || [];
        for (const st of legSteps) {
          const maneuver = st.maneuver || {};
          const type = maneuver.type || '';
          const modifier = maneuver.modifier || '';
          const name = (st.name || '').trim();
          const base = [type, modifier].filter(Boolean).join(' ');
          const instruction = `${base || 'Continue'}${name ? ` onto ${name}` : ''}`.trim();
          const end = (st.geometry?.coordinates?.slice(-1)?.[0]) || null;
          const endCoord = end ? { latitude: end[1], longitude: end[0] } : coords[coords.length - 1];
          parsed.push({ instruction, distance: st.distance || 0, duration: st.duration || 0, endCoord });
        }
      }
      setSteps(parsed);
      setCurrentStepIndex(0);
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

      {/* Journey Planner (Seekers) */}
      {user.userType === 'safety-seeker' && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Journey planner</Text>
            <View style={styles.searchRow}>
              <MapPin color={Colors.textMuted} size={16} />
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="Search destination"
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            {!!searchError && <Text style={styles.errorSmall}>{searchError}</Text>}
            {isSearching && <Text style={styles.searchHint}>Searching…</Text>}
            {suggestions.length > 0 && (
              <View style={styles.suggestBox}>
                <ScrollView style={{ maxHeight: 180 }}>
                  {suggestions.map(s => (
                    <TouchableOpacity key={s.id} style={styles.suggestItem} onPress={() => onSelectSuggestion(s)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MapPin color={Colors.yellow} size={16} />
                        <Text style={styles.suggestText} numberOfLines={2}>{s.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.transportRow}>
              <TouchableOpacity style={[styles.transportBtn, transport === 'walk' && styles.transportBtnActive]} onPress={() => setTransport('walk')}>
                <Footprints color={transport === 'walk' ? Colors.black : Colors.text} size={16} />
                <Text style={[styles.transportText, transport === 'walk' && styles.transportTextActive]}>Walk</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.transportBtn, transport === 'bike' && styles.transportBtnActive]} onPress={() => setTransport('bike')}>
                <Bike color={transport === 'bike' ? Colors.black : Colors.text} size={16} />
                <Text style={[styles.transportText, transport === 'bike' && styles.transportTextActive]}>Bike</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.transportBtn, transport === 'car' && styles.transportBtnActive]} onPress={() => setTransport('car')}>
                <Car color={transport === 'car' ? Colors.black : Colors.text} size={16} />
                <Text style={[styles.transportText, transport === 'car' && styles.transportTextActive]}>Car</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.transportBtn, transport === 'public' && styles.transportBtnActive]} onPress={() => setTransport('public')}>
                <TramFront color={transport === 'public' ? Colors.black : Colors.text} size={16} />
                <Text style={[styles.transportText, transport === 'public' && styles.transportTextActive]}>Transit</Text>
              </TouchableOpacity>
            </View>

            {!isDestinationConfirmed ? (
              <TouchableOpacity
                style={[styles.primaryBtn, !selectedPlace && styles.btnDisabled]}
                disabled={!selectedPlace}
                onPress={onConfirmDestination}
              >
                <Navigation color={selectedPlace ? Colors.black : Colors.textMuted} size={16} />
                <Text style={[styles.primaryBtnText, !selectedPlace && styles.btnTextDisabled]}>Confirm destination</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.routeSummary}>
                <View style={styles.routeMeta}>
                  <Route color={Colors.textMuted} size={16} />
                  <Text style={styles.routeMetaText}>
                    {routingError ? 'Route unavailable' : isRouting ? 'Loading route…' : (
                      routeDistance && routeDuration ? `${(routeDistance/1000).toFixed(1)} km • ${Math.round(routeDuration/60)} min` : '—'
                    )}
                  </Text>
                </View>
                <View style={styles.rowGap}>
                  <TouchableOpacity style={[styles.secondaryBtn, styles.flex1]} onPress={() => setStepsExpanded(v => !v)}>
                    <Clock color={Colors.text} size={16} />
                    <Text style={styles.secondaryBtnText}>{stepsExpanded ? 'Hide steps' : 'Show steps'}</Text>
                  </TouchableOpacity>
                  {!isMovingSession ? (
                    <TouchableOpacity style={[styles.primaryBtn, styles.flex1, (!selectedPlace || !isDestinationConfirmed) && styles.btnDisabled]}
                      disabled={!selectedPlace || !isDestinationConfirmed}
                      onPress={startMovingSession}
                    >
                      <Play color={!selectedPlace || !isDestinationConfirmed ? Colors.textMuted : Colors.black} size={16} />
                      <Text style={[styles.primaryBtnText, (!selectedPlace || !isDestinationConfirmed) && styles.btnTextDisabled]}>Start monitoring</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.stopBtn, styles.flex1]} onPress={stopMovingSession}>
                      <Square color={Colors.text} size={16} />
                      <Text style={styles.stopBtnText}>Stop</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {stepsExpanded && steps.length > 0 && (
              <View style={styles.stepsBox}>
                <ScrollView style={{ maxHeight: 180 }}>
                  {steps.map((s, idx) => (
                    <View key={idx} style={[styles.stepRow, idx === currentStepIndex && styles.stepRowActive]}>
                      <Text style={styles.stepIdx}>{idx + 1}.</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stepInstruction} numberOfLines={2}>{s.instruction}</Text>
                        <Text style={styles.stepMeta}>{(s.distance/1000).toFixed(2)} km • {Math.round(s.duration/60)} min</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Share Controls */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live sharing</Text>
            {shareLink ? (
              <View style={{ gap: 8 }}>
                <View style={styles.rowGap}>
                  <TouchableOpacity style={[styles.secondaryBtn, styles.flex1]} onPress={async () => { try { await Clipboard.setStringAsync(shareLink); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {} }}>
                    <User color={Colors.text} size={16} />
                    <Text style={styles.secondaryBtnText}>Copy link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.secondaryBtn, styles.flex1]} onPress={async () => { try { await Share.share({ message: shareLink }); } catch {} }}>
                    <Navigation color={Colors.text} size={16} />
                    <Text style={styles.secondaryBtnText}>Share…</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dangerOutlineBtn} onPress={() => endSharedJourney()}>
                  <Text style={styles.dangerOutlineText}>End sharing</Text>
                </TouchableOpacity>
                <Text style={styles.shareHint} numberOfLines={2}>{shareLink}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, (!selectedPlace || !isDestinationConfirmed) && styles.btnDisabled]}
                disabled={!selectedPlace || !isDestinationConfirmed}
                onPress={() => {
                  if (!selectedPlace) return;
                  beginSharedJourney({
                    id: selectedPlace.id,
                    name: selectedPlace.name,
                    address: selectedPlace.address ?? selectedPlace.name,
                    latitude: selectedPlace.lat,
                    longitude: selectedPlace.lon,
                    transport,
                  } as any);
                }}
              >
                <User color={!selectedPlace || !isDestinationConfirmed ? Colors.textMuted : Colors.black} size={16} />
                <Text style={[styles.primaryBtnText, (!selectedPlace || !isDestinationConfirmed) && styles.btnTextDisabled]}>Create share link</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Pre-alarm modal */}
      <Modal visible={preAlarmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AlertTriangle color={Colors.error} size={28} />
            <Text style={styles.modalTitle}>Are you safe?</Text>
            <Text style={styles.modalSubtitle}>No movement detected. Sending alert in {preAlarmCountdown}s.</Text>
            <View style={styles.rowGap}>
              <TouchableOpacity style={[styles.secondaryBtn, styles.flex1]} onPress={cancelPreAlarm}>
                <CheckCircle color={Colors.text} size={16} />
                <Text style={styles.secondaryBtnText}>I’m OK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.stopBtn, styles.flex1]} onPress={() => { try { triggerAlert(); } catch {}; setPreAlarmVisible(false); setIsMovingSession(false); clearIntervals(); }}>
                <AlertTriangle color={Colors.text} size={16} />
                <Text style={styles.stopBtnText}>Send help now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Planner styles
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, gap: 10 },
  cardTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, color: Colors.text },
  searchHint: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  suggestBox: { marginTop: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8 },
  suggestItem: { paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestText: { color: Colors.text, fontSize: 14, flex: 1 },
  transportRow: { flexDirection: 'row', gap: 8 },
  transportBtn: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  transportBtnActive: { backgroundColor: Colors.yellow, borderColor: Colors.yellow },
  transportText: { color: Colors.text, fontWeight: '600' },
  transportTextActive: { color: Colors.black },
  primaryBtn: { backgroundColor: Colors.yellow, paddingVertical: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: Colors.black, fontWeight: '700' },
  secondaryBtn: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  secondaryBtnText: { color: Colors.text, fontWeight: '700' },
  stopBtn: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stopBtnText: { color: Colors.text, fontWeight: '700' },
  dangerOutlineBtn: { borderWidth: 1, borderColor: Colors.error, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  dangerOutlineText: { color: Colors.error, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  btnTextDisabled: { color: Colors.textMuted },
  routeSummary: { gap: 10 },
  routeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeMetaText: { color: Colors.text },
  stepsBox: { marginTop: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepRowActive: { backgroundColor: Colors.card },
  stepIdx: { color: Colors.textMuted, width: 18, textAlign: 'right' },
  stepInstruction: { color: Colors.text, fontWeight: '600' },
  stepMeta: { color: Colors.textMuted, fontSize: 12 },
  rowGap: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  errorSmall: { color: Colors.error, fontSize: 12 },
  shareHint: { color: Colors.textMuted, fontSize: 12 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, gap: 10, alignItems: 'center' },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
});



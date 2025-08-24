import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { DatabaseService } from '@/services/database';
import { Navigation, MapPin, Clock, RefreshCw, AlertTriangle } from 'lucide-react-native';

// Minimal map fallback similar to MapScreen
interface MapViewProps {
  ref?: any;
  style?: any;
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number; };
  children?: React.ReactNode;
}
interface MarkerProps { coordinate: { latitude: number; longitude: number }; title?: string; description?: string; children?: React.ReactNode; }
interface PolylineProps { coordinates: { latitude: number; longitude: number }[]; strokeColor?: string; strokeWidth?: number; }

const createFallbackMap = () => React.forwardRef<any, MapViewProps>(({ children, style }, ref) => {
  return (
    <View style={[{ backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }, style]}>
      <MapPin color={Colors.yellow} size={32} />
      <Text style={{ color: Colors.textMuted, marginTop: 6 }}>Map preview (mobile shows real map)</Text>
      {children}
    </View>
  );
});

let MapView: React.ComponentType<MapViewProps> = createFallbackMap();
let Marker: React.ComponentType<MarkerProps> = ({ children }) => <View>{children}</View>;
let Polyline: React.ComponentType<PolylineProps> = () => <View />;

if (Platform.OS !== 'web') {
  try {
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default || RNMaps.MapView || RNMaps;
    Marker = RNMaps.Marker;
    Polyline = RNMaps.Polyline;
  } catch {}
}

const { height } = Dimensions.get('window');

export default function JourneyView() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Array<{ lat: number; lon: number; ts: string }>>([]);
  const [destination, setDestination] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  const lastPoint = points[0] ? { latitude: points[0].lat, longitude: points[0].lon } : null;

  const region = useMemo(() => {
    if (lastPoint) return { latitude: lastPoint.latitude, longitude: lastPoint.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    if (destination) return { latitude: destination.lat, longitude: destination.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    return { latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }, [lastPoint, destination]);

  const fetchFeed = async () => {
    if (!token || typeof token !== 'string') { setError('Missing journey token'); setIsLoading(false); return; }
    try {
      setError(null);
      const res = await DatabaseService.fetchJourneyFeed(token);
      if (!res.journey) { setError('Journey not found or expired'); setIsLoading(false); return; }
      setDestination({ name: res.journey.destination_name, lat: res.journey.dest_lat, lon: res.journey.dest_lon });
      setIsActive(!!res.journey.is_active);
      const mapped = (res.points || []).map(p => ({ lat: p.lat, lon: p.lon, ts: p.ts }));
      setPoints(mapped);
    } catch (e) {
      setError('Unable to load journey');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, 10000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Journey</Text>
        <Text style={styles.subtitle}>{isActive ? 'In progress' : 'Ended'}</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} initialRegion={region}>
          {destination && (
            <Marker coordinate={{ latitude: destination.lat, longitude: destination.lon }} title={destination.name}>
              <View style={styles.destMarker}><Navigation color={Colors.text} size={16} /></View>
            </Marker>
          )}
          {lastPoint && (
            <Marker coordinate={lastPoint} title="Last seen">
              <View style={styles.userMarker}><MapPin color={Colors.text} size={14} /></View>
            </Marker>
          )}
          {points.length > 1 && (
            <Polyline coordinates={points.map(p => ({ latitude: p.lat, longitude: p.lon }))} strokeColor={Colors.yellow} strokeWidth={5} />
          )}
        </MapView>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.text} />
          </View>
        )}
        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle color={Colors.text} size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Navigation color={Colors.textMuted} size={16} />
          <Text style={styles.infoText} numberOfLines={2}>Destination: {destination?.name || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Clock color={Colors.textMuted} size={16} />
          <Text style={styles.infoText}>Status: {isActive ? 'In progress' : 'Ended'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchFeed}>
          <RefreshCw color={Colors.black} size={16} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { color: Colors.text, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: Colors.textMuted, fontSize: 14 },
  mapContainer: { height: height * 0.45, margin: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  map: { flex: 1 },
  userMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.yellow, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.text },
  destMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.text },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  errorBanner: { position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: Colors.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: Colors.text, fontWeight: '700' },
  infoCard: { marginHorizontal: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: Colors.text, flex: 1 },
  refreshBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: Colors.yellow, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshText: { color: Colors.black, fontWeight: '700' },
  backBtn: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  backText: { color: Colors.text, fontWeight: '600' },
});



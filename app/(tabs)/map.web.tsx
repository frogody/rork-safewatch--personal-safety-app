import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle, MapPin, Navigation } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/store/auth-store';
import { useSafetyStore } from '@/store/safety-store';

export default function MapWeb() {
  const { user } = useAuth();
  const { alerts, respondToAlert } = useSafetyStore() as any;
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setCoords(null),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  }, []);

  const onAcknowledge = useCallback((id: string) => respondToAlert(id, 'acknowledge'), [respondToAlert]);
  const onRespond = useCallback((id: string) => respondToAlert(id, 'respond'), [respondToAlert]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <AlertTriangle color={Colors.error} size={48} />
          <Text style={styles.title}>Not Signed In</Text>
          <Text style={styles.subtitle}>Sign in to access the map.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {user.userType === 'responder' ? 'Emergency Response (Web)' : 'Travel Safety (Web)'}
        </Text>
        <Text style={styles.headerSubtitle}>Interactive map is available on mobile. This web view shows your current area and active alerts.</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <MapPin color={Colors.yellow} size={32} />
        <Text style={styles.mapTitle}>Map unavailable on web</Text>
        <Text style={styles.mapSubtitle}>
          {coords ? `Your location: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'Location not available'}
        </Text>
      </View>

      <ScrollView style={styles.alertsList}>
        <Text style={styles.alertsTitle}>Active Alerts ({alerts.length})</Text>
        {alerts.map((alert: any) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <View style={styles.alertMeta}>
                  <MapPin color={Colors.textMuted} size={14} />
                  <Text style={styles.alertAddress}>{alert.location.address}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(alert.status) }]}>
                <Text style={styles.statusText}>{alert.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.ackBtn} onPress={() => onAcknowledge(alert.id)}>
                <CheckCircle color={Colors.black} size={16} />
                <Text style={styles.ackText}>Acknowledge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.respBtn} onPress={() => onRespond(alert.id)}>
                <Navigation color={Colors.text} size={16} />
                <Text style={styles.respText}>Respond</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {alerts.length === 0 && (
          <View style={styles.center}>
            <CheckCircle color={Colors.success} size={48} />
            <Text style={styles.noAlerts}>No Active Alerts</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(status: 'active' | 'acknowledged' | 'resolved') {
  switch (status) {
    case 'active': return Colors.error;
    case 'acknowledged': return Colors.yellow;
    default: return Colors.textMuted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.error, marginTop: 12 },
  subtitle: { fontSize: 14, color: Colors.textMuted },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: Colors.textMuted },
  mapPlaceholder: { margin: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center', padding: 20 },
  mapTitle: { color: Colors.text, fontSize: 16, marginTop: 8 },
  mapSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  alertsList: { flex: 1, paddingHorizontal: 16 },
  alertsTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  alertCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  alertMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertAddress: { fontSize: 14, color: Colors.textMuted, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: Colors.text },
  actions: { flexDirection: 'row', gap: 12 },
  ackBtn: { flex: 1, backgroundColor: Colors.yellow, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ackText: { fontSize: 14, fontWeight: '600', color: Colors.black },
  respBtn: { flex: 1, backgroundColor: Colors.error, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  respText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  noAlerts: { fontSize: 16, color: Colors.textMuted, marginTop: 8 },
});



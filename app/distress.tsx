import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Phone, XCircle, ShieldAlert, MapPin, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSafetyStore } from '@/store/safety-store';
import { DatabaseService } from '@/services/database';
import { getPrimaryContact } from '@/services/contacts';

export default function DistressScreen() {
  const router = useRouter();
  const { alerts, refetchAlerts } = useSafetyStore();
  const [isCancelling, setIsCancelling] = useState(false);
  const [primaryPhone, setPrimaryPhone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const primary = await getPrimaryContact();
      setPrimaryPhone(primary?.phone ?? null);
    })();
  }, []);

  const activeAlert = useMemo(() => alerts.find(a => a.status === 'active') || null, [alerts]);

  const callNumber = (number: string) => {
    const url = Platform.select({ ios: `tel:${number}`, android: `tel:${number}`, web: undefined });
    if (url) Linking.openURL(url).catch(() => {});
  };

  const callEmergencyServices = () => callNumber('112');

  const callPrimaryContact = () => {
    if (primaryPhone) {
      callNumber(primaryPhone);
    } else {
      router.push('/emergency-contacts');
    }
  };

  const cancelAlert = async () => {
    if (!activeAlert) return;
    setIsCancelling(true);
    try {
      await DatabaseService.updateAlert(activeAlert.id, { status: 'resolved' });
      await refetchAlerts();
      router.replace('/(tabs)/safety');
    } catch (e) {
      setIsCancelling(false);
    }
  };

  const coordText = activeAlert ? `${activeAlert.location.latitude.toFixed(5)}, ${activeAlert.location.longitude.toFixed(5)}` : 'Locating…';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.error, '#B71C1C']} style={styles.banner}>
        <View style={styles.bannerRow}>
          <ShieldAlert color={Colors.text} size={28} />
          <Text style={styles.bannerTitle}>Distress Signal Active</Text>
        </View>
        <Text style={styles.bannerSubtitle}>Help request broadcast to nearby responders</Text>
      </LinearGradient>

      <View style={styles.card}>
        <View style={styles.row}>
          <MapPin color={Colors.textMuted} size={18} />
          <Text style={styles.locationText}>{coordText}</Text>
        </View>
        <Text style={styles.info}>Keep your phone visible. You can cancel if you are safe.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.cancel]} onPress={cancelAlert} disabled={!activeAlert || isCancelling}>
          <XCircle color={Colors.black} size={24} />
          <Text style={styles.actionText}>{isCancelling ? 'Cancelling…' : 'I am Safe - Cancel'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.call]} onPress={callEmergencyServices}>
          <Phone color={Colors.black} size={24} />
          <Text style={styles.actionText}>Call 112</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.call]} onPress={callPrimaryContact}>
          <Phone color={Colors.black} size={24} />
          <Text style={styles.actionText}>Call Emergency Contact</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <CheckCircle2 color={Colors.textMuted} size={16} />
        <Text style={styles.statusText}>We’ll auto-escalate if nobody responds.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: { padding: 20 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTitle: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
  bannerSubtitle: { color: Colors.text, opacity: 0.8, marginTop: 4 },
  card: { backgroundColor: Colors.card, margin: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { color: Colors.text, fontSize: 16 },
  info: { color: Colors.textMuted, marginTop: 8 },
  actions: { paddingHorizontal: 20, gap: 12, marginTop: 12 },
  actionBtn: { backgroundColor: Colors.yellow, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { color: Colors.black, fontSize: 16, fontWeight: 'bold' },
  cancel: { backgroundColor: Colors.yellow },
  call: { backgroundColor: Colors.yellow },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 20 },
  statusText: { color: Colors.textMuted },
});

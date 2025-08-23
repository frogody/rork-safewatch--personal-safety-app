import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Database, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { DatabaseService } from '@/services/database';

export default function DatabaseTestScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('Idle');
  const [alertsCount, setAlertsCount] = useState<number | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResult('Testing connection…');
    try {
      const alerts = await DatabaseService.getAlerts();
      setAlertsCount(alerts.length);
      setResult('Success');
    } catch (e) {
      setResult('Failed');
      Alert.alert('Database Error', 'Unable to fetch alerts. Check Supabase configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.gradient}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Database color={Colors.yellow} size={24} />
            <Text style={styles.title}>Database Connectivity</Text>
          </View>
          <Text style={styles.subtitle}>Tests read access to active alerts</Text>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, result === 'Failed' ? styles.error : result === 'Success' ? styles.success : undefined]}>
              {result}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Active alerts:</Text>
            <Text style={styles.value}>{alertsCount ?? '—'}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={runTest} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <>
                <RefreshCw color={Colors.black} size={18} />
                <Text style={styles.buttonText}>Run Test</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1, padding: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { color: Colors.textMuted },
  value: { color: Colors.text, fontWeight: '600' },
  success: { color: Colors.success },
  error: { color: Colors.error },
  button: { marginTop: 16, backgroundColor: Colors.yellow, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: Colors.black, fontWeight: '700' },
});



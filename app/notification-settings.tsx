import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  Bell,
  Shield,
  Users,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'safety' | 'community' | 'system';
}

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'emergency-alerts',
      title: 'Emergency Alerts',
      description: 'Receive immediate notifications for nearby distress signals',
      icon: <AlertTriangle color={Colors.error} size={20} />,
      enabled: true,
      category: 'safety'
    },
    {
      id: 'safety-monitoring',
      title: 'Safety Monitoring',
      description: 'Get notified when your safety monitoring status changes',
      icon: <Shield color={Colors.yellow} size={20} />,
      enabled: true,
      category: 'safety'
    },
    {
      id: 'location-alerts',
      title: 'Location Alerts',
      description: 'Notifications about location sharing and travel monitoring',
      icon: <MapPin color={Colors.yellow} size={20} />,
      enabled: true,
      category: 'safety'
    },
    {
      id: 'community-updates',
      title: 'Community Updates',
      description: 'Updates about new members and community activity',
      icon: <Users color={Colors.yellow} size={20} />,
      enabled: false,
      category: 'community'
    },
    {
      id: 'response-confirmations',
      title: 'Response Confirmations',
      description: 'Confirmations when someone responds to your alerts',
      icon: <CheckCircle color={Colors.success} size={20} />,
      enabled: true,
      category: 'safety'
    },
    {
      id: 'system-updates',
      title: 'System Updates',
      description: 'App updates and maintenance notifications',
      icon: <Bell color={Colors.textMuted} size={20} />,
      enabled: false,
      category: 'system'
    }
  ]);

  const [masterEnabled, setMasterEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Update master switch based on any enabled notifications
    const hasEnabledNotifications = settings.some(setting => setting.enabled);
    setMasterEnabled(hasEnabledNotifications);
  }, [settings]);

  const handleBack = () => {
    router.back();
  };

  const toggleMasterNotifications = (enabled: boolean) => {
    setMasterEnabled(enabled);
    if (!enabled) {
      // Disable all notifications
      setSettings(prev => prev.map(setting => ({ ...setting, enabled: false })));
    } else {
      // Enable critical safety notifications
      setSettings(prev => prev.map(setting => ({
        ...setting,
        enabled: setting.category === 'safety' && ['emergency-alerts', 'safety-monitoring'].includes(setting.id)
      })));
    }
  };

  const toggleNotification = (id: string, enabled: boolean) => {
    setSettings(prev => prev.map(setting => 
      setting.id === id ? { ...setting, enabled } : setting
    ));
  };

  const handleTestNotification = () => {
    Alert.alert(
      'Test Notification',
      'This is how you would receive a SafeWatch notification. In a real emergency, this would include location and response options.',
      [{ text: 'OK' }]
    );
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'safety': return 'Safety & Emergency';
      case 'community': return 'Community';
      case 'system': return 'System';
      default: return 'Other';
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Master Switch */}
          <View style={styles.masterSection}>
            <View style={styles.masterCard}>
              <View style={styles.masterInfo}>
                <Bell color={Colors.yellow} size={24} />
                <View style={styles.masterText}>
                  <Text style={styles.masterTitle}>Push Notifications</Text>
                  <Text style={styles.masterSubtitle}>
                    {masterEnabled ? 'Notifications are enabled' : 'All notifications disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={masterEnabled}
                onValueChange={toggleMasterNotifications}
                trackColor={{ false: Colors.border, true: Colors.yellow }}
                thumbColor={masterEnabled ? Colors.black : Colors.textMuted}
              />
            </View>
          </View>

          {/* Test Notification */}
          <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
            <LinearGradient
              colors={[Colors.yellow, Colors.darkYellow]}
              style={styles.testButtonGradient}
            >
              <Bell color={Colors.black} size={20} />
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Notification Categories */}
          {Object.entries(groupedSettings).map(([category, categorySettings]) => (
            <View key={category} style={styles.section}>
              <Text style={styles.sectionTitle}>{getCategoryTitle(category)}</Text>
              <View style={styles.sectionContent}>
                {categorySettings.map((setting, index) => (
                  <View 
                    key={setting.id} 
                    style={[
                      styles.settingItem,
                      index === categorySettings.length - 1 && styles.lastSettingItem
                    ]}
                  >
                    <View style={styles.settingLeft}>
                      <View style={styles.iconContainer}>
                        {setting.icon}
                      </View>
                      <View style={styles.settingText}>
                        <Text style={styles.settingTitle}>{setting.title}</Text>
                        <Text style={styles.settingDescription}>{setting.description}</Text>
                      </View>
                    </View>
                    <Switch
                      value={setting.enabled && masterEnabled}
                      onValueChange={(enabled) => toggleNotification(setting.id, enabled)}
                      disabled={!masterEnabled}
                      trackColor={{ false: Colors.border, true: Colors.yellow }}
                      thumbColor={setting.enabled && masterEnabled ? Colors.black : Colors.textMuted}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <AlertTriangle color={Colors.warning} size={24} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Important</Text>
                <Text style={styles.infoDescription}>
                  Emergency alerts cannot be disabled for safety reasons. You will always receive notifications for active distress signals in your area.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  masterSection: {
    marginBottom: 24,
  },
  masterCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  masterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterText: {
    marginLeft: 16,
    flex: 1,
  },
  masterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  masterSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  testButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  testButtonText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  infoSection: {
    marginBottom: 40,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Phone, 
  Bell, 
  Shield, 
  MapPin, 
  Clock,
  ChevronRight,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Database
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafetyStore } from '@/store/safety-store';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSafetyStore();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(settings.notifications);
  const [locationSharing, setLocationSharing] = useState(settings.locationSharing);
  const [autoEmergencyCall, setAutoEmergencyCall] = useState(settings.autoEmergencyCall);

  const handleNotificationToggle = (value: boolean) => {
    setNotifications(value);
    updateSettings({ notifications: value });
  };

  const handleLocationSharingToggle = (value: boolean) => {
    setLocationSharing(value);
    updateSettings({ locationSharing: value });
  };

  const handleAutoEmergencyToggle = (value: boolean) => {
    setAutoEmergencyCall(value);
    updateSettings({ autoEmergencyCall: value });
  };

  const handleEmergencyContacts = () => {
    router.push('/emergency-contacts');
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      'Privacy Settings',
      'Manage your data privacy and sharing preferences.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    router.push('/tutorial');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of SafeWatch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Icon color={Colors.textMuted} size={20} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <ChevronRight color={Colors.textMuted} size={20} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your safety preferences</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={User}
              title="Personal Information"
              subtitle="Update your profile details"
              onPress={() => router.push('/profile-setup')}
            />
            <SettingItem
              icon={Phone}
              title="Emergency Contacts"
              subtitle="Manage trusted contacts"
              onPress={handleEmergencyContacts}
            />
          </View>
        </View>

        {/* Safety Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Settings</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={Bell}
              title="Push Notifications"
              subtitle="Receive safety alerts and updates"
              onPress={() => router.push('/notification-settings')}
            />
            <SettingItem
              icon={MapPin}
              title="Location Sharing"
              subtitle="Share location with community"
              rightElement={
                <Switch
                  value={locationSharing}
                  onValueChange={handleLocationSharingToggle}
                  trackColor={{ false: Colors.border, true: Colors.yellow }}
                  thumbColor={locationSharing ? Colors.black : Colors.textMuted}
                />
              }
            />
            <SettingItem
              icon={Phone}
              title="Auto Emergency Call"
              subtitle="Automatically call emergency services"
              rightElement={
                <Switch
                  value={autoEmergencyCall}
                  onValueChange={handleAutoEmergencyToggle}
                  trackColor={{ false: Colors.border, true: Colors.yellow }}
                  thumbColor={autoEmergencyCall ? Colors.black : Colors.textMuted}
                />
              }
            />
            <SettingItem
              icon={Clock}
              title="Response Timeout"
              subtitle={`${settings.responseTimeout} seconds`}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={Shield}
              title="Privacy Settings"
              subtitle="Control your data and privacy"
              onPress={handlePrivacySettings}
            />
            <SettingItem
              icon={SettingsIcon}
              title="Data Management"
              subtitle="Manage stored data and history"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <View style={styles.userInfoContainer}>
              <View style={styles.iconContainer}>
                <User color={Colors.yellow} size={20} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                <Text style={styles.userType}>
                  {user?.userType === 'safety-seeker' ? 'Safety Seeker' : 'Responder'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Developer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={Database}
              title="Database Test"
              subtitle="Test real-time database connection"
              onPress={() => router.push('/database-test' as any)}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={HelpCircle}
              title="How SafeWatch Works"
              subtitle="Learn how to use safety features"
              onPress={handleHelp}
            />
            <SettingItem
              icon={LogOut}
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleLogout}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SafeWatch v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Your safety is our priority
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
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
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textDisabled,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  userType: {
    fontSize: 12,
    color: Colors.yellow,
    fontWeight: '500',
  },
});
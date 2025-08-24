import { Tabs } from "expo-router";
import { Shield, Users, Settings, AlertTriangle, Map } from "lucide-react-native";
import React, { useMemo } from "react";
import { Colors } from '@/constants/colors';
import { useAuth } from '@/store/auth-store';
import PerformanceMonitor from '@/components/PerformanceMonitor';

export default function TabLayout() {
  const { user } = useAuth();
  
  const { isSafetySeeker, isResponder } = useMemo(() => ({
    isSafetySeeker: user?.userType === 'safety-seeker',
    isResponder: user?.userType === 'responder',
  }), [user?.userType]);
  
  console.log('TabLayout - User type:', user?.userType, 'isSafetySeeker:', isSafetySeeker, 'isResponder:', isResponder);

  return (
    <>
      <PerformanceMonitor name="TabLayout" />
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.yellow,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
      }}
    >
      {/* Safety tab is ONLY visible for safety-seeker users, NOT for responders */}
      {isSafetySeeker && !isResponder && (
        <Tabs.Screen
          name="safety"
          options={{
            title: "Safety",
            tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
          }}
        />
      )}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <AlertTriangle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
    </>
  );
}
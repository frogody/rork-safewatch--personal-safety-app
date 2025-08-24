import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'SafeWatch: Personal Safety App';
const APP_SLUG = process.env.EXPO_PUBLIC_APP_SLUG ?? 'safewatch-personal-safety-app';
const BUNDLE_ID = process.env.EXPO_IOS_BUNDLE_ID ?? 'app.rork.safewatch-personal-safety-app';
const ANDROID_PACKAGE = process.env.EXPO_ANDROID_PACKAGE ?? 'app.rork.safewatch-personal-safety-app';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw at config time, but warn loudly for developers
  // Production builds must supply these via env/EAS secrets
  // eslint-disable-next-line no-console
  console.warn('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.');
}

const config: ExpoConfig = {
  name: APP_NAME,
  slug: APP_SLUG,
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'safewatch',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Allow $(PRODUCT_NAME) to use your location.',
      NSLocationAlwaysUsageDescription: 'Allow $(PRODUCT_NAME) to use your location.',
      NSLocationWhenInUseUsageDescription: 'Allow $(PRODUCT_NAME) to use your location.',
      UIBackgroundModes: ['location', 'audio'],
      NSMicrophoneUsageDescription: 'Allow $(PRODUCT_NAME) to access your microphone',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: ANDROID_PACKAGE,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'android.permission.VIBRATE',
      'RECORD_AUDIO',
    ],
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        origin: 'https://rork.com/',
      },
    ],
    [
      'expo-location',
      {
        isAndroidForegroundServiceEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isIosBackgroundLocationEnabled: true,
        locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.',
      },
    ],
    [
      'expo-av',
      {
        microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Only include safe-to-expose keys here (EXPO_PUBLIC_*)
    EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    // App metadata
    EXPO_PUBLIC_APP_NAME: APP_NAME,
    EXPO_PUBLIC_APP_SLUG: APP_SLUG,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;



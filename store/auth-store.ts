import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { DatabaseService } from '@/services/database';
import type { DatabaseUser } from '@/constants/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'safety-seeker' | 'responder';
  phoneNumber?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isVerified: boolean;
  profileComplete: boolean;
}

// Helper function to convert database user to app user
function dbUserToAppUser(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    userType: dbUser.user_type,
    phoneNumber: dbUser.phone_number,
    isEmailVerified: dbUser.is_email_verified,
    isPhoneVerified: dbUser.is_phone_verified,
    isVerified: dbUser.is_verified,
    profileComplete: dbUser.profile_complete,
  };
}

// Helper function to convert app user to database user
function appUserToDbUser(appUser: User): Omit<DatabaseUser, 'created_at' | 'updated_at'> {
  return {
    id: appUser.id,
    email: appUser.email,
    name: appUser.name,
    user_type: appUser.userType,
    phone_number: appUser.phoneNumber,
    is_email_verified: appUser.isEmailVerified,
    is_phone_verified: appUser.isPhoneVerified,
    is_verified: appUser.isVerified,
    profile_complete: appUser.profileComplete,
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = '@safewatch_auth';
const ONBOARDING_STORAGE_KEY = '@safewatch_onboarding';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    hasCompletedOnboarding: false,
    isAuthenticated: false,
  });

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const [authData, onboardingData] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
      ]);

      let user = authData ? JSON.parse(authData) : null;
      const hasCompletedOnboarding = onboardingData === 'true';

      // If we have a user locally, try to sync with database
      if (user) {
        try {
          const dbUser = await DatabaseService.getUserById(user.id);
          if (dbUser) {
            user = dbUserToAppUser(dbUser);
            // Update local storage with latest data
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          }
        } catch (error) {
          console.log('Could not sync with database, using local data:', error);
        }
      }

      setAuthState({
        user,
        isLoading: false,
        hasCompletedOnboarding,
        isAuthenticated: !!user,
      });
    } catch (error) {
      console.error('Error loading auth state:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signUp = useCallback(async (email: string, password: string, name: string, userType: 'safety-seeker' | 'responder') => {
    try {
      // Check if user already exists
      const existingUser = await DatabaseService.getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      const user: User = {
        id: Date.now().toString(),
        email,
        name,
        userType,
        isEmailVerified: false,
        isPhoneVerified: false,
        isVerified: false,
        profileComplete: false,
      };

      // Create user in database
      const dbUser = await DatabaseService.createUser(appUserToDbUser(user));
      const createdUser = dbUserToAppUser(dbUser);

      // Store locally for offline access
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(createdUser));
      
      setAuthState(prev => ({
        ...prev,
        user: createdUser,
        isAuthenticated: true,
      }));

      console.log('🎉 User signed up successfully:', email);
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Failed to create account' };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Authenticate with database
      const dbUser = await DatabaseService.authenticateUser(email, password);
      
      if (!dbUser) {
        return { success: false, error: 'Invalid credentials' };
      }

      const user = dbUserToAppUser(dbUser);

      // Store locally for offline access
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      setAuthState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
      }));

      console.log('🎉 User signed in successfully:', email);
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({
        user: null,
        isLoading: false,
        hasCompletedOnboarding: true,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setAuthState(prev => ({
        ...prev,
        hasCompletedOnboarding: true,
      }));
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!authState.user) return;

    try {
      const updatedUser = { ...authState.user, ...updates };
      
      // Update in database
      const dbUpdates = appUserToDbUser(updatedUser);
      const dbUser = await DatabaseService.updateUser(authState.user.id, dbUpdates);
      
      if (dbUser) {
        const finalUser = dbUserToAppUser(dbUser);
        
        // Store locally for offline access
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(finalUser));
        
        setAuthState(prev => ({
          ...prev,
          user: finalUser,
        }));
        
        console.log('✅ User updated successfully:', authState.user.id);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, [authState.user]);

  return useMemo(() => ({
    ...authState,
    signUp,
    signIn,
    signOut,
    completeOnboarding,
    updateUser,
  }), [authState, signUp, signIn, signOut, completeOnboarding, updateUser]);
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  Users,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';

type UserType = 'safety-seeker' | 'responder';

export default function SignUpScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [userType, setUserType] = useState<UserType>('safety-seeker');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  const { signUp } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await signUp(
        formData.email,
        formData.password,
        formData.name,
        userType
      );

      if (result.success) {
        router.replace('/verify-email');
      } else {
        Alert.alert('Error', result.error || 'Failed to create account');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.replace('/signin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <LinearGradient
          colors={[Colors.background, Colors.surface]}
          style={styles.gradient}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Shield color={Colors.yellow} size={60} />
              </View>
              <Text style={styles.title}>Join SafeWatch</Text>
              <Text style={styles.subtitle}>Create your safety network account</Text>
            </View>

            <View style={styles.userTypeContainer}>
              <Text style={styles.sectionTitle}>I want to be a:</Text>
              
              <TouchableOpacity
                style={[
                  styles.userTypeCard,
                  userType === 'safety-seeker' && styles.selectedUserType
                ]}
                onPress={() => setUserType('safety-seeker')}
              >
                <Shield 
                  color={userType === 'safety-seeker' ? Colors.black : Colors.yellow} 
                  size={24} 
                />
                <View style={styles.userTypeContent}>
                  <Text style={[
                    styles.userTypeTitle,
                    userType === 'safety-seeker' && styles.selectedUserTypeText
                  ]}>
                    Safety Seeker
                  </Text>
                  <Text style={[
                    styles.userTypeDescription,
                    userType === 'safety-seeker' && styles.selectedUserTypeText
                  ]}>
                    Request help when feeling unsafe (Female users only)
                  </Text>
                </View>
                {userType === 'safety-seeker' && (
                  <CheckCircle color={Colors.black} size={20} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeCard,
                  userType === 'responder' && styles.selectedUserType
                ]}
                onPress={() => setUserType('responder')}
              >
                <Users 
                  color={userType === 'responder' ? Colors.black : Colors.yellow} 
                  size={24} 
                />
                <View style={styles.userTypeContent}>
                  <Text style={[
                    styles.userTypeTitle,
                    userType === 'responder' && styles.selectedUserTypeText
                  ]}>
                    Responder
                  </Text>
                  <Text style={[
                    styles.userTypeDescription,
                    userType === 'responder' && styles.selectedUserTypeText
                  ]}>
                    Help others in distress (All genders welcome)
                  </Text>
                </View>
                {userType === 'responder' && (
                  <CheckCircle color={Colors.black} size={20} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <User color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Mail color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff color={Colors.textMuted} size={20} />
                  ) : (
                    <Eye color={Colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Lock color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <EyeOff color={Colors.textMuted} size={20} />
                  ) : (
                    <Eye color={Colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View style={[
                styles.checkbox,
                agreedToTerms && styles.checkedCheckbox
              ]}>
                {agreedToTerms && (
                  <CheckCircle color={Colors.black} size={16} />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms of Service and Privacy Policy. I understand that SafeWatch may contact emergency services and that misuse may result in legal consequences.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.signUpButton,
                (!agreedToTerms || isLoading) && styles.disabledButton
              ]}
              onPress={handleSignUp}
              disabled={!agreedToTerms || isLoading}
            >
              <LinearGradient
                colors={[Colors.yellow, Colors.darkYellow]}
                style={styles.signUpButtonGradient}
              >
                <Text style={styles.signUpButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
                <ArrowRight color={Colors.black} size={20} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={handleSignIn}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  userTypeContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  userTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedUserType: {
    backgroundColor: Colors.yellow,
    borderColor: Colors.darkYellow,
  },
  userTypeContent: {
    flex: 1,
    marginLeft: 12,
  },
  userTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  userTypeDescription: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  selectedUserTypeText: {
    color: Colors.black,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkedCheckbox: {
    backgroundColor: Colors.yellow,
    borderColor: Colors.darkYellow,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  signUpButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  signUpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  signUpButtonText: {
    fontSize: 18,
    color: Colors.black,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  signInLink: {
    fontSize: 16,
    color: Colors.yellow,
    fontWeight: '600',
  },
});
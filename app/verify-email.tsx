import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Mail, 
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  RefreshCw
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';

export default function VerifyEmailScreen() {
  const { user, updateUser } = useAuth();
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, accept any 6-digit code
      if (verificationCode.length === 6) {
        await updateUser({ isEmailVerified: true });
        router.replace('/verify-phone');
      } else {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTimeLeft(60);
      setCanResend(false);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    router.back();
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
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Mail color={Colors.yellow} size={60} />
            </View>

            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We&apos;ve sent a 6-digit verification code to
            </Text>
            <Text style={styles.email}>{user?.email}</Text>

            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter 6-digit code"
                placeholderTextColor={Colors.textMuted}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textAlign="center"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (verificationCode.length !== 6 || isLoading) && styles.disabledButton
              ]}
              onPress={handleVerifyCode}
              disabled={verificationCode.length !== 6 || isLoading}
            >
              <LinearGradient
                colors={[Colors.yellow, Colors.darkYellow]}
                style={styles.verifyButtonGradient}
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify Email'}
                </Text>
                <CheckCircle color={Colors.black} size={20} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
              {canResend ? (
                <TouchableOpacity 
                  onPress={handleResendCode}
                  disabled={isResending}
                  style={styles.resendButton}
                >
                  <RefreshCw 
                    color={Colors.yellow} 
                    size={16} 
                    style={isResending ? styles.spinning : undefined}
                  />
                  <Text style={styles.resendLink}>
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend in {timeLeft}s
                </Text>
              )}
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: Colors.yellow,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  codeInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    letterSpacing: 8,
  },
  verifyButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  disabledButton: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  verifyButtonText: {
    fontSize: 18,
    color: Colors.black,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendLink: {
    fontSize: 14,
    color: Colors.yellow,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  spinning: {
    transform: [{ rotate: '180deg' }],
  },
});
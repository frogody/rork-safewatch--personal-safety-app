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
  Phone, 
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';
// Country data for phone verification
const COUNTRIES = [
  { flag: '🇺🇸', name: 'United States', code: 'US', callingCode: '1' },
  { flag: '🇬🇧', name: 'United Kingdom', code: 'GB', callingCode: '44' },
  { flag: '🇳🇱', name: 'Netherlands', code: 'NL', callingCode: '31' },
  { flag: '🇩🇪', name: 'Germany', code: 'DE', callingCode: '49' },
  { flag: '🇫🇷', name: 'France', code: 'FR', callingCode: '33' },
  { flag: '🇪🇸', name: 'Spain', code: 'ES', callingCode: '34' },
  { flag: '🇮🇹', name: 'Italy', code: 'IT', callingCode: '39' },
  { flag: '🇨🇦', name: 'Canada', code: 'CA', callingCode: '1' },
];

export default function VerifyPhoneScreen() {
  // Remove unused email param
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isPhoneSubmitted, setIsPhoneSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [countryCode, setCountryCode] = useState<string>('US');
  const [country, setCountry] = useState<any>(COUNTRIES[0]);
  const [callingCode, setCallingCode] = useState<string>('1');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);

  const { updateUser } = useAuth();

  useEffect(() => {
    if (isPhoneSubmitted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isPhoneSubmitted && timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, isPhoneSubmitted]);

  const handleSendCode = async () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (!phoneNumber.trim() || cleanedPhone.length < 7) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsPhoneSubmitted(true);
      setTimeLeft(60);
      setCanResend(false);
      const fullNumber = `+${callingCode} ${phoneNumber}`;
      Alert.alert('Code Sent', `A verification code has been sent to ${fullNumber}`);
    } catch {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        // Update user with verified phone number
        const fullPhoneNumber = `+${callingCode} ${phoneNumber}`;
        await updateUser({ 
          phoneNumber: fullPhoneNumber,
          isPhoneVerified: true,
          isEmailVerified: true,
          isVerified: true,
          profileComplete: true 
        });

        Alert.alert(
          'Phone Verified!',
          'Your phone number has been successfully verified. You can now use SafeWatch!',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to verify phone number. Please try again.');
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
      Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
    } catch {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    if (isPhoneSubmitted) {
      setIsPhoneSubmitted(false);
      setVerificationCode('');
    } else {
      router.back();
    }
  };

  const formatPhoneNumber = (text: string, countryCode: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Format based on country code
    if (countryCode === '1') { // US/Canada format
      if (cleaned.length >= 6) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      } else if (cleaned.length >= 3) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      } else {
        return cleaned;
      }
    } else if (countryCode === '44') { // UK format
      if (cleaned.length >= 7) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
      } else if (cleaned.length >= 4) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
      } else {
        return cleaned;
      }
    } else if (countryCode === '31') { // Netherlands format
      if (cleaned.length >= 6) {
        return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)}`;
      } else if (cleaned.length >= 2) {
        return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
      } else {
        return cleaned;
      }
    } else if (countryCode === '49') { // Germany format
      if (cleaned.length >= 7) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
      } else if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      } else {
        return cleaned;
      }
    } else {
      // Generic international format
      if (cleaned.length >= 6) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
      } else if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      } else {
        return cleaned;
      }
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text, callingCode);
    setPhoneNumber(formatted);
  };

  const onSelectCountry = (selectedCountry: any) => {
    setCountry(selectedCountry);
    setCountryCode(selectedCountry.code);
    setCallingCode(selectedCountry.callingCode);
    setShowCountryPicker(false);
    // Clear phone number when country changes
    setPhoneNumber('');
  };

  const getPhoneNumberLength = (countryCode: string) => {
    switch (countryCode) {
      case '1': return 14; // US/Canada: (XXX) XXX-XXXX
      case '44': return 13; // UK: XXXX XXX XXXX
      case '31': return 11; // Netherlands: XX XXX XXXX
      case '49': return 12; // Germany: XXX XXX XXXX
      default: return 15; // Generic international
    }
  };

  const getPlaceholderForCountry = (countryCode: string) => {
    switch (countryCode) {
      case '1': return '(555) 123-4567';
      case '44': return '7700 900123';
      case '31': return '06 12345678';
      case '49': return '030 12345678';
      default: return '123 456 7890';
    }
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
              <Phone color={Colors.yellow} size={60} />
            </View>

            <Text style={styles.title}>
              {isPhoneSubmitted ? 'Verify Your Phone' : 'Add Phone Number'}
            </Text>
            
            {!isPhoneSubmitted ? (
              <>
                <Text style={styles.subtitle}>
                  Your phone number will be used for emergency contacts and SMS verification
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.phoneInputRow}>
                    <TouchableOpacity 
                      style={styles.countrySelector}
                      onPress={() => setShowCountryPicker(true)}
                    >
                      <Text style={styles.countryFlag}>
                        {country?.flag || '🇺🇸'}
                      </Text>
                      <Text style={styles.callingCode}>+{callingCode}</Text>
                      <ChevronDown color={Colors.textMuted} size={16} />
                    </TouchableOpacity>
                    
                    <TextInput
                      style={styles.phoneInput}
                      placeholder={getPlaceholderForCountry(callingCode)}
                      placeholderTextColor={Colors.textMuted}
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      maxLength={getPhoneNumberLength(callingCode)}
                      autoFocus
                    />
                  </View>
                </View>

                {showCountryPicker && (
                  <View style={styles.countryPickerModal}>
                    <View style={styles.countryPickerContent}>
                      <Text style={styles.pickerTitle}>Select Country</Text>
                      {COUNTRIES.map((countryItem) => (
                        <TouchableOpacity 
                          key={countryItem.code}
                          style={styles.countryOption}
                          onPress={() => onSelectCountry(countryItem)}
                        >
                          <Text style={styles.countryText}>
                            {countryItem.flag} {countryItem.name} (+{countryItem.callingCode})
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity 
                        style={[styles.countryOption, styles.closeButton]}
                        onPress={() => setShowCountryPicker(false)}
                      >
                        <Text style={styles.closeText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (phoneNumber.replace(/\D/g, '').length < 7 || isLoading) && styles.disabledButton
                  ]}
                  onPress={handleSendCode}
                  disabled={phoneNumber.replace(/\D/g, '').length < 7 || isLoading}
                >
                  <LinearGradient
                    colors={[Colors.yellow, Colors.darkYellow]}
                    style={styles.sendButtonGradient}
                  >
                    <Text style={styles.sendButtonText}>
                      {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                    </Text>
                    <Phone color={Colors.black} size={20} />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  We&apos;ve sent a 6-digit verification code to
                </Text>
                <Text style={styles.phoneNumber}>+{callingCode} {phoneNumber}</Text>

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
                      {isLoading ? 'Verifying...' : 'Complete Setup'}
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
              </>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Emergency contacts can add your phone number to receive immediate alerts when you send a distress signal.
              </Text>
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
  phoneNumber: {
    fontSize: 16,
    color: Colors.yellow,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
    marginTop: 24,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 8,
    minWidth: 100,
  },
  countryFlag: {
    fontSize: 20,
  },
  callingCode: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 18,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
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
  sendButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
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
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  sendButtonText: {
    fontSize: 18,
    color: Colors.black,
    fontWeight: 'bold',
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
  infoBox: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  countryPickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countryPickerContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  countryOption: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  countryText: {
    fontSize: 16,
    color: Colors.text,
  },
  closeButton: {
    backgroundColor: Colors.error,
    marginTop: 20,
  },
  closeText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
  },
});
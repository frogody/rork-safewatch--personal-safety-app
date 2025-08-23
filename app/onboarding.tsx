import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Phone,
  MapPin
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';



interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  icon: React.ReactNode;
  stats?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to SafeWatch',
    subtitle: 'Your Personal Safety Network',
    content: 'SafeWatch connects you with a community of verified users who can respond to safety alerts in real-time. Together, we create safer spaces for everyone.',
    icon: <Shield color={Colors.yellow} size={80} />,
  },
  {
    id: 2,
    title: 'Violence Against Women Statistics',
    subtitle: 'The Reality We Face',
    content: '1 in 3 women worldwide experience physical or sexual violence. 35% of women have experienced intimate partner violence. Every 11 minutes, a woman is killed by an intimate partner.',
    icon: <AlertTriangle color={Colors.error} size={80} />,
    stats: '1 in 3 women affected globally',
  },
  {
    id: 3,
    title: 'How SafeWatch Helps',
    subtitle: 'Immediate Response Network',
    content: 'When you feel unsafe, SafeWatch immediately alerts verified users in your area. Our network provides rapid response, emergency contact notification, and location sharing with trusted individuals.',
    icon: <Users color={Colors.yellow} size={80} />,
    stats: '< 30 seconds average response time',
  },
  {
    id: 4,
    title: 'Serious Responsibility',
    subtitle: 'No Pranks or False Alerts',
    content: 'SafeWatch may alert emergency services based on your distress signals. Any abuse of the system is reported and may lead to prosecution. This is a life-saving tool - please use it responsibly.',
    icon: <UserCheck color={Colors.error} size={80} />,
  },
  {
    id: 5,
    title: 'User Types',
    subtitle: 'Safety Seekers & Responders',
    content: 'Currently, only female users can be Safety Seekers. Male users can sign up as Responders to help others in distress. This policy ensures the safety and comfort of our primary user base.',
    icon: <Users color={Colors.yellow} size={80} />,
  },
  {
    id: 6,
    title: 'Identity Verification Required',
    subtitle: 'Passport, ID Card, or Driver\'s License',
    content: 'All users must verify their identity using valid government-issued documents. This prevents system abuse and enables faster emergency response when distress signals are sent.',
    icon: <CheckCircle color={Colors.success} size={80} />,
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const { completeOnboarding } = useAuth();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await completeOnboarding();
    router.replace('/signin');
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} of {onboardingSteps.length}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              {step.icon}
            </View>

            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.subtitle}>{step.subtitle}</Text>
            
            {step.stats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>{step.stats}</Text>
              </View>
            )}

            <Text style={styles.contentText}>{step.content}</Text>

            {step.id === 4 && (
              <View style={styles.warningBox}>
                <AlertTriangle color={Colors.error} size={24} />
                <Text style={styles.warningText}>
                  Misuse of emergency features may result in legal consequences
                </Text>
              </View>
            )}

            {step.id === 6 && (
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Phone color={Colors.yellow} size={20} />
                  <Text style={styles.featureText}>Faster emergency response</Text>
                </View>
                <View style={styles.featureItem}>
                  <MapPin color={Colors.yellow} size={20} />
                  <Text style={styles.featureText}>Accurate location sharing</Text>
                </View>
                <View style={styles.featureItem}>
                  <Shield color={Colors.yellow} size={20} />
                  <Text style={styles.featureText}>Verified user network</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.navigation}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.previousButton,
              currentStep === 0 && styles.disabledButton
            ]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft 
              color={currentStep === 0 ? Colors.textDisabled : Colors.text} 
              size={20} 
            />
            <Text style={[
              styles.navButtonText,
              currentStep === 0 && styles.disabledText
            ]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <LinearGradient
              colors={[Colors.yellow, Colors.darkYellow]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
              <ArrowRight color={Colors.black} size={20} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.yellow,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.yellow,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.yellow,
  },
  statsText: {
    fontSize: 16,
    color: Colors.yellow,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  featureList: {
    gap: 16,
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  previousButton: {
    opacity: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  disabledText: {
    color: Colors.textDisabled,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  nextButtonText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: 'bold',
  },
});
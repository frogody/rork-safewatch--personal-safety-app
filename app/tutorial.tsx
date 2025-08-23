import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  Shield,
  AlertTriangle,
  Users,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  ArrowRight,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

const { width } = Dimensions.get('window');

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Safety Monitoring',
    description: 'Start monitoring when you feel unsafe or are traveling alone',
    icon: <Shield color={Colors.yellow} size={60} />,
    tips: [
      'Tap "Start Monitoring" when you feel unsafe',
      'Your location is tracked for safety',
      'Community members can see you need help',
      'Stop monitoring when you feel safe again'
    ]
  },
  {
    id: 2,
    title: 'Emergency Alerts',
    description: 'Send immediate distress signals when you need help',
    icon: <AlertTriangle color={Colors.error} size={60} />,
    tips: [
      'Press "I Feel Unsafe" to start 60-second timer',
      'Cancel within 60 seconds if false alarm',
      'After 60 seconds, alert goes to nearby users',
      'Emergency contacts are notified immediately'
    ]
  },
  {
    id: 3,
    title: 'Community Response',
    description: 'Help others and get help from verified community members',
    icon: <Users color={Colors.yellow} size={60} />,
    tips: [
      'Respond to alerts from nearby users',
      'All users are identity-verified',
      'Choose to acknowledge or actively respond',
      'Build a network of trusted helpers'
    ]
  },
  {
    id: 4,
    title: 'Location Sharing',
    description: 'Share your travel plans and get monitored for unexpected stops',
    icon: <MapPin color={Colors.yellow} size={60} />,
    tips: [
      'Set your destination before traveling',
      'Choose your transport method',
      'Get alerts if you stop unexpectedly',
      'Automatic escalation if no response'
    ]
  },
  {
    id: 5,
    title: 'Emergency Contacts',
    description: 'Add trusted contacts who will be notified in emergencies',
    icon: <Phone color={Colors.yellow} size={60} />,
    tips: [
      'Add family and close friends',
      'They get immediate notifications',
      'Include phone numbers for calls',
      'Set one as primary contact'
    ]
  }
];

export default function TutorialScreen() {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const handleBack = () => {
    router.back();
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.back();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    router.back();
  };

  const currentStepData = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

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
          <Text style={styles.headerTitle}>How SafeWatch Works</Text>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <X color={Colors.textMuted} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {tutorialSteps.length}
          </Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>

            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
            <Text style={styles.stepDescription}>{currentStepData.description}</Text>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Key Points:</Text>
              {currentStepData.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <CheckCircle color={Colors.yellow} size={16} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
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

          <View style={styles.stepIndicators}>
            {tutorialSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  index === currentStep && styles.activeStepDot
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <LinearGradient
              colors={[Colors.yellow, Colors.darkYellow]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Got it!' : 'Next'}
              </Text>
              {isLastStep ? (
                <CheckCircle color={Colors.black} size={20} />
              ) : (
                <ArrowRight color={Colors.black} size={20} />
              )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  skipButton: {
    padding: 8,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 20,
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
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 18,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
  stepIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  activeStepDot: {
    backgroundColor: Colors.yellow,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextButtonText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: 'bold',
  },
});
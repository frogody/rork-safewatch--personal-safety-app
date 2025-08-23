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
  User, 
  MapPin, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Users,
  Phone,
  Plus,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/store/auth-store';
import { Colors } from '@/constants/colors';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export default function ProfileSetupScreen() {
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [profileData, setProfileData] = useState({
    age: '',
    location: '',
    bio: '',
  });
  
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { id: '1', name: '', phone: '', relationship: '' }
  ]);

  const steps = [
    {
      title: 'Complete Your Profile',
      subtitle: 'Help us personalize your safety experience',
      component: 'profile'
    },
    {
      title: 'Emergency Contacts',
      subtitle: 'Add trusted contacts for emergencies',
      component: 'contacts'
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const addEmergencyContact = () => {
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: '',
      phone: '',
      relationship: ''
    };
    setEmergencyContacts(prev => [...prev, newContact]);
  };

  const removeEmergencyContact = (id: string) => {
    if (emergencyContacts.length > 1) {
      setEmergencyContacts(prev => prev.filter(contact => contact.id !== id));
    }
  };

  const updateEmergencyContact = (id: string, field: string, value: string) => {
    setEmergencyContacts(prev => 
      prev.map(contact => 
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const validateCurrentStep = () => {
    if (currentStep === 0) {
      if (!profileData.age || !profileData.location) {
        Alert.alert('Error', 'Please fill in all required fields');
        return false;
      }
    } else if (currentStep === 1) {
      const validContacts = emergencyContacts.filter(
        contact => contact.name.trim() && contact.phone.trim() && contact.relationship.trim()
      );
      if (validContacts.length === 0) {
        Alert.alert('Error', 'Please add at least one emergency contact');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const validContacts = emergencyContacts.filter(
        contact => contact.name.trim() && contact.phone.trim() && contact.relationship.trim()
      );

      await updateUser({
        profileComplete: true,
        // Store additional profile data (in a real app, you'd extend the User interface)
      });

      Alert.alert(
        'Profile Complete!',
        'Your profile has been set up successfully. You can now use all SafeWatch features.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to complete profile setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputContainer}>
        <Calendar color={Colors.textMuted} size={20} />
        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor={Colors.textMuted}
          value={profileData.age}
          onChangeText={(value) => handleInputChange('age', value)}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      <View style={styles.inputContainer}>
        <MapPin color={Colors.textMuted} size={20} />
        <TextInput
          style={styles.input}
          placeholder="City, State/Country"
          placeholderTextColor={Colors.textMuted}
          value={profileData.location}
          onChangeText={(value) => handleInputChange('location', value)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <User color={Colors.textMuted} size={20} />
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Brief bio (optional)"
          placeholderTextColor={Colors.textMuted}
          value={profileData.bio}
          onChangeText={(value) => handleInputChange('bio', value)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          This information helps us provide better safety recommendations and connect you with nearby community members.
        </Text>
      </View>
    </View>
  );

  const renderContactsStep = () => (
    <View style={styles.stepContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {emergencyContacts.map((contact, index) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>Contact {index + 1}</Text>
              {emergencyContacts.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeEmergencyContact(contact.id)}
                  style={styles.removeButton}
                >
                  <X color={Colors.error} size={20} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contactInputs}>
              <View style={styles.inputContainer}>
                <User color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={contact.name}
                  onChangeText={(value) => updateEmergencyContact(contact.id, 'name', value)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Phone color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={Colors.textMuted}
                  value={contact.phone}
                  onChangeText={(value) => updateEmergencyContact(contact.id, 'phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Users color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Relationship (e.g., Parent, Friend)"
                  placeholderTextColor={Colors.textMuted}
                  value={contact.relationship}
                  onChangeText={(value) => updateEmergencyContact(contact.id, 'relationship', value)}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addContactButton}
          onPress={addEmergencyContact}
        >
          <Plus color={Colors.yellow} size={20} />
          <Text style={styles.addContactText}>Add Another Contact</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Emergency contacts will be notified immediately when you send a distress signal. Make sure to inform them about SafeWatch.
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  const currentStepData = steps[currentStep];

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
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentStep + 1) / steps.length) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} of {steps.length}
              </Text>
            </View>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{currentStepData.title}</Text>
              <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            </View>

            {currentStep === 0 && renderProfileStep()}
            {currentStep === 1 && renderContactsStep()}
          </ScrollView>

          <View style={styles.navigation}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                isLoading && styles.disabledButton
              ]}
              onPress={handleNext}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.yellow, Colors.darkYellow]}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {isLoading 
                    ? 'Completing...' 
                    : currentStep === steps.length - 1 
                      ? 'Complete Setup' 
                      : 'Next'
                  }
                </Text>
                {currentStep === steps.length - 1 ? (
                  <CheckCircle color={Colors.black} size={20} />
                ) : (
                  <ArrowRight color={Colors.black} size={20} />
                )}
              </LinearGradient>
            </TouchableOpacity>
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
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
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
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  bioInput: {
    minHeight: 80,
  },
  contactCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  removeButton: {
    padding: 4,
  },
  contactInputs: {
    gap: 12,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.yellow,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 24,
  },
  addContactText: {
    fontSize: 16,
    color: Colors.yellow,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  navigation: {
    padding: 24,
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  nextButtonText: {
    fontSize: 18,
    color: Colors.black,
    fontWeight: 'bold',
  },
});
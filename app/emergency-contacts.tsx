import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Phone,
  User,
  Users,
  Save,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      phone: '+1 (555) 123-4567',
      relationship: 'Mother',
      isPrimary: true,
    },
    {
      id: '2',
      name: 'Mike Thompson',
      phone: '+1 (555) 987-6543',
      relationship: 'Partner',
      isPrimary: false,
    },
  ]);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
  });

  const handleBack = () => {
    router.back();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', relationship: '' });
    setEditingContact(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    });
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return false;
    }
    if (!formData.relationship.trim()) {
      Alert.alert('Error', 'Please enter the relationship');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (editingContact) {
      // Update existing contact
      setContacts(prev =>
        prev.map(contact =>
          contact.id === editingContact.id
            ? { ...contact, ...formData }
            : contact
        )
      );
      Alert.alert('Success', 'Contact updated successfully');
    } else {
      // Add new contact
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        ...formData,
        isPrimary: contacts.length === 0,
      };
      setContacts(prev => [...prev, newContact]);
      Alert.alert('Success', 'Contact added successfully');
    }

    closeModal();
  };

  const handleDelete = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setContacts(prev => {
              const filtered = prev.filter(c => c.id !== contactId);
              // If we deleted the primary contact, make the first remaining contact primary
              if (contact.isPrimary && filtered.length > 0) {
                filtered[0].isPrimary = true;
              }
              return filtered;
            });
          },
        },
      ]
    );
  };

  const handleSetPrimary = (contactId: string) => {
    setContacts(prev =>
      prev.map(contact => ({
        ...contact,
        isPrimary: contact.id === contactId,
      }))
    );
    Alert.alert('Success', 'Primary contact updated');
  };

  const handleTestCall = (contact: EmergencyContact) => {
    Alert.alert(
      'Test Call',
      `This would call ${contact.name} at ${contact.phone}. In a real emergency, they would receive an automated message about your distress signal.`,
      [{ text: 'OK' }]
    );
  };

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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Plus color={Colors.yellow} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              When you send a distress signal, your emergency contacts will receive an immediate notification with your location and a request for help.
            </Text>
          </View>

          <View style={styles.contactsList}>
            {contacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Users color={Colors.textMuted} size={48} />
                <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
                <Text style={styles.emptySubtitle}>
                  Add trusted contacts who can help you in emergencies
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                  <Text style={styles.emptyButtonText}>Add First Contact</Text>
                </TouchableOpacity>
              </View>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactHeader}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                    <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  </View>

                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleTestCall(contact)}
                    >
                      <Phone color={Colors.yellow} size={20} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(contact)}
                    >
                      <Edit3 color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(contact.id)}
                    >
                      <Trash2 color={Colors.error} size={20} />
                    </TouchableOpacity>
                  </View>

                  {!contact.isPrimary && (
                    <TouchableOpacity
                      style={styles.setPrimaryButton}
                      onPress={() => handleSetPrimary(contact.id)}
                    >
                      <Text style={styles.setPrimaryText}>Set as Primary</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Add/Edit Contact Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <X color={Colors.textMuted} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
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
                  <Phone color={Colors.textMuted} size={20} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor={Colors.textMuted}
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Users color={Colors.textMuted} size={20} />
                  <TextInput
                    style={styles.input}
                    placeholder="Relationship (e.g., Mother, Friend)"
                    placeholderTextColor={Colors.textMuted}
                    value={formData.relationship}
                    onChangeText={(value) => handleInputChange('relationship', value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={[Colors.yellow, Colors.darkYellow]}
                  style={styles.saveButtonGradient}
                >
                  <Save color={Colors.black} size={20} />
                  <Text style={styles.saveButtonText}>
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  contactsList: {
    gap: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  contactCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  primaryBadge: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.black,
  },
  contactPhone: {
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  setPrimaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.yellow,
  },
  setPrimaryText: {
    fontSize: 12,
    color: Colors.yellow,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
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
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: 'bold',
  },
});
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

const CONTACTS_KEY = '@safewatch_contacts_v1';

export async function loadContacts(): Promise<EmergencyContact[]> {
  try {
    const raw = await AsyncStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: EmergencyContact[]): Promise<void> {
  await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export async function getPrimaryContact(): Promise<EmergencyContact | null> {
  const contacts = await loadContacts();
  return contacts.find(c => c.isPrimary) || contacts[0] || null;
}

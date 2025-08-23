import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MapPin, Shield, Search, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface CommunityMember {
  id: string;
  name: string;
  distance: number;
  responseTime: string;
  rating: number;
  isOnline: boolean;
  helpedCount: number;
}

const mockMembers: CommunityMember[] = [
  {
    id: '1',
    name: 'Sarah M.',
    distance: 0.3,
    responseTime: '< 2 min',
    rating: 4.9,
    isOnline: true,
    helpedCount: 23,
  },
  {
    id: '2',
    name: 'Mike R.',
    distance: 0.5,
    responseTime: '< 3 min',
    rating: 4.8,
    isOnline: true,
    helpedCount: 18,
  },
  {
    id: '3',
    name: 'Emma L.',
    distance: 0.7,
    responseTime: '< 5 min',
    rating: 4.7,
    isOnline: false,
    helpedCount: 31,
  },
  {
    id: '4',
    name: 'David K.',
    distance: 1.2,
    responseTime: '< 4 min',
    rating: 4.9,
    isOnline: true,
    helpedCount: 27,
  },
];

export default function CommunityScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'online' | 'nearby'>('all');

  const filteredMembers = mockMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'online' && member.isOnline) ||
      (selectedFilter === 'nearby' && member.distance <= 0.5);
    
    return matchesSearch && matchesFilter;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={12}
        color={index < Math.floor(rating) ? Colors.yellow : Colors.textMuted}
        fill={index < Math.floor(rating) ? Colors.yellow : "transparent"}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSubtitle}>
          {mockMembers.filter(m => m.isOnline).length} members online nearby
        </Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color={Colors.textMuted} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search community members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            { key: 'all', label: 'All Members' },
            { key: 'online', label: 'Online' },
            { key: 'nearby', label: 'Nearby' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Users color={Colors.yellow} size={24} />
            <Text style={styles.statNumber}>1,247</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>
          
          <View style={styles.statItem}>
            <Shield color={Colors.yellow} size={24} />
            <Text style={styles.statNumber}>98.7%</Text>
            <Text style={styles.statLabel}>Response Rate</Text>
          </View>
          
          <View style={styles.statItem}>
            <MapPin color={Colors.yellow} size={24} />
            <Text style={styles.statNumber}>2.3 min</Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Nearby Members</Text>
          
          {filteredMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: member.isOnline ? Colors.yellow : Colors.textMuted }
                    ]} />
                  </View>
                  
                  <View style={styles.memberStats}>
                    <View style={styles.ratingContainer}>
                      {renderStars(member.rating)}
                      <Text style={styles.ratingText}>{member.rating}</Text>
                    </View>
                    
                    <Text style={styles.helpedCount}>
                      Helped {member.helpedCount} people
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.memberDetails}>
                <View style={styles.detailItem}>
                  <MapPin color={Colors.textMuted} size={16} />
                  <Text style={styles.detailText}>{member.distance} mi away</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Shield color={Colors.textMuted} size={16} />
                  <Text style={styles.detailText}>
                    Responds in {member.responseTime}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.connectButton}>
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.yellow,
    borderColor: Colors.yellow,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  filterButtonTextActive: {
    color: Colors.black,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.yellow,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberHeader: {
    marginBottom: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 4,
  },
  helpedCount: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  memberDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  connectButton: {
    backgroundColor: Colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
});
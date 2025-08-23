import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Clock, MapPin, CheckCircle, XCircle, Info, Navigation, Phone, Users, Calendar } from 'lucide-react-native';
import { useSafetyStore, SafetyAlert } from '@/store/safety-store';
import { Colors } from '@/constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AlertsScreen() {
  const { alerts, respondToAlert, isLoading, refetchAlerts } = useSafetyStore();
  const [selectedAlert, setSelectedAlert] = useState<SafetyAlert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleResponse = (alertId: string, response: 'acknowledge' | 'respond') => {
    respondToAlert(alertId, response);
  };

  const openAlertDetails = (alert: SafetyAlert) => {
    setSelectedAlert(alert);
    setShowDetailModal(true);
  };

  const closeAlertDetails = () => {
    setShowDetailModal(false);
    setSelectedAlert(null);
  };

  const openInMaps = (latitude: number, longitude: number, address?: string) => {
    const label = address || 'Alert Location';
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(label)})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    
    if (url) {
      Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
    }
  };

  const callEmergencyServices = () => {
    const phoneNumber = Platform.select({
      ios: 'tel:911',
      android: 'tel:911',
      web: 'tel:911',
    });
    
    if (phoneNumber) {
      Linking.openURL(phoneNumber).catch(err => console.error('Error making call:', err));
    }
  };

  const getAlertPriority = (alert: SafetyAlert) => {
    if (alert.status === 'active') {
      const timeSinceAlert = Date.now() - alert.timestamp.getTime();
      if (timeSinceAlert > 10 * 60 * 1000) return 'Critical'; // Over 10 minutes
      if (timeSinceAlert > 5 * 60 * 1000) return 'High'; // Over 5 minutes
      return 'Medium';
    }
    return 'Low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return Colors.error;
      case 'High': return '#FF6B35';
      case 'Medium': return Colors.yellow;
      default: return Colors.textMuted;
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(timestamp);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.error;
      case 'acknowledged': return Colors.yellow;
      case 'resolved': return Colors.success;
      default: return Colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return AlertTriangle;
      case 'acknowledged': return Clock;
      case 'resolved': return CheckCircle;
      default: return XCircle;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Safety Alerts</Text>
          {isLoading && (
            <View style={styles.syncIndicator}>
              <Text style={styles.syncText}>🔄 Syncing...</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          {alerts.filter(a => a.status === 'active').length} active alerts • Real-time sync enabled
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertTriangle color={Colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>No alerts yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see safety alerts from nearby users here
            </Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const StatusIcon = getStatusIcon(alert.status);
            const statusColor = getStatusColor(alert.status);

            return (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertStatus}>
                    <StatusIcon color={statusColor} size={20} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {alert.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.alertTime}>
                    {formatTime(alert.timestamp)}
                  </Text>
                </View>

                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertDescription}>{alert.description}</Text>

                <View style={styles.locationInfo}>
                  <MapPin color={Colors.textMuted} size={16} />
                  <Text style={styles.locationText}>
                    {alert.location.address || 
                     `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.moreInfoButton}
                    onPress={() => openAlertDetails(alert)}
                  >
                    <Info color={Colors.primary} size={16} />
                    <Text style={styles.moreInfoText}>More Info</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => refetchAlerts()}
                  >
                    <Text style={styles.refreshText}>🔄 Refresh</Text>
                  </TouchableOpacity>
                </View>

                {alert.status === 'active' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acknowledgeButton]}
                      onPress={() => handleResponse(alert.id, 'acknowledge')}
                    >
                      <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.respondButton]}
                      onPress={() => handleResponse(alert.id, 'respond')}
                    >
                      <Text style={styles.respondButtonText}>I'm Responding</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {alert.responses && alert.responses.length > 0 && (
                  <View style={styles.responsesSection}>
                    <Text style={styles.responsesTitle}>
                      {alert.responses.length} Response{alert.responses.length !== 1 ? 's' : ''}
                    </Text>
                    {alert.responses.slice(0, 3).map((response, index) => (
                      <View key={index} style={styles.responseItem}>
                        <CheckCircle color={Colors.success} size={16} />
                        <Text style={styles.responseText}>
                          User responded • {formatTime(response.timestamp)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Alert Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAlertDetails}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Alert Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeAlertDetails}
            >
              <XCircle color={Colors.textMuted} size={24} />
            </TouchableOpacity>
          </View>

          {selectedAlert && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Alert Status & Priority */}
              <View style={styles.detailSection}>
                <View style={styles.statusRow}>
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedAlert.status) }]}>
                      {selectedAlert.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(getAlertPriority(selectedAlert)) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(getAlertPriority(selectedAlert)) }]}>
                      {getAlertPriority(selectedAlert)} Priority
                    </Text>
                  </View>
                </View>
              </View>

              {/* Alert Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Alert Information</Text>
                <Text style={styles.alertTitleLarge}>{selectedAlert.title}</Text>
                <Text style={styles.alertDescriptionLarge}>{selectedAlert.description}</Text>
                
                <View style={styles.timeInfo}>
                  <Calendar color={Colors.textMuted} size={16} />
                  <Text style={styles.timeText}>
                    {formatTime(selectedAlert.timestamp)} • {Math.round((Date.now() - selectedAlert.timestamp.getTime()) / (1000 * 60))} minutes ago
                  </Text>
                </View>
              </View>

              {/* Location Details */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationCard}>
                  <View style={styles.locationHeader}>
                    <MapPin color={Colors.primary} size={20} />
                    <Text style={styles.locationTitle}>Person in Distress Location</Text>
                  </View>
                  
                  <Text style={styles.locationAddress}>
                    {selectedAlert.location.address || 'Address not available'}
                  </Text>
                  
                  <Text style={styles.coordinates}>
                    {selectedAlert.location.latitude.toFixed(6)}, {selectedAlert.location.longitude.toFixed(6)}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => openInMaps(selectedAlert.location.latitude, selectedAlert.location.longitude, selectedAlert.location.address)}
                  >
                    <Navigation color={Colors.secondary} size={16} />
                    <Text style={styles.mapButtonText}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Response Information */}
              {selectedAlert.responses && selectedAlert.responses.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Community Response</Text>
                  <View style={styles.responseStats}>
                    <View style={styles.responseStat}>
                      <Users color={Colors.primary} size={16} />
                      <Text style={styles.responseStatText}>
                        {selectedAlert.responses.length} {selectedAlert.responses.length === 1 ? 'Person' : 'People'} Responded
                      </Text>
                    </View>
                  </View>
                  
                  {selectedAlert.responses.map((response, index) => (
                    <View key={index} style={styles.responseDetail}>
                      <View style={styles.responseIcon}>
                        {response.action === 'respond' ? (
                          <CheckCircle color={Colors.success} size={16} />
                        ) : (
                          <Clock color={Colors.yellow} size={16} />
                        )}
                      </View>
                      <View style={styles.responseInfo}>
                        <Text style={styles.responseAction}>
                          {response.action === 'respond' ? 'Responding to help' : 'Acknowledged alert'}
                        </Text>
                        <Text style={styles.responseTime}>
                          {formatTime(response.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Emergency Actions */}
              {selectedAlert.status === 'active' && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Emergency Actions</Text>
                  
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={callEmergencyServices}
                  >
                    <Phone color={Colors.secondary} size={18} />
                    <Text style={styles.emergencyButtonText}>Call Emergency Services</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.actionButtonsModal}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acknowledgeButton]}
                      onPress={() => {
                        handleResponse(selectedAlert.id, 'acknowledge');
                        closeAlertDetails();
                      }}
                    >
                      <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.respondButton]}
                      onPress={() => {
                        handleResponse(selectedAlert.id, 'respond');
                        closeAlertDetails();
                      }}
                    >
                      <Text style={styles.respondButtonText}>I'm Responding</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Case Details */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Case Details</Text>
                <View style={styles.caseInfo}>
                  <View style={styles.caseRow}>
                    <Text style={styles.caseLabel}>Alert ID:</Text>
                    <Text style={styles.caseValue}>{selectedAlert.id}</Text>
                  </View>
                  {selectedAlert.currentBatch && (
                    <View style={styles.caseRow}>
                      <Text style={styles.caseLabel}>Response Batch:</Text>
                      <Text style={styles.caseValue}>{selectedAlert.currentBatch} of {selectedAlert.maxBatches}</Text>
                    </View>
                  )}
                  {selectedAlert.responseDeadline && selectedAlert.status === 'active' && (
                    <View style={styles.caseRow}>
                      <Text style={styles.caseLabel}>Response Deadline:</Text>
                      <Text style={styles.caseValue}>{formatTime(selectedAlert.responseDeadline)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncIndicator: {
    backgroundColor: Colors.yellow + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncText: {
    fontSize: 12,
    color: Colors.yellow,
    fontWeight: '600',
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  alertCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  acknowledgeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  respondButton: {
    backgroundColor: Colors.yellow,
  },
  respondButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  responsesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  responsesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  responseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  cardActions: {
    marginBottom: 12,
  },
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    gap: 6,
  },
  moreInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertTitleLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  alertDescriptionLarge: {
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 24,
    marginBottom: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  locationCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  locationAddress: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  coordinates: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 16,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  responseStats: {
    marginBottom: 16,
  },
  responseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  responseDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  responseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseInfo: {
    flex: 1,
  },
  responseAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  responseTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  actionButtonsModal: {
    flexDirection: 'row',
    gap: 12,
  },
  caseInfo: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  caseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  caseLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  caseValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
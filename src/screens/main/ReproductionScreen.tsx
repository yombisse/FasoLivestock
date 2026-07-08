import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Modalize } from 'react-native-modalize';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import reproductionService from '../../services/reproduction.service';
import { authStorage } from '../../storage/authStorage';
import { ReproductionEvent, ReproductionEventType } from '../../types/reproduction.types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Configuration des types reproductifs avec icônes et couleurs
const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  'Chaleur': { icon: 'fire', color: '#ff9800' },
  'Saillie': { icon: 'heart-pulse', color: '#e91e63' },
  'Gestation confirmée': { icon: 'human-female', color: '#9c27b0' },
  'Mise bas': { icon: 'baby-face-outline', color: '#4caf50' },
};

// Types à exclure (mouvements, non reproductifs)
const EXCLUDED_TYPES = ['Vente', 'Achat', 'Décès', 'Transfert', 'Perte', 'Abattage'];

const ReproductionScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventTypes, setEventTypes] = useState<ReproductionEventType[]>([]);
  const [events, setEvents] = useState<ReproductionEvent[]>([]);
  const [females, setFemales] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ReproductionEvent | null>(null);
  const detailsBottomSheetRef = useRef<Modalize>(null);

  const loadActiveFarm = async () => {
    try {
      const activeFarm = await authStorage.getItem('active_farm');
      if (activeFarm) {
        const farm = JSON.parse(activeFarm);
        setFarmId(farm.id);
        return farm;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const farm = await loadActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }
      
      // Use local repositories for offline-first pattern
      const { getLocalTypeEvenements } = await import('../../database/repositories/typeEvenementRepository');
      const { getLocalAnimals } = await import('../../database/repositories/animalRepository');
      const { getReproductionEvents } = await import('../../database/repositories/reproductionRepository');
      
      const [types, femalesData, eventsData] = await Promise.all([
        getLocalTypeEvenements(),
        getLocalAnimals(farm.id),
        getReproductionEvents(farm.id),
      ]);
      
      // Filtrer les types reproductifs (exclure mouvements)
      const reproductionTypes = types.filter(
        (type) => !EXCLUDED_TYPES.includes(type.nom_type)
      );
      setEventTypes(reproductionTypes);
      setFemales(femalesData.filter((a: any) => a.sexe === 'femelle' && a.statut === 'ACTIF'));
      setEvents(eventsData);
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError(e.message || 'Impossible de charger la reproduction');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const openAddEventScreen = () => {
    navigation.navigate('AddReproductionEvent' as never);
  };

  const handleEventPress = (event: ReproductionEvent) => {
    setSelectedEvent(event);
    detailsBottomSheetRef.current?.open();
  };

  const getSyncStatusConfig = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'synced':
        return { icon: 'check-circle', color: '#4CAF50', text: 'Synchronisé' };
      case 'pending':
        return { icon: 'clock-outline', color: '#FF9800', text: 'En attente' };
      case 'failed':
        return { icon: 'alert-circle', color: '#F44336', text: 'Échec' };
      default:
        return { icon: 'check-circle', color: '#4CAF50', text: 'Synchronisé' };
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reproduction" subtitle="Suivi reproductif" showBackground showMenuButton onMenuPress={() => (navigation as any).openDrawer()} />
      <View style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}
        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2E7D32" /></View>
        ) : (
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />} style={styles.scrollView}>
            <AppText style={styles.sectionTitle}>Événements reproductifs</AppText>
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="cow" size={48} color="#BDBDBD" />
                <AppText style={styles.emptyText} color="#757575">Aucun événement reproductif</AppText>
              </View>
            ) : (
              events.map((event) => {
                const eventType = eventTypes.find((t: ReproductionEventType) => t.id === event.type_evenement_id);
                const config = TYPE_CONFIG[eventType?.nom_type || ''] || { icon: 'information', color: '#757575' };
                const female = females.find((f: any) => f.id === event.animal_id);
                const syncConfig = getSyncStatusConfig(event.sync_status);
                return (
                  <TouchableOpacity 
                    key={event.id} 
                    style={styles.eventCard}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={styles.eventHeader}>
                      <View style={[styles.eventIcon, { backgroundColor: config.color + '20' }]}>
                        <MaterialCommunityIcons name={config.icon} size={24} color={config.color} />
                      </View>
                      <View style={styles.eventInfo}>
                        <AppText style={styles.eventType}>{eventType?.nom_type || 'Événement'}</AppText>
                        <AppText style={styles.eventFemale}>{female?.nom || 'Femelle inconnue'}</AppText>
                      </View>
                      <View style={styles.eventRight}>
                        <AppText style={styles.eventDate}>{event.date_evenement}</AppText>
                        <MaterialCommunityIcons name={syncConfig.icon} size={16} color={syncConfig.color} />
                      </View>
                    </View>
                    {event.description && <AppText style={styles.eventDescription} color="#757575">{event.description}</AppText>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
        <TouchableOpacity style={styles.fab} onPress={openAddEventScreen}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modalize
        ref={detailsBottomSheetRef}
        adjustToContentHeight
        modalStyle={styles.bottomSheetModal}
        handleStyle={styles.bottomSheetHandle}
      >
        {selectedEvent && (
          <View style={styles.bottomSheetContent}>
            <AppText style={styles.bottomSheetTitle}>Détails de l'événement</AppText>
            
            <View style={styles.detailRow}>
              <AppText style={styles.detailLabel}>Type</AppText>
              <View style={styles.detailValue}>
                {(() => {
                  const eventType = eventTypes.find((t: ReproductionEventType) => t.id === selectedEvent.type_evenement_id);
                  const config = TYPE_CONFIG[eventType?.nom_type || ''] || { icon: 'information', color: '#757575' };
                  return (
                    <>
                      <MaterialCommunityIcons name={config.icon} size={24} color={config.color} />
                      <AppText style={styles.detailTypeText}>{eventType?.nom_type || 'Événement'}</AppText>
                    </>
                  );
                })()}
              </View>
            </View>

            <View style={styles.detailRow}>
              <AppText style={styles.detailLabel}>Femelle</AppText>
              <AppText style={styles.detailValueText}>
                {(() => {
                  const female = females.find((f: any) => f.id === selectedEvent.animal_id);
                  return female?.nom || 'Femelle inconnue';
                })()}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <AppText style={styles.detailLabel}>Date</AppText>
              <AppText style={styles.detailValueText}>{selectedEvent.date_evenement}</AppText>
            </View>

            {selectedEvent.description && (
              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Description</AppText>
                <AppText style={styles.detailValueText}>{selectedEvent.description}</AppText>
              </View>
            )}

            {selectedEvent.cout && (
              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Coût</AppText>
                <AppText style={styles.detailValueText}>{selectedEvent.cout} FCFA</AppText>
              </View>
            )}

            <View style={styles.syncStatusRow}>
              <AppText style={styles.detailLabel}>Synchronisation</AppText>
              <View style={styles.syncStatusBadge}>
                {(() => {
                  const syncConfig = getSyncStatusConfig(selectedEvent.sync_status);
                  return (
                    <>
                      <MaterialCommunityIcons name={syncConfig.icon} size={20} color={syncConfig.color} />
                      <AppText style={[styles.syncStatusText, { color: syncConfig.color }]}>{syncConfig.text}</AppText>
                    </>
                  );
                })()}
              </View>
            </View>

            <View style={styles.detailActions}>
              <AppButton 
                title="Fermer" 
                onPress={() => detailsBottomSheetRef.current?.close()} 
                style={styles.closeButton} 
              />
            </View>
          </View>
        )}
      </Modalize>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { flex: 1, padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, borderRadius: 12, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, paddingVertical: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 16, fontSize: 16 },
  eventCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  eventHeader: { flexDirection: 'row', alignItems: 'center' },
  eventIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventInfo: { flex: 1 },
  eventType: { fontWeight: '700', fontSize: 16 },
  eventFemale: { color: '#757575', fontSize: 14, marginTop: 2 },
  eventRight: { alignItems: 'flex-end' },
  eventDate: { color: '#757575', fontSize: 12 },
  eventDescription: { marginTop: 8, fontSize: 14 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  errorBanner: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 10 },
  errorText: { color: '#C62828' },
  bottomSheetModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF' },
  bottomSheetHandle: { backgroundColor: '#E0E0E0', width: 40, height: 4 },
  bottomSheetContent: { paddingHorizontal: 16, paddingVertical: 20 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailLabel: { fontSize: 14, color: '#757575', fontWeight: '500' },
  detailValue: { flexDirection: 'row', alignItems: 'center' },
  detailValueText: { fontSize: 16, fontWeight: '600' },
  detailTypeText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  syncStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  syncStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F5F5F5' },
  syncStatusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  detailActions: { marginTop: 20 },
  closeButton: { backgroundColor: '#F5F5F5' },
  formScrollView: { maxHeight: 500 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  femaleSection: { marginBottom: 16 },
  femaleList: { maxHeight: 150 },
  femaleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#F5F5F5', borderRadius: 8, marginBottom: 6 },
  femaleItemSelected: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#2E7D32' },
  femaleItemInfo: { marginLeft: 10, flex: 1 },
  femaleItemName: { fontSize: 14, fontWeight: '500' },
  femaleItemId: { marginTop: 2 },
  typeSection: { marginBottom: 16 },
  typeScrollContent: { paddingVertical: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  typeChipSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  typeChipIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  typeChipText: { fontSize: 14, fontWeight: '500' },
  formSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  formSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: { marginTop: 16 },
});

export default ReproductionScreen;

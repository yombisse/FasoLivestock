import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';
import { getEvenementsSanitaires, deleteEvenementSanitaire } from '../../database/repositories/santeEvenementsRepository';
import { EvenementSanitaire } from '../../types/sante.types';
import { getHealthEventColor } from '../../config/colors';
import { Theme } from '../../config/colors';
import database from '../../database/watermelonIndex';
import { useTypeEvenements } from '../../hooks/useTypeEvenements';

const SanteScreen = () => {
  const navigation = useNavigation();
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [events, setEvents] = useState<(EvenementSanitaire & { animal_nom?: string; type_nom?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'evenement' | 'rappel'>('evenement');
  const [selectedEvent, setSelectedEvent] = useState<(EvenementSanitaire & { animal_nom?: string; type_nom?: string }) | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  
  // Load type evenements for name mapping
  const { typeEvenements } = useTypeEvenements(activeFarm?.id);

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      setActiveFarm(farm);
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (!farm) return;

      setLoading(true);
      const eventsData = await getEvenementsSanitaires(farm.id);
      
      console.log('[SanteScreen] Loaded events:', eventsData.length);
      console.log('[SanteScreen] Sample event animal_id:', eventsData[0]?.animal_id);
      
      // Filter out events with invalid animal_id before processing
      const validEvents = eventsData.filter(event => {
        const isValid = event.animal_id && event.animal_id !== 'undefined' && event.animal_id !== '';
        if (!isValid) {
          console.log('[SanteScreen] Filtering out event with invalid animal_id:', event.id, event.animal_id);
        }
        return isValid;
      });
      
      console.log('[SanteScreen] Valid events after filtering:', validEvents.length);
      
      // Load animal names and type names for each event
      const eventsWithDetails = await Promise.all(
        validEvents.map(async (event) => {
          console.log('[SanteScreen] Processing event:', event.id, 'date_evenement:', event.date_evenement);
          
          let animalNom = 'Animal inconnu';
          try {
            const animal = await database.get('animals').find(event.animal_id);
            animalNom = (animal as any).nom || 'Animal inconnu';
          } catch {
            animalNom = 'Animal inconnu';
          }
          
          return {
            ...event,
            animal_nom: animalNom,
            type_nom: getTypeEvenementName(event.type_evenement_id),
          };
        })
      );
      
      setEvents(eventsWithDetails);
    } catch (error) {
      console.error('Error loading health events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeEvenementName = (typeEvenementId: string) => {
    const typeEvenement = typeEvenements.find((t: any) => t.id === typeEvenementId);
    return typeEvenement?.nom_type || typeEvenementId;
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  // Reload events when typeEvenements are loaded
  useEffect(() => {
    if (activeFarm && typeEvenements.length > 0) {
      loadEvents();
    }
  }, [activeFarm, typeEvenements]);

  // Filter events by type
  const evenements = events.filter(e => !e.date_fin);
  const rappels = events.filter(e => e.date_fin);
  const displayedEvents = activeTab === 'evenement' ? evenements : rappels;

  const openAnimalSelection = () => {
    (navigation as any).navigate('SanteCreate');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      console.error('[SanteScreen] Invalid date string:', dateString);
      return 'Date invalide';
    }
    
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getEventIcon = (type?: string) => {
    switch (type) {
      case 'vaccination':
        return 'syringe';
      case 'traitement':
        return 'pill';
      case 'maladie':
        return 'virus';
      case 'controle':
        return 'clipboard-check';
      default:
        return 'medical-bag';
    }
  };

  const handleEditEvent = (event: EvenementSanitaire) => {
    // TODO: Navigate to edit screen
    console.log('Edit event:', event.id);
    Alert.alert('Info', 'La modification sera implémentée prochainement');
  };

  const handleDeleteEvent = (event: EvenementSanitaire) => {
    Alert.alert(
      'Supprimer l\'événement',
      `Voulez-vous vraiment supprimer cet événement "${event.type}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvenementSanitaire(event.id);
              console.log('[SanteScreen] Event deleted successfully:', event.id);
              // Reload events after deletion
              await loadEvents();
            } catch (error) {
              console.error('[SanteScreen] Error deleting event:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cet événement');
            }
          },
        },
      ]
    );
  };

  const handleEventPress = async (event: EvenementSanitaire & { animal_nom?: string }) => {
    console.log('[SanteScreen] handleEventPress called with event:', event.id, 'animal_id:', event.animal_id);
    
    try {
      setSelectedEvent(event);
      
      // Check if animal_id is valid
      if (!event.animal_id || event.animal_id === 'undefined' || event.animal_id === '') {
        console.error('[SanteScreen] Invalid animal_id:', event.animal_id);
        setSelectedAnimal({
          nom: (event as any).animal_nom || 'Animal inconnu',
          espece: { nom: 'Inconnu' },
          numero_identification: 'N/A',
        });
        return;
      }
      
      // Load animal details with better error handling
      try {
        const animalRecord = await database.get('animals').find(event.animal_id);
        await (animalRecord as any).espece;
        setSelectedAnimal(animalRecord);
      } catch (animalError) {
        console.error('[SanteScreen] Animal not found, using fallback:', animalError);
        // Set a fallback animal object if the animal was deleted
        setSelectedAnimal({
          nom: (event as any).animal_nom || 'Animal supprimé',
          espece: { nom: 'Inconnu' },
          numero_identification: 'N/A',
        });
      }
    } catch (error) {
      console.error('[SanteScreen] Error loading event details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'événement');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        title="Santé du Cheptel"
        subtitle="Maladies · Traitements · Vaccinations"
        showMenuButton
        onMenuPress={() => (navigation as any).openDrawer()}
        showRightButton
        rightButtonIcon="plus"
        onRightButtonPress={openAnimalSelection}
        style={styles.header}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'evenement' && styles.tabActive]}
            onPress={() => setActiveTab('evenement')}
          >
            <AppText style={[styles.tabText, activeTab === 'evenement' && styles.tabTextActive]}>
              Événements ({evenements.length})
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'rappel' && styles.tabActive]}
            onPress={() => setActiveTab('rappel')}
          >
            <AppText style={[styles.tabText, activeTab === 'rappel' && styles.tabTextActive]}>
              Rappels ({rappels.length})
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsSection}>
          {loading ? (
            <ActivityIndicator size="large" color={Theme.primary} />
          ) : displayedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="medical-bag-outline" size={48} color="#BDBDBD" />
              <AppText style={styles.emptyText} color="#757575">
                Aucun événement sanitaire enregistré
              </AppText>
            </View>
          ) : (
            displayedEvents.map((event, index) => (
              <TouchableOpacity 
                key={event.id || index} 
                style={styles.eventCard}
                onPress={() => handleEventPress(event)}
                activeOpacity={0.8}
              >
                <View style={styles.eventIcon}>
                  <MaterialCommunityIcons 
                    name={getEventIcon(event.type)} 
                    size={24} 
                    color={getHealthEventColor(event.type).text} 
                  />
                </View>
                <View style={styles.eventContent}>
                  <AppText style={styles.eventTitle} fontWeight="bold">
                    {event.type_nom || event.type || 'Événement'}
                  </AppText>
                  <AppText style={styles.eventAnimal} color="#757575" fontSize={12}>
                    {event.animal_nom || 'Animal inconnu'}
                  </AppText>
                  {event.description && (
                    <AppText style={styles.eventDescription} color="#9E9E9E" fontSize={11}>
                      {event.description}
                    </AppText>
                  )}
                  <AppText style={styles.eventDate} color="#9E9E9E" fontSize={11}>
                    {formatDate(event.date_evenement)}
                  </AppText>
                </View>
                <View style={styles.eventActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditEvent(event);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color="#1976D2" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event);
                    }}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* Detail Modal */}
      <Modal
        visible={selectedEvent !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedEvent(null);
          setSelectedAnimal(null);
        }}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => {
            setSelectedEvent(null);
            setSelectedAnimal(null);
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedEvent && selectedAnimal && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailIcon}>
                    <MaterialCommunityIcons 
                      name={getEventIcon(selectedEvent.type)} 
                      size={32} 
                      color={getHealthEventColor(selectedEvent.type).text} 
                    />
                  </View>
                  <View style={styles.detailTitleContainer}>
                    <AppText style={styles.detailTitle} fontWeight="bold">
                      {selectedEvent.type || 'Événement'}
                    </AppText>
                    <AppText style={styles.detailSubtitle} color="#757575" fontSize={12}>
                      {formatDate(selectedEvent.date_evenement)}
                    </AppText>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setSelectedEvent(null);
                      setSelectedAnimal(null);
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#757575" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} color="#757575" fontSize={12}>
                    Type d'événement
                  </AppText>
                  <AppText style={styles.detailValue} fontWeight="500">
                    {selectedEvent.type_nom || selectedEvent.type || 'Non spécifié'}
                  </AppText>
                </View>
                
                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} color="#757575" fontSize={12}>
                    Animal concerné
                  </AppText>
                  <AppText style={styles.detailValue} fontWeight="500">
                    {selectedAnimal.nom || 'Non renseigné'}
                  </AppText>
                  <AppText style={styles.detailSubtext} color="#9E9E9E" fontSize={11}>
                    {selectedAnimal.espece?.nom || ''} • {selectedAnimal.numero_identification || ''}
                  </AppText>
                </View>
                
                {selectedEvent.description && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} color="#757575" fontSize={12}>
                      Description
                    </AppText>
                    <AppText style={styles.detailValue}>
                      {selectedEvent.description}
                    </AppText>
                  </View>
                )}
                
                {selectedEvent.cout && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} color="#757575" fontSize={12}>
                      Coût
                    </AppText>
                    <AppText style={styles.detailValue} fontWeight="500">
                      {selectedEvent.cout.toLocaleString('fr-FR')} FCFA
                    </AppText>
                  </View>
                )}
                
                {selectedEvent.statut_avant && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} color="#757575" fontSize={12}>
                      Statut avant
                    </AppText>
                    <AppText style={styles.detailValue}>
                      {selectedEvent.statut_avant}
                    </AppText>
                  </View>
                )}
                
                {selectedEvent.statut_apres && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} color="#757575" fontSize={12}>
                      Statut après
                    </AppText>
                    <AppText style={styles.detailValue}>
                      {selectedEvent.statut_apres}
                    </AppText>
                  </View>
                )}
                
                <View style={styles.detailActions}>
                  <TouchableOpacity 
                    style={styles.detailActionButton}
                    onPress={() => {
                      handleEditEvent(selectedEvent);
                      setSelectedEvent(null);
                      setSelectedAnimal(null);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color="#1976D2" />
                    <AppText style={styles.detailActionText} color="#1976D2">Modifier</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.detailActionButton}
                    onPress={() => {
                      handleDeleteEvent(selectedEvent);
                      setSelectedEvent(null);
                      setSelectedAnimal(null);
                    }}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="#D32F2F" />
                    <AppText style={styles.detailActionText} color="#D32F2F">Supprimer</AppText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.backgroundLight,
  },
  header: {
    backgroundColor: Theme.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Theme.white,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'transparent',
    borderColor: Theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.textSecondary,
  },
  tabTextActive: {
    color: Theme.primary,
    fontWeight: '600',
  },
  eventsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: Theme.textPrimary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    color: Theme.textPrimary,
    marginBottom: 2,
  },
  eventAnimal: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 2,
  },
  eventDescription: {
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailTitleContainer: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 18,
    color: Theme.textPrimary,
  },
  detailSubtitle: {
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  detailSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailLabel: {
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Theme.textPrimary,
    marginBottom: 2,
  },
  detailSubtext: {
    marginTop: 2,
  },
  detailActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  detailActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SanteScreen;

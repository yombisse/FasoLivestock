import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';
import { getEvenementsSanitaires } from '../../database/repositories/santeEvenementsRepository';
import { EvenementSanitaire } from '../../types/sante.types';

const SanteScreen = () => {
  const navigation = useNavigation();
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [events, setEvents] = useState<EvenementSanitaire[]>([]);
  const [loading, setLoading] = useState(false);

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
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading health events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadEvents();
  }, []);

  const navigateToRappels = () => {
    // TODO: Navigate to Rappels screen when created
    console.log('Navigate to Rappels');
  };

  const navigateToDashboard = () => {
    // TODO: Navigate to Santé Dashboard screen when created
    console.log('Navigate to Santé Dashboard');
  };

  const openAnimalSelection = () => {
    (navigation as any).navigate('SanteAnimalSelection');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const getEventColor = (type?: string) => {
    switch (type) {
      case 'vaccination':
        return '#4CAF50';
      case 'traitement':
        return '#2196F3';
      case 'maladie':
        return '#F44336';
      case 'controle':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Santé Animale"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <AppText style={styles.title} fontWeight="bold">
          Événements Sanitaires
        </AppText>
        {activeFarm && (
          <AppText style={styles.farmName} color="#757575">
            Ferme active: {activeFarm.name}
          </AppText>
        )}

        <View style={styles.cardsContainer}>
          <TouchableOpacity style={styles.card} onPress={navigateToRappels}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="bell-ring" size={32} color="#4CAF50" />
            </View>
            <View style={styles.cardContent}>
              <AppText style={styles.cardTitle} fontWeight="bold">
                Rappels
              </AppText>
              <AppText style={styles.cardDescription} color="#757575">
                Vaccinations, traitements et contrôles à venir
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={navigateToDashboard}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="chart-bar" size={32} color="#FF9800" />
            </View>
            <View style={styles.cardContent}>
              <AppText style={styles.cardTitle} fontWeight="bold">
                Dashboard Santé
              </AppText>
              <AppText style={styles.cardDescription} color="#757575">
                Statistiques et alertes de la ferme
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        <View style={styles.eventsSection}>
          <AppText style={styles.sectionTitle} fontWeight="bold">
            Historique récent
          </AppText>
          {loading ? (
            <ActivityIndicator size="large" color="#2E7D32" />
          ) : events.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="medical-bag-outline" size={48} color="#BDBDBD" />
              <AppText style={styles.emptyText} color="#757575">
                Aucun événement sanitaire enregistré
              </AppText>
            </View>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventIcon}>
                  <MaterialCommunityIcons 
                    name={getEventIcon(event.type)} 
                    size={24} 
                    color={getEventColor(event.type)} 
                  />
                </View>
                <View style={styles.eventContent}>
                  <AppText style={styles.eventTitle} fontWeight="bold">
                    {event.type || 'Événement'}
                  </AppText>
                  <AppText style={styles.eventDescription} color="#757575" fontSize={12}>
                    {event.description || 'Sans description'}
                  </AppText>
                  <AppText style={styles.eventDate} color="#9E9E9E" fontSize={11}>
                    {formatDate(event.date_evenement)}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={openAnimalSelection}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#212121',
    marginBottom: 8,
  },
  farmName: {
    fontSize: 16,
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
  },
  eventsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#212121',
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
    backgroundColor: '#FFFFFF',
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
    color: '#212121',
    marginBottom: 2,
  },
  eventDescription: {
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 11,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
});

export default SanteScreen;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppEmptyState from '../../../components/AppEmptyState';
import EventDetailModal, { EventDetailModalRef } from '../../../components/EventDetailModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useReproductionEvents } from '../../../hooks/useReproductionEvents';
import { ReproductionHistoriqueAnimal } from '../../../types/reproduction.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalReproductionHistoriqueRouteProp = RouteProp<CheptelStackParamList, 'AnimalReproductionHistorique'>;
type AnimalReproductionHistoriqueNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalReproductionHistorique'>;

const AnimalReproductionHistoriqueScreen = () => {
  const navigation = useNavigation<AnimalReproductionHistoriqueNavigationProp>();
  const route = useRoute<AnimalReproductionHistoriqueRouteProp>();
  const { animalId } = route.params;

  const [loading, setLoading] = useState<boolean>(false);
  const [historique, setHistorique] = useState<ReproductionHistoriqueAnimal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const modalRef = useRef<EventDetailModalRef>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  const loadActiveFarm = async () => {
    try {
      const farm = await (await import('../../../storage/farmStorage')).farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  // Use reactive hook for events
  const { events: dbEvents, loading: eventsLoading } = useReproductionEvents(farmId || '', animalId);

  useEffect(() => {
    loadActiveFarm();
  }, []);

  useEffect(() => {
    if (dbEvents) {
      setHistorique({ evenements_reproductifs: dbEvents } as any);
    }
  }, [dbEvents]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SAILLIE':
        return 'gender-male-female';
      case 'GESTATION':
        return 'baby-carriage';
      case 'MISE_BAS':
        return 'baby-face';
      case 'CHALEUR':
        return 'fire';
      case 'INSPEMINATION':
        return 'test-tube';
      default:
        return 'reproduction';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'SAILLIE':
        return '#E91E63';
      case 'GESTATION':
        return '#9C27B0';
      case 'MISE_BAS':
        return '#673AB7';
      case 'CHALEUR':
        return '#F57C00';
      case 'INSPEMINATION':
        return '#7B1FA2';
      default:
        return '#757575';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const showEventDetails = (item: any) => {
    setSelectedEvent(item);
    modalRef.current?.present();
  };

  const renderEventItem = ({ item }: { item: any }) => {
    const eventType = item.type_nom || item.categorie || 'REPRODUCTION';
    const eventTypeUpper = eventType.toUpperCase();

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => showEventDetails(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${getEventColor(eventTypeUpper)}20` }]}>
          <MaterialCommunityIcons
            name={getEventIcon(eventTypeUpper)}
            size={24}
            color={getEventColor(eventTypeUpper)}
          />
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <AppText style={styles.eventType} fontWeight="600">
              {item.type_nom || item.description || 'Événement reproductif'}
            </AppText>
            <AppText style={styles.eventDate} color="#757575" fontSize={12}>
              {formatDate(item.date_evenement)}
            </AppText>
          </View>
          {item.cout && (
            <AppText style={styles.eventAmount} fontWeight="600">
              Coût: {formatAmount(item.cout)}
            </AppText>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <AppEmptyState
      message="Aucun événement reproductif"
      subMessage="Cet animal n'a pas encore d'historique reproductif"
      icon="reproduction"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Historique reproductif"
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
        showBackground={false}
      />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <AppText color="#757575">Chargement...</AppText>
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#D32F2F" />
            <AppText style={styles.errorTitle} fontWeight="bold">
              Erreur
            </AppText>
            <AppText style={styles.errorMessage} color="#757575">
              {error}
            </AppText>
            <AppButton title="Réessayer" onPress={loadHistorique} />
          </View>
        ) : !historique || historique.evenements_reproductifs.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={historique.evenements_reproductifs}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <EventDetailModal
        ref={modalRef}
        event={selectedEvent || {}}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#30A15E',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 16,
    color: '#212121',
  },
  eventDate: {
    fontSize: 12,
  },
  eventDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  eventAmount: {
    fontSize: 14,
    marginTop: 8,
    color: '#30A15E',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
});

export default AnimalReproductionHistoriqueScreen;

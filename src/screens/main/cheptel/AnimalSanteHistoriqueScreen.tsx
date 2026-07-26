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
import { useEvenementsSanitaires } from '../../../hooks/useEvenementsSanitaires';
import { SanteHistoriqueAnimal } from '../../../types/sante.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import database from '../../../database/watermelonIndex';

type AnimalSanteHistoriqueRouteProp = RouteProp<CheptelStackParamList, 'AnimalSanteHistorique'>;
type AnimalSanteHistoriqueNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalSanteHistorique'>;

const AnimalSanteHistoriqueScreen = () => {
  const navigation = useNavigation<AnimalSanteHistoriqueNavigationProp>();
  const route = useRoute<AnimalSanteHistoriqueRouteProp>();
  const { animalId } = route.params;

  const [loading, setLoading] = useState<boolean>(false);
  const [historique, setHistorique] = useState<SanteHistoriqueAnimal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const modalRef = useRef<EventDetailModalRef>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [animal, setAnimal] = useState<any>(null);

  // Check if animalId is provided
  if (!animalId) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Historique sanitaire"
          showBackButton
          onBackPress={() => navigation.goBack()}
          style={styles.header}
          showBackground={false}
          height={120}
        />
        <View style={styles.errorState}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#D32F2F" />
          <AppText style={styles.errorTitle} fontWeight="bold">
            Animal non spécifié
          </AppText>
          <AppText style={styles.errorMessage} color="#757575">
            Veuillez sélectionner un animal pour voir son historique sanitaire
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

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

  const loadAnimal = async () => {
    try {
      const animalRecord = await database.get('animals').find(animalId);
      await (animalRecord as any).espece;
      setAnimal(animalRecord);
    } catch (error) {
      console.error('Error loading animal:', error);
    }
  };

  // Use reactive hook for events
  const { events: dbEvents, loading: eventsLoading } = useEvenementsSanitaires(farmId || '', animalId);

  useEffect(() => {
    loadActiveFarm();
    loadAnimal();
  }, []);

  useEffect(() => {
    if (dbEvents) {
      setHistorique({ events: dbEvents } as any);
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
      case 'VACCINATION':
        return 'syringe';
      case 'TRAITEMENT':
        return 'pill';
      case 'MALADIE':
        return 'alert-circle';
      case 'CONTROLE':
        return 'stethoscope';
      default:
        return 'medical-bag';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'VACCINATION':
        return '#2E7D32';
      case 'TRAITEMENT':
        return '#1976D2';
      case 'MALADIE':
        return '#D32F2F';
      case 'CONTROLE':
        return '#F57C00';
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
    const eventType = item.type_nom || item.categorie || 'SANITAIRE';
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
              {item.animal_nom || 'Animal inconnu'}
            </AppText>
            <AppText style={styles.eventDate} color="#757575" fontSize={12}>
              {formatDate(item.date_evenement)}
            </AppText>
          </View>
          <AppText style={styles.eventSubtitle} color="#757575" fontSize={13}>
            {item.type_nom || item.description || 'Événement sanitaire'}
          </AppText>
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
      message="Aucun événement sanitaire"
      subMessage="Cet animal n'a pas encore d'historique sanitaire"
      icon="medical-bag"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Historique sanitaire"
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
        showBackground={false}
        height={120}
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
            <AppButton title="Retour" onPress={() => navigation.goBack()} />
          </View>
        ) : !historique || !(historique as any).events || (historique as any).events.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={(historique as any).events}
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
  eventSubtitle: {
    fontSize: 13,
    marginTop: 2,
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

export default AnimalSanteHistoriqueScreen;

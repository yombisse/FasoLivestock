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
import { getEvenementsSanitaires } from '../../../database/repositories/santeEvenementsRepository';
import { SanteHistoriqueAnimal } from '../../../types/sante.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

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

  const loadHistorique = async () => {
    try {
      setLoading(true);
      setError(null);
      const farm = await (await import('../../../storage/farmStorage')).farmStorage.getActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }
      const events = await getEvenementsSanitaires(farm.id, animalId);
      setHistorique({ events } as any);
    } catch (error: any) {
      console.error('Error loading health history:', error);
      setError(error.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistorique();
  }, [animalId]);

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

  const renderEventItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => showEventDetails(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getEventColor('SANITAIRE')}20` }]}>
        <MaterialCommunityIcons
          name={getEventIcon('SANITAIRE')}
          size={24}
          color={getEventColor('SANITAIRE')}
        />
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <AppText style={styles.eventType} fontWeight="600">
            {item.type_nom || item.description || 'Événement sanitaire'}
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
        ) : !historique || !historique.events || historique.events.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={historique.events}
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

export default AnimalSanteHistoriqueScreen;

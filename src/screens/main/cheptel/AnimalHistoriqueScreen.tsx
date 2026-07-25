import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity
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
import { getAnimalMouvements } from '../../../services/mouvementHistory.service';
import { MouvementHistoryItem } from '../../../types/mouvement.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalHistoriqueRouteProp = RouteProp<CheptelStackParamList, 'AnimalHistorique'>;
type AnimalHistoriqueNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalHistorique'>;

const AnimalHistoriqueScreen = () => {
  const navigation = useNavigation<AnimalHistoriqueNavigationProp>();
  const route = useRoute<AnimalHistoriqueRouteProp>();
  const { animalId } = route.params;

  const [loading, setLoading] = useState<boolean>(false);
  const [mouvements, setMouvements] = useState<MouvementHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const modalRef = useRef<EventDetailModalRef>(null);

  const loadMouvements = async () => {
    try {
      setLoading(true);
      setError(null);

      const { getMouvementEvents } = await import('../../../database/repositories/mouvementRepository');
      const farm = await (await import('../../../storage/farmStorage')).farmStorage.getActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }

      const events = await getMouvementEvents(farm.id, animalId);
      setMouvements(events);
    } catch (error: any) {
      console.error('Error loading mouvements:', error);
      setError(error.message || 'Erreur lors du chargement de l\'historique');
      setMouvements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMouvements();
  }, [animalId]);

  const formatCachedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const showEventDetails = (item: any) => {
    setSelectedEvent(item);
    modalRef.current?.present();
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'ACHAT':
        return 'cash';
      case 'NAISSANCE':
        return 'baby-face';
      case 'IMPORT':
        return 'truck';
      case 'VENTE':
        return 'tag';
      case 'TRANSFERT':
        return 'swap-horizontal';
      case 'DECES':
        return 'skull-crossbones';
      case 'PERTE':
        return 'help-circle';
      case 'ABATTAGE':
        return 'knife';
      default:
        return 'information';
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'ACHAT':
      case 'NAISSANCE':
      case 'IMPORT':
        return '#30A15E';
      case 'VENTE':
      case 'TRANSFERT':
        return '#1976D2';
      case 'DECES':
      case 'PERTE':
      case 'ABATTAGE':
        return '#D32F2F';
      default:
        return '#757575';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMovementItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.movementCard}
      onPress={() => showEventDetails(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getMovementColor(item.categorie)}20` }]}>
        <MaterialCommunityIcons
          name={getMovementIcon(item.categorie)}
          size={24}
          color={getMovementColor(item.categorie)}
        />
      </View>
      <View style={styles.movementContent}>
        <View style={styles.movementHeader}>
          <AppText style={styles.movementType} fontWeight="600">
            {item.type_nom || item.categorie}
          </AppText>
          <AppText style={styles.movementDate} color="#757575" fontSize={12}>
            {formatDate(item.date_evenement)}
          </AppText>
        </View>
        {item.description && (
          <AppText style={styles.movementDescription} color="#757575">
            {item.description}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <AppEmptyState
      message="Aucun mouvement enregistré"
      subMessage="Cet animal n'a pas encore d'historique de mouvements"
      icon="history"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Historique des mouvements"
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
            <AppButton title="Réessayer" onPress={loadMouvements} />
          </View>
        ) : mouvements.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {fromCache && cachedAt && (
              <View style={styles.cacheBadge}>
                <AppText style={styles.cacheBadgeText} fontSize={12} color="#757575">
                  Données du {formatCachedDate(cachedAt)}
                </AppText>
              </View>
            )}
            <FlatList
              data={mouvements}
              renderItem={renderMovementItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
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
  cacheBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 12,
  },
  cacheBadgeText: {
    textAlign: 'center',
  },
  movementCard: {
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
  movementContent: {
    flex: 1,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  movementType: {
    fontSize: 16,
    color: '#212121',
  },
  movementDate: {
    fontSize: 12,
  },
  movementDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  movementAmount: {
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

export default AnimalHistoriqueScreen;

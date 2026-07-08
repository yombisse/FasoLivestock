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
import transactionService from '../../../services/transaction.service';
import { TransactionHistoriqueAnimal } from '../../../types/transaction.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalTransactionHistoriqueRouteProp = RouteProp<CheptelStackParamList, 'AnimalTransactionHistorique'>;
type AnimalTransactionHistoriqueNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalTransactionHistorique'>;

const AnimalTransactionHistoriqueScreen = () => {
  const navigation = useNavigation<AnimalTransactionHistoriqueNavigationProp>();
  const route = useRoute<AnimalTransactionHistoriqueRouteProp>();
  const { animalId } = route.params;

  const [loading, setLoading] = useState<boolean>(false);
  const [historique, setHistorique] = useState<TransactionHistoriqueAnimal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const modalRef = useRef<EventDetailModalRef>(null);

  const loadHistorique = async () => {
    try {
      setLoading(true);
      setError(null);

      const { getTransactionsByAnimal } = await import('../../../database/repositories/transactionRepository');
      const farm = await (await import('../../../storage/farmStorage')).farmStorage.getActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }

      const transactions = await getTransactionsByAnimal(farm.id, animalId);

      // Calculate statistics
      const total_revenus = transactions
        .filter((t: any) => t.type_transaction === 'ENTREE')
        .reduce((sum: number, t: any) => sum + t.montant, 0);

      const total_charges = transactions
        .filter((t: any) => t.type_transaction === 'SORTIE')
        .reduce((sum: number, t: any) => sum + t.montant, 0);

      setHistorique({
        transactions,
        statistiques: {
          total_revenus,
          total_charges,
          bilan: total_revenus - total_charges,
        },
      } as any);
    } catch (error: any) {
      console.error('Error loading transaction history:', error);
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

  const renderTransactionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => showEventDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionHeader}>
        <View style={[
          styles.transactionTypeBadge,
          { backgroundColor: item.type_transaction === 'ENTREE' ? '#E8F5E9' : '#FFEBEE' }
        ]}>
          <AppText
            style={[
              styles.transactionTypeText,
              { color: item.type_transaction === 'ENTREE' ? '#2E7D32' : '#D32F2F' }
            ]}
            fontSize={10}
            fontWeight="bold"
          >
            {item.type_transaction}
          </AppText>
        </View>
        <AppText style={styles.transactionAmount} fontWeight="bold">
          {item.type_transaction === 'ENTREE' ? '+' : '-'}{formatAmount(item.montant)}
        </AppText>
      </View>
      <AppText style={styles.transactionDescription} color="#757575" fontSize={12}>
        {item.description || 'Transaction'}
      </AppText>
      <View style={styles.transactionMeta}>
        <AppText style={styles.transactionDate} color="#9E9E9E" fontSize={11}>
          {formatDate(item.date_transaction)}
        </AppText>
        {item.categorie && (
          <AppText style={styles.transactionCategory} color="#9E9E9E" fontSize={11}>
            • {item.categorie.nom_categorie}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <AppEmptyState
      message="Aucune transaction"
      subMessage="Cet animal n'a pas encore d'historique transactionnel"
      icon="cash"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Historique transactionnel"
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
        ) : !historique || historique.transactions.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Statistiques */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <AppText style={styles.statLabel} color="#757575" fontSize={12}>Revenus</AppText>
                <AppText style={[styles.statValue, { color: '#2E7D32' }]} fontWeight="bold">
                  {formatAmount(historique.statistiques.total_revenus)}
                </AppText>
              </View>
              <View style={styles.statItem}>
                <AppText style={styles.statLabel} color="#757575" fontSize={12}>Dépenses</AppText>
                <AppText style={[styles.statValue, { color: '#D32F2F' }]} fontWeight="bold">
                  {formatAmount(historique.statistiques.total_charges)}
                </AppText>
              </View>
              <View style={styles.statItem}>
                <AppText style={styles.statLabel} color="#757575" fontSize={12}>Bilan</AppText>
                <AppText
                  style={[styles.statValue, { color: historique.statistiques.bilan >= 0 ? '#2E7D32' : '#D32F2F' }]}
                  fontWeight="bold"
                >
                  {formatAmount(historique.statistiques.bilan)}
                </AppText>
              </View>
            </View>

            <FlatList
              data={historique.transactions}
              renderItem={renderTransactionItem}
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  transactionTypeText: {
  },
  transactionAmount: {
    fontSize: 16,
    color: '#212121',
  },
  transactionDescription: {
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDate: {
    marginRight: 4,
  },
  transactionCategory: {
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

export default AnimalTransactionHistoriqueScreen;

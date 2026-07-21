import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Transaction } from '../../../types/transaction.types';
import { getLocalTransactionById } from '../../../database/repositories/transactionRepository';

type TransactionDetailRouteProp = RouteProp<{ TransactionDetail: { transactionId: string } }, 'TransactionDetail'>;
type TransactionDetailNavigationProp = StackNavigationProp<any, 'TransactionDetail'>;

const TransactionDetailScreen = () => {
  const navigation = useNavigation<TransactionDetailNavigationProp>();
  const route = useRoute<TransactionDetailRouteProp>();
  const { transactionId } = route.params;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLocalTransactionById(transactionId);
      setTransaction(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la transaction');
    } finally {
      setLoading(false);
    }
  };

  // Reload transaction when screen is focused to update sync status dynamically
  useFocusEffect(
    React.useCallback(() => {
      loadTransaction();
    }, [transactionId])
  );

  const getTransactionIcon = (type?: string) => {
    switch (type) {
      case 'ENTREE':
        return 'arrow-down-left';
      case 'SORTIE':
        return 'arrow-up-right';
      case 'TRANSFERT':
        return 'swap-horizontal';
      case 'AJUSTEMENT':
        return 'cog';
      default:
        return 'help-circle';
    }
  };

  const getTransactionColor = (type?: string) => {
    switch (type) {
      case 'ENTREE':
        return '#2E7D32';
      case 'SORTIE':
        return '#D32F2F';
      case 'TRANSFERT':
        return '#1976D2';
      case 'AJUSTEMENT':
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getSyncIndicator = (syncStatus?: string) => {
    if (!syncStatus) return null;
    switch (syncStatus) {
      case 'synced':
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#2E7D32" />
            <AppText style={styles.syncText} color="#2E7D32" fontSize={12}>
              Synchronisé
            </AppText>
          </View>
        );
      case 'pending':
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#F57C00" />
            <AppText style={styles.syncText} color="#F57C00" fontSize={12}>
              En attente
            </AppText>
          </View>
        );
      case 'conflict':
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#D32F2F" />
            <AppText style={styles.syncText} color="#D32F2F" fontSize={12}>
              Conflit
            </AppText>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Détail transaction" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={48} color="#2E7D32" />
          <AppText style={styles.loadingText}>Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Détail transaction" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#D32F2F" />
          <AppText style={styles.errorText}>{error || 'Transaction non trouvée'}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Reçu de transaction"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Ticket Card */}
        <View style={styles.ticket}>
          {/* Ticket Header */}
          <View style={styles.ticketHeader}>
            <View style={styles.ticketIconContainer}>
              <MaterialCommunityIcons
                name={getTransactionIcon(transaction.type_transaction)}
                size={32}
                color={getTransactionColor(transaction.type_transaction)}
              />
            </View>
            <View style={styles.ticketTitleContainer}>
              <AppText style={styles.ticketTitle} fontWeight="bold">
                {transaction.categorie_id === 'VENTE_ANIMAL' ? 'Vente' : 
                 transaction.categorie_id === 'ACHAT_ANIMAL' ? 'Achat' :
                 transaction.type_transaction}
              </AppText>
              <AppText style={styles.ticketSubtitle} color="#757575" fontSize={12}>
                FasoLivestock
              </AppText>
            </View>
            <View style={styles.ticketAmountContainer}>
              <AppText
                style={[styles.ticketAmount, { color: getTransactionColor(transaction.type_transaction) }]}
                fontWeight="bold"
              >
                {transaction.type_transaction === 'ENTREE' ? '+' : '-'}{formatAmount(transaction.montant)}
              </AppText>
            </View>
          </View>

          {/* Transaction ID */}
          {transaction.id && (
            <View style={styles.ticketRow}>
              <AppText style={styles.ticketLabel} color="#9E9E9E" fontSize={11}>ID Transaction</AppText>
              <AppText style={styles.ticketId} fontSize={12}>
                #{transaction.id.substring(0, 8)}
              </AppText>
            </View>
          )}

          {/* Dashed Divider */}
          <View style={styles.dashedDivider} />

          {/* Ticket Details */}
          <View style={styles.ticketDetails}>
            <View style={styles.ticketRow}>
              <AppText style={styles.ticketLabel} color="#9E9E9E" fontSize={11}>Date</AppText>
              <AppText style={styles.ticketValue} fontSize={13}>{formatDate(transaction.date_transaction)}</AppText>
            </View>

            {transaction.tiers && (
              <View style={styles.ticketRow}>
                <AppText style={styles.ticketLabel} color="#9E9E9E" fontSize={11}>Tiers</AppText>
                <AppText style={styles.ticketValue} fontSize={13}>{transaction.tiers}</AppText>
              </View>
            )}

            {transaction.description && (
              <View style={styles.ticketRow}>
                <AppText style={styles.ticketLabel} color="#9E9E9E" fontSize={11}>Description</AppText>
                <AppText style={styles.ticketValue} fontSize={13} numberOfLines={2}>
                  {transaction.description}
                </AppText>
              </View>
            )}

            {transaction.animal_id && (
              <View style={styles.ticketRow}>
                <AppText style={styles.ticketLabel} color="#9E9E9E" fontSize={11}>Animal</AppText>
                <View style={styles.animalTag}>
                  <MaterialCommunityIcons name="cow" size={14} color="#2E7D32" />
                  <AppText style={styles.animalTagText} fontSize={12}>
                    {transaction.animal?.nom || 'Animal'}
                  </AppText>
                </View>
              </View>
            )}
          </View>

          {/* Dashed Divider */}
          <View style={styles.dashedDivider} />

          {/* Sync Status */}
          <View style={styles.ticketFooter}>
            {getSyncIndicator(transaction.sync_status)}
          </View>

          {/* Ticket Notches */}
          <View style={styles.ticketNotchLeft} />
          <View style={styles.ticketNotchRight} />
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: '#757575',
    textAlign: 'center',
  },
  ticket: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketTitleContainer: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 18,
    color: '#212121',
  },
  ticketSubtitle: {
    marginTop: 2,
  },
  ticketAmountContainer: {
    alignItems: 'flex-end',
  },
  ticketAmount: {
    fontSize: 22,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketLabel: {
    flex: 1,
  },
  ticketValue: {
    flex: 1,
    textAlign: 'right',
    color: '#212121',
  },
  ticketId: {
    color: '#212121',
    textAlign: 'right',
  },
  ticketDetails: {
    marginVertical: 8,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    borderBottomWidth: 0,
  },
  ticketFooter: {
    marginTop: 8,
  },
  ticketNotchLeft: {
    position: 'absolute',
    left: -10,
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -10,
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  animalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  animalTagText: {
    color: '#2E7D32',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 12,
  },
});

export default TransactionDetailScreen;

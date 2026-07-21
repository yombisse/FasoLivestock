import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Modalize } from 'react-native-modalize';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import TransactionListItem from '../../../components/list/TransactionListItem';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../../../storage/authStorage';
import { TransactionFilters } from '../../../types/transaction.types';
import { Transaction as RepositoryTransaction, getLocalTransactions, observeLocalTransactions } from '../../../database/repositories/transactionRepository';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import transactionService from '../../../services/transaction.service';
import { farmStorage } from '../../../storage/farmStorage';
import { Theme } from '../../../config/colors';
import { CategorieSystemeIds } from '../../../constants/categories';

type TransactionListNavigationProp = StackNavigationProp<any, 'TransactionList'>;

const TransactionListScreen = () => {
  const navigation = useNavigation<TransactionListNavigationProp>();
  const [transactions, setTransactions] = useState<RepositoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ventes' | 'achats' | 'transferts'>('ventes');
  const [bilan, setBilan] = useState<{ total_revenus: number; total_charges: number; total_transferts: number; bilan: number } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const actionSheetRef = useRef<Modalize>(null);

  const loadActiveFarm = async () => {
    try {
      const activeFarm = await farmStorage.getActiveFarm();
      if (activeFarm) {
        setFarmId(activeFarm.id);
      } else {
        setError('Aucune ferme active sélectionnée');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setError('Erreur lors du chargement de la ferme active');
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getLocalCategories();
      // Filter to only show REVENU and DEPENSE categories
      const filteredCategories = categoriesData.filter(
        (cat: any) => cat.type === 'REVENU' || cat.type === 'DEPENSE'
      );
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTransactions = async () => {
    if (!farmId) {
      setError('Aucune ferme active sélectionnée');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const localTransactions = await getLocalTransactions(farmId);

      let filteredTransactions = localTransactions;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredTransactions = filteredTransactions.filter(
          (t: RepositoryTransaction) =>
            t.description?.toLowerCase().includes(query) ||
            t.categorie_id?.toLowerCase().includes(query)
        );
      }

      // Filter by active tab
      if (activeTab === 'ventes') {
        filteredTransactions = filteredTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'ENTREE');
      } else if (activeTab === 'achats') {
        filteredTransactions = filteredTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'SORTIE');
      } else if (activeTab === 'transferts') {
        filteredTransactions = filteredTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'TRANSFERT');
      }

      setTransactions(filteredTransactions);

      // Calculate bilan locally instead of calling service
      const bilan = {
        total_revenus: localTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'ENTREE').reduce((sum, t) => sum + (t.montant || 0), 0),
        total_charges: localTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'SORTIE').reduce((sum, t) => sum + (t.montant || 0), 0),
        total_transferts: localTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'TRANSFERT').reduce((sum, t) => sum + (t.montant || 0), 0),
        bilan: 0,
      };
      bilan.bilan = bilan.total_revenus - bilan.total_charges;
      setBilan(bilan);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [farmId, activeTab]);

  useEffect(() => {
    loadActiveFarm();
    loadCategories();
  }, []);

  useEffect(() => {
    if (farmId) {
      // Use observable for reactive updates
      const subscription = observeLocalTransactions(farmId).subscribe((localTransactions: any[]) => {
        let filteredTransactions = localTransactions;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredTransactions = filteredTransactions.filter(
            (t: RepositoryTransaction) =>
              t.description?.toLowerCase().includes(query) ||
              t.categorie_id?.toLowerCase().includes(query)
          );
        }

        // Filter by active tab
        if (activeTab === 'ventes') {
          filteredTransactions = filteredTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'ENTREE');
        } else if (activeTab === 'achats') {
          filteredTransactions = filteredTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'SORTIE');
        } else if (activeTab === 'transferts') {
          filteredTransactions = filteredTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'TRANSFERT');
        }

        setTransactions(filteredTransactions);
        setLoading(false);

        // Calculate bilan locally
        const bilan = {
          total_revenus: localTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'ENTREE').reduce((sum, t) => sum + (t.montant || 0), 0),
          total_charges: localTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'SORTIE').reduce((sum, t) => sum + (t.montant || 0), 0),
          total_transferts: localTransactions.filter((t: RepositoryTransaction) => t.type_transaction === 'TRANSFERT').reduce((sum, t) => sum + (t.montant || 0), 0),
          bilan: 0,
        };
        bilan.bilan = bilan.total_revenus - bilan.total_charges;
        setBilan(bilan);
      });

      return () => subscription.unsubscribe();
    }
  }, [farmId, activeTab, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (farmId) {
        loadTransactions();
      }
    }, [farmId, activeTab])
  );

  const handleAdd = () => {
    // Use constant category ID for "Achat d'animaux"
    const achatCategoryId = CategorieSystemeIds.ACHAT_ANIMAUX;
    console.log('[TransactionListScreen] Using achat category ID:', achatCategoryId);
    navigation.navigate('AnimalAchat', { categorieId: achatCategoryId });
  };

  const handleVente = () => {
    // Navigate to AnimalVenteScreen without animalId (mode libre with animal picker)
    navigation.navigate('AnimalVente', { animalId: undefined });
  };

  const renderTransaction = ({ item }: { item: RepositoryTransaction }) => (
    <TransactionListItem 
      transaction={item as any} 
      onPress={(transaction) => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
    />
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderBilanCard = () => {
    if (!bilan) return null;

    if (activeTab === 'ventes') {
      return (
        <View style={styles.bilanCard}>
          <AppText style={styles.bilanTitle} fontWeight="bold">Total encaissé</AppText>
          <AppText style={styles.bilanValue} color={Theme.primary} fontSize={24} fontWeight="bold">
            {formatAmount(bilan.total_revenus)}
          </AppText>
        </View>
      );
    }

    if (activeTab === 'achats') {
      return (
        <View style={styles.bilanCard}>
          <AppText style={styles.bilanTitle} fontWeight="bold">Total dépensé</AppText>
          <AppText style={[styles.bilanValue, { color: '#D32F2F' }]} fontSize={24} fontWeight="bold">
            {formatAmount(bilan.total_charges)}
          </AppText>
        </View>
      );
    }

    if (activeTab === 'transferts') {
      return (
        <View style={styles.bilanCard}>
          <AppText style={styles.bilanTitle} fontWeight="bold">Total transferts</AppText>
          <AppText style={[styles.bilanValue, { color: '#FF9800' }]} fontSize={24} fontWeight="bold">
            {formatAmount(bilan.total_transferts)}
          </AppText>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Transactions" showBackButton={false} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={48} color="#2E7D32" />
          <AppText style={styles.loadingText}>Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPrimary}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <AppText style={styles.headerTitle}>Transactions</AppText>
            <AppText style={styles.headerSubtitle}>Achats et ventes d'animaux</AppText>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={handleAdd}>
              <MaterialCommunityIcons name="cart-plus" size={20} color="#FFFFFF" />
              <AppText style={styles.headerButtonText}>Achat</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleVente}>
              <MaterialCommunityIcons name="cash-plus" size={20} color="#FFFFFF" />
              <AppText style={styles.headerButtonText}>Vente</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'ventes' && styles.tabActive]}
            onPress={() => setActiveTab('ventes')}
          >
            <AppText style={[styles.tabText, activeTab === 'ventes' && styles.tabTextActive]}>
              Ventes ({bilan?.total_revenus ? Math.floor(bilan.total_revenus) : 0})
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'achats' && styles.tabActive]}
            onPress={() => setActiveTab('achats')}
          >
            <AppText style={[styles.tabText, activeTab === 'achats' && styles.tabTextActive]}>
              Achats ({bilan?.total_charges ? Math.floor(bilan.total_charges) : 0})
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'transferts' && styles.tabActive]}
            onPress={() => setActiveTab('transferts')}
          >
            <AppText style={[styles.tabText, activeTab === 'transferts' && styles.tabTextActive]}>
              Transferts ({bilan?.total_transferts ? Math.floor(bilan.total_transferts) : 0})
            </AppText>
          </TouchableOpacity>
        </View>

        {renderBilanCard()}

        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#757575" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher..."
            style={styles.searchInput}
          />
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt" size={64} color="#BDBDBD" />
            <AppText style={styles.emptyText} color="#757575">Aucune transaction</AppText>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.backgroundLight,
  },
  headerPrimary: {
    backgroundColor: Theme.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  headerButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Theme.textSecondary,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Theme.white,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  bilanCard: {
    backgroundColor: Theme.white,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bilanTitle: {
    fontSize: 16,
    color: Theme.textPrimary,
    marginBottom: 8,
  },
  bilanValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.white,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default TransactionListScreen;

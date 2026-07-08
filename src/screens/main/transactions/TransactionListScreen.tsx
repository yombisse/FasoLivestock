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
import { Transaction, TransactionFilters } from '../../../types/transaction.types';
import { getLocalTransactions } from '../../../database/repositories/transactionRepository';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import transactionService from '../../../services/transaction.service';
import { farmStorage } from '../../../storage/farmStorage';

type TransactionListNavigationProp = StackNavigationProp<any, 'TransactionList'>;

const TransactionListScreen = () => {
  const navigation = useNavigation<TransactionListNavigationProp>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'AJUSTEMENT' | null>(null);
  const [bilan, setBilan] = useState<{ total_revenus: number; total_charges: number; bilan: number } | null>(null);
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

      const filters: TransactionFilters = {};
      if (selectedType) {
        filters.type_transaction = selectedType;
      }

      const localTransactions = await getLocalTransactions(farmId, filters);

      let filteredTransactions = localTransactions;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredTransactions = filteredTransactions.filter(
          (t) =>
            t.description?.toLowerCase().includes(query) ||
            t.categorie_id?.toLowerCase().includes(query)
        );
      }

      setTransactions(filteredTransactions);

      // Calculate bilan locally instead of calling service
      const bilan = {
        total_revenus: filteredTransactions.filter(t => t.type_transaction === 'ENTREE').reduce((sum, t) => sum + (t.montant || 0), 0),
        total_charges: filteredTransactions.filter(t => t.type_transaction === 'SORTIE').reduce((sum, t) => sum + (t.montant || 0), 0),
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
  }, [farmId, selectedType]);

  useEffect(() => {
    loadActiveFarm();
    loadCategories();
  }, []);

  useEffect(() => {
    if (farmId) {
      loadTransactions();
    }
  }, [farmId, selectedType]);

  useFocusEffect(
    useCallback(() => {
      if (farmId) {
        loadTransactions();
      }
    }, [farmId, selectedType])
  );

  const handleAdd = () => {
    actionSheetRef.current?.open();
  };

  const handleCategorySelection = (category: any) => {
    actionSheetRef.current?.close();
    
    // Navigate based on category type
    if (category.type === 'DEPENSE') {
      // Navigate to AnimalAchat with category UUID
      navigation.navigate('AnimalAchat', { categorieId: category.id });
    } else if (category.type === 'REVENU') {
      // Navigate to TransactionAnimalSelection with category UUID
      navigation.navigate('TransactionAnimalSelection', { categorieId: category.id });
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionListItem 
      transaction={item} 
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

    const formatCompactAmount = (amount: number) => {
      if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
      }
      if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'K';
      }
      return amount.toString();
    };

    return (
      <View style={styles.bilanCard}>
        <View style={styles.bilanHeader}>
          <AppText style={styles.bilanTitle} fontWeight="bold">Bilan financier</AppText>
          <AppText style={styles.bilanSubtitle} color="#757575" fontSize={12}>
            {formatAmount(bilan.bilan)}
          </AppText>
        </View>
        <View style={styles.bilanRow}>
          <View style={styles.bilanItem}>
            <View style={[styles.bilanIcon, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="arrow-down-left" size={16} color="#2E7D32" />
            </View>
            <AppText style={styles.bilanLabel} color="#757575" fontSize={11}>Revenus</AppText>
            <AppText style={[styles.bilanValue, { color: '#2E7D32' }]} fontWeight="bold" fontSize={14}>
              {formatCompactAmount(bilan.total_revenus)}
            </AppText>
          </View>
          <View style={styles.bilanItem}>
            <View style={[styles.bilanIcon, { backgroundColor: '#FFEBEE' }]}>
              <MaterialCommunityIcons name="arrow-up-right" size={16} color="#D32F2F" />
            </View>
            <AppText style={styles.bilanLabel} color="#757575" fontSize={11}>Dépenses</AppText>
            <AppText style={[styles.bilanValue, { color: '#D32F2F' }]} fontWeight="bold" fontSize={14}>
              {formatCompactAmount(bilan.total_charges)}
            </AppText>
          </View>
          <View style={styles.bilanItem}>
            <View style={[styles.bilanIcon, { backgroundColor: bilan.bilan >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
              <MaterialCommunityIcons 
                name={bilan.bilan >= 0 ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={bilan.bilan >= 0 ? '#2E7D32' : '#D32F2F'} 
              />
            </View>
            <AppText style={styles.bilanLabel} color="#757575" fontSize={11}>Solde</AppText>
            <AppText
              style={[styles.bilanValue, { color: bilan.bilan >= 0 ? '#2E7D32' : '#D32F2F' }]}
              fontWeight="bold"
              fontSize={14}
            >
              {formatCompactAmount(bilan.bilan)}
            </AppText>
          </View>
        </View>
      </View>
    );
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
      <AppHeader title="Transactions" showBackButton={false} />
      <View style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}

        {renderBilanCard()}

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedType && styles.filterChipActive]}
              onPress={() => setSelectedType(null)}
            >
              <AppText style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>
                Tous
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'ENTREE' && styles.filterChipActive]}
              onPress={() => setSelectedType('ENTREE')}
            >
              <AppText style={[styles.filterChipText, selectedType === 'ENTREE' && styles.filterChipTextActive]}>
                Entrées
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'SORTIE' && styles.filterChipActive]}
              onPress={() => setSelectedType('SORTIE')}
            >
              <AppText style={[styles.filterChipText, selectedType === 'SORTIE' && styles.filterChipTextActive]}>
                Sorties
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'TRANSFERT' && styles.filterChipActive]}
              onPress={() => setSelectedType('TRANSFERT')}
            >
              <AppText style={[styles.filterChipText, selectedType === 'TRANSFERT' && styles.filterChipTextActive]}>
                Transferts
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>

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

      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <Modalize
        ref={actionSheetRef}
        adjustToContentHeight
        modalStyle={styles.bottomSheetModal}
        handleStyle={styles.bottomSheetHandle}
      >
        <View style={styles.bottomSheetContent}>
          <AppText style={styles.bottomSheetTitle}>Catégories de transaction</AppText>
          
          {categories.length === 0 ? (
            <View style={styles.bottomSheetEmpty}>
              <AppText color="#757575">Aucune catégorie disponible. Veuillez synchroniser.</AppText>
            </View>
          ) : (
            categories.map((category) => (
              <TouchableOpacity 
                key={category.id} 
                style={styles.bottomSheetOption} 
                onPress={() => handleCategorySelection(category)}
              >
                <View style={[
                  styles.bottomSheetIcon, 
                  { backgroundColor: category.type === 'REVENU' ? '#E8F5E9' : '#FFEBEE' }
                ]}>
                  <MaterialCommunityIcons 
                    name={category.type === 'REVENU' ? 'arrow-down-left' : 'arrow-up-right'} 
                    size={24} 
                    color={category.type === 'REVENU' ? '#2E7D32' : '#D32F2F'} 
                  />
                </View>
                <View style={styles.bottomSheetOptionContent}>
                  <AppText style={styles.bottomSheetOptionTitle} fontWeight="bold">
                    {category.nom_categorie}
                  </AppText>
                  <AppText style={styles.bottomSheetOptionSubtitle} color="#757575" fontSize={12}>
                    {category.type === 'REVENU' ? 'Revenu' : 'Dépense'}
                    {category.description ? ` - ${category.description}` : ''}
                  </AppText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modalize>
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
  loadingText: {
    marginTop: 16,
    color: '#757575',
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
  bilanCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bilanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bilanTitle: {
    fontSize: 16,
    color: '#212121',
  },
  bilanSubtitle: {
    fontWeight: '600',
  },
  bilanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bilanItem: {
    flex: 1,
    alignItems: 'center',
  },
  bilanIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  bilanLabel: {
    marginBottom: 2,
  },
  bilanValue: {
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 14,
    color: '#212121',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSheetModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  bottomSheetHandle: {
    backgroundColor: '#E0E0E0',
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bottomSheetEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bottomSheetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bottomSheetOptionContent: {
    flex: 1,
  },
  bottomSheetOptionTitle: {
    fontSize: 16,
  },
  bottomSheetOptionSubtitle: {
    marginTop: 2,
  },
});

export default TransactionListScreen;

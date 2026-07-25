import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppHeader from '../../../components/AppHeader';
import AppTab from '../../../components/AppTab';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { farmStorage } from '../../../storage/farmStorage';
import { useLots } from '../../../hooks/useLots';
import { getAnimalsByLot } from '../../../database/repositories/animalRepository';
import { Theme } from '../../../config/colors';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type LotListNavigationProp = StackNavigationProp<CheptelStackParamList, 'LotList'>;

const filterTabOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Actifs', value: 'actifs' },
  { label: 'Vides', value: 'vides' },
];

const LotListScreen = () => {
  const navigation = useNavigation<LotListNavigationProp>();
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all');
  const [lotCounts, setLotCounts] = useState<Record<string, number>>({});
  const { lots, loading } = useLots(farmId || '');

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  const loadLotCounts = async () => {
    if (!farmId || lots.length === 0) return;

    const counts: Record<string, number> = {};
    for (const lot of lots) {
      const animals = await getAnimalsByLot(lot.id);
      const healthyAnimals = animals.filter((a: any) => a.statut === 'SAIN');
      counts[lot.id] = healthyAnimals.length;
    }
    setLotCounts(counts);
  };

  useFocusEffect(
    useCallback(() => {
      loadActiveFarm();
    }, [])
  );

  useEffect(() => {
    loadLotCounts();
  }, [lots, farmId]);

  const handleFilterTabChange = (tab: string) => {
    setActiveFilterTab(tab);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleCreateLot = () => {
    navigation.navigate('LotCreate' as never);
  };

  const handleAssignAnimals = () => {
    navigation.navigate('LotAssign' as never);
  };

  const handleSellLot = () => {
    navigation.navigate('LotVente' as never);
  };

  // Filtrage côté JavaScript
  const filteredLots = lots.filter((lot) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !lot.nom_lot?.toLowerCase().includes(query) &&
        !lot.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (activeFilterTab === 'actifs') {
      return (lotCounts[lot.id] || 0) > 0;
    }
    if (activeFilterTab === 'vides') {
      return (lotCounts[lot.id] || 0) === 0;
    }
    return true;
  });

  const renderLotItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.lotCard}
      activeOpacity={0.7}
    >
      <View style={styles.lotHeader}>
        <View style={styles.lotIcon}>
          <MaterialCommunityIcons name="layers" size={24} color={Theme.primary} />
        </View>
        <View style={styles.lotInfo}>
          <AppText style={styles.lotName} fontWeight="bold">
            {item.nom_lot}
          </AppText>
          {item.description && (
            <AppText style={styles.lotDescription} color="#757575" fontSize={12}>
              {item.description}
            </AppText>
          )}
        </View>
        <View style={styles.lotCountBadge}>
          <AppText style={styles.lotCountText}>
            {lotCounts[item.id] || 0}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="layers-outline" size={64} color="#BDBDBD" />
      <AppText style={styles.emptyTitle} fontWeight="bold">
        Aucun lot
      </AppText>
      <AppText style={styles.emptyText} color="#757575">
        Créez votre premier lot pour organiser vos animaux
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        showMenuButton
        onMenuPress={() => (navigation as any).openDrawer()}
        showRightButton
        rightButtonIcon="plus"
        onRightButtonPress={handleCreateLot}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <AppText style={styles.headerTitle}>Mes Lots</AppText>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={Theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un lot..."
              placeholderTextColor={Theme.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => handleSearchChange('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={Theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </AppHeader>

      <View style={styles.content}>
        {/* Filtres avec AppTab */}
        <AppTab
          options={filterTabOptions}
          activeTab={activeFilterTab}
          onTabChange={handleFilterTabChange}
          textStyle={styles.tabText}
          tabStyle={styles.tabstyle}
        />

        {/* Compteur */}
        <AppText style={styles.counter} color="#757575">
          {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''}
        </AppText>

        {/* Actions rapides */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleAssignAnimals}
          >
            <MaterialCommunityIcons name="account-group" size={24} color="#1976D2" />
            <AppText style={styles.quickActionButtonText}>Assigner animaux</AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleSellLot}
          >
            <MaterialCommunityIcons name="cash" size={24} color="#F57C00" />
            <AppText style={styles.quickActionButtonText}>Vente en lot</AppText>
          </TouchableOpacity>
        </View>

        {/* Liste */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <AppText color="#757575">Chargement...</AppText>
          </View>
        ) : filteredLots.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredLots}
            renderItem={renderLotItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
  header: {
    backgroundColor: Theme.primary,
  },
  headerContent: {
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabText: {
    fontSize: 14,
  },
  tabstyle: {
    marginBottom: 16,
  },
  counter: {
    fontSize: 14,
    marginBottom: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionButtonText: {
    fontSize: 12,
    color: Theme.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 80,
  },
  lotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lotInfo: {
    flex: 1,
  },
  lotName: {
    fontSize: 16,
    color: Theme.textPrimary,
    marginBottom: 4,
  },
  lotDescription: {
    marginBottom: 2,
  },
  lotCountBadge: {
    backgroundColor: Theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  lotCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    color: Theme.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default LotListScreen;

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTab from '../../../components/AppTab';
import AnimalListItem from '../../../components/list/AnimalListItem';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../../../storage/authStorage';
import { farmStorage } from '../../../storage/farmStorage';
import { Animal, AnimalFilters } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { useAnimals } from '../../../hooks/useAnimals';
import { useSync } from '../../../hooks/useSync';
import { useSyncStatus } from '../../../hooks/useSyncStatus';
import { Theme } from '../../../config/colors';

type CheptelListNavigationProp = StackNavigationProp<CheptelStackParamList, 'CheptelList'>;

const CheptelListScreen = () => {
  const navigation = useNavigation<CheptelListNavigationProp>();
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all');
  const [selectedSexe, setSelectedSexe] = useState<'male' | 'femelle' | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  // WatermelonDB hooks
  const { animals: dbAnimals, loading } = useAnimals(farmId || '');
  const { isSyncing, lastSyncedAt, lastError, manualSync } = useSync({
    farmId: farmId || '',
    autoSync: !!farmId, // Only enable auto-sync when farmId is loaded
    intervalMs: 60000,
  });
  const { pendingCount, failedCount } = useSyncStatus(farmId || '');

  // Charger la ferme active
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

  // Filtrage côté JavaScript
  const filteredAnimals = dbAnimals.filter((animal) => {
    // Exclure les animaux morts, vendus ou perdus de l'affichage principal
    if (['MORT', 'VENDU', 'PERDU'].includes(animal.statut || '')) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !animal.nom?.toLowerCase().includes(query) &&
        !animal.numero_identification?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (selectedSexe && animal.sexe !== selectedSexe) {
      return false;
    }
    if (selectedStatut && animal.statut !== selectedStatut) {
      return false;
    }
    if (selectedSpecies && animal.espece?.nom !== selectedSpecies) {
      return false;
    }
    return true;
  });

  // Debounce de la recherche
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  // Pull-to-refresh
  const handleRefresh = () => {
    manualSync();
  };

  // Reset filtres
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSexe(null);
    setSelectedStatut(null);
    setSelectedSpecies(null);
    setActiveFilterTab('all');
  };

  // Handle tab change
  const handleFilterTabChange = (tabId: string) => {
    setActiveFilterTab(tabId);
    if (tabId === 'all') {
      setSelectedSexe(null);
      setSelectedStatut(null);
    } else if (tabId === 'sain') {
      setSelectedSexe(null);
      setSelectedStatut('SAIN');
    } else if (tabId === 'malade') {
      setSelectedSexe(null);
      setSelectedStatut('MALADE');
    } else if (tabId === 'traitement') {
      setSelectedSexe(null);
      setSelectedStatut('EN_TRAITEMENT');
    }
  };

  // Tab options
  const filterTabOptions = [
    { id: 'all', label: 'Tous', count: dbAnimals.filter(a => !['MORT', 'VENDU', 'PERDU'].includes(a.statut || '')).length },
    { id: 'sain', label: 'Sain', count: dbAnimals.filter(a => a.statut === 'SAIN').length },
    { id: 'malade', label: 'Malade', count: dbAnimals.filter(a => a.statut === 'MALADE').length },
    { id: 'traitement', label: 'Traitement', count: dbAnimals.filter(a => a.statut === 'EN_TRAITEMENT').length },
  ];

  // Navigation vers détail
  const handleAnimalPress = (animal: any) => {
    navigation.navigate('AnimalDetail' as any, { animalId: animal.id });
  };

  // Navigation vers édition
  const handleEditAnimal = (animal: any) => {
    navigation.navigate('AnimalForm' as any, { animalId: animal.id });
  };

  // Navigation vers formulaire de naissance
  const handleAddAnimal = () => {
    navigation.navigate('AnimalNaissance' as any);
  };

  // Calculer le nombre d'animaux dans l'historique
  const historyCount = dbAnimals.filter(a => ['MORT', 'VENDU', 'PERDU'].includes(a.statut || '')).length;

  // Navigation vers historique
  const handleHistoryPress = () => {
    navigation.navigate('AnimalHistory' as any);
  };

  // Charger au montage
  useFocusEffect(
    useCallback(() => {
      loadActiveFarm();
    }, [])
  );

  // Render item animal using reusable component
  const renderAnimal = ({ item }: { item: Animal }) => (
    <AnimalListItem 
      animal={item} 
      onPress={handleAnimalPress} 
      onEdit={handleEditAnimal}
      healthStatus={item.etat_sante} 
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="cow" size={64} color="#BDBDBD" />
      <AppText style={styles.emptyTitle} fontWeight="bold">
        Aucun animal enregistré
      </AppText>
      <AppText style={styles.emptyText} color="#757575">
        Commencez par ajouter votre premier animal
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
        onRightButtonPress={handleAddAnimal}
        style={styles.header}
      >
        {/* Bouton historique à côté du bouton plus */}
        <TouchableOpacity 
          style={styles.historyButton} 
          onPress={handleHistoryPress}
        >
          <MaterialCommunityIcons name="clock-outline" size={24} color="#FFFFFF" />
          {historyCount > 0 && (
            <View style={styles.historyBadge}>
              <AppText style={styles.historyBadgeText} color="#FFFFFF" fontSize={10} fontWeight="bold">
                {historyCount > 9 ? '9+' : historyCount}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <AppText style={styles.headerTitle}>Mon Cheptel</AppText>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={Theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un animal..."
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
          {filteredAnimals.length} animal{filteredAnimals.length > 1 ? 'x' : ''}
        </AppText>

        {/* Liste */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <AppText color="#757575">Chargement...</AppText>
          </View>
        ) : filteredAnimals.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredAnimals as any[]}
            renderItem={renderAnimal}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} tintColor="#2E7D32" />
            }
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
    justifyContent:'center',
    alignItems:'center',
    height:200
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    width:'80%',
    alignItems: 'center',
    backgroundColor: Theme.backgroundLight,
    borderRadius: 60,
    paddingHorizontal: 16,
    marginBottom:10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height:40,
    fontSize: 16,
    color: Theme.textPrimary,
  },
  syncButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  syncButton: {
    backgroundColor: Theme.white,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterChip: {
    backgroundColor: Theme.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  filterChipReset: {
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
  },
  filterChipText: {
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipTextReset: {
    color: '#D32F2F',
  },
  tabText: {
    fontSize: 12,
  },
  tabstyle: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    height:40
  },
  counter: {
    fontSize: 14,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    color: Theme.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 18,
    color: Theme.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: 32,
  },
  syncBannerPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  syncBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncBannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncBannerText: {
    marginLeft: 8,
  },
  historyButton: {
    position: 'absolute',
    right: 40,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  historyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: Theme.primary,
  },
  historyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default CheptelListScreen;

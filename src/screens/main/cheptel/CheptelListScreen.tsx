import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppBottomSheet, { BottomSheetOption, AppBottomSheetRef } from '../../../components/AppBottomSheet';
import AnimalListItem from '../../../components/list/AnimalListItem';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../../../storage/authStorage';
import { Animal, AnimalFilters } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { getLocalAnimals } from '../../../database/repositories/animalRepository';
import { fullSync } from '../../../sync/syncService';
import { syncEvents } from '../../../sync/syncEvents';

type CheptelListNavigationProp = StackNavigationProp<CheptelStackParamList, 'CheptelList'>;

const CheptelListScreen = () => {
  const navigation = useNavigation<CheptelListNavigationProp>();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSexe, setSelectedSexe] = useState<'male' | 'femelle' | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<{ total: number; last_page: number } | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const bottomSheetRef = useRef<AppBottomSheetRef>(null);

  // Charger la ferme active
  const loadActiveFarm = async () => {
    try {
      const activeFarm = await authStorage.getItem('active_farm');
      console.log('Active farm from storage:', activeFarm);
      if (activeFarm) {
        const farm = JSON.parse(activeFarm);
        console.log('Parsed farm:', farm);
        setFarmId(farm.id);
      } else {
        console.log('No active farm found in storage');
        setError('Aucune ferme active sélectionnée. Veuillez sélectionner une ferme.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setError('Erreur lors du chargement de la ferme active');
      setLoading(false);
    }
  };

  // Charger les animaux (lecture locale SQLite)
  const loadAnimals = async (pageNum: number = 1, isRefresh: boolean = false) => {
    console.log('loadAnimals called with farmId:', farmId, 'pageNum:', pageNum, 'isRefresh:', isRefresh);
    if (!farmId) {
      console.log('No farmId, cannot load animals');
      setError('Aucune ferme active sélectionnée');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setLoading(true);
      }
      setError(null);

      // Lecture locale depuis SQLite
      const localAnimals = await getLocalAnimals(farmId);
      console.log('Local animals loaded:', localAnimals.length);

      // Filtrage côté JavaScript (limitation actuelle: pas de filtres SQL)
      let filteredAnimals = localAnimals;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredAnimals = filteredAnimals.filter(
          (animal) =>
            animal.nom?.toLowerCase().includes(query) ||
            animal.numero_identification?.toLowerCase().includes(query)
        );
      }

      if (selectedSexe) {
        filteredAnimals = filteredAnimals.filter((animal) => animal.sexe === selectedSexe);
      }

      if (selectedStatut) {
        filteredAnimals = filteredAnimals.filter((animal) => animal.statut === selectedStatut);
      }

      // Pagination côté JavaScript (limitation: pas de pagination SQL)
      const perPage = 15;
      const startIndex = (pageNum - 1) * perPage;
      const paginatedAnimals = filteredAnimals.slice(startIndex, startIndex + perPage);

      if (pageNum === 1) {
        setAnimals(paginatedAnimals);
      } else {
        setAnimals([...animals, ...paginatedAnimals]);
      }

      setMeta({
        total: filteredAnimals.length,
        last_page: Math.ceil(filteredAnimals.length / perPage),
      });
      setPage(pageNum);
    } catch (err: any) {
      console.error('Error loading animals:', err);
      setError(err.message || 'Erreur lors du chargement des animaux');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounce de la recherche
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      setPage(1);
      loadAnimals(1, false);
    }, 300);
    setSearchTimeout(timeout);
  };

  // Pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadAnimals(1, true);
  };

  // Charger plus
  const handleLoadMore = () => {
    if (meta && page < meta.last_page && !loading) {
      loadAnimals(page + 1, false);
    }
  };

  // Reset filtres
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSexe(null);
    setSelectedStatut(null);
    setPage(1);
    loadAnimals(1, true);
  };

  // Synchronisation manuelle
  const handleManualSync = async () => {
    if (!farmId) {
      setError('Aucune ferme active sélectionnée');
      return;
    }

    try {
      setSyncing(true);
      setSyncError(null);
      setSyncSuccess(false);

      await fullSync(farmId);

      setSyncSuccess(true);
      // Reload local data after successful sync
      await loadAnimals(1, true);

      // Hide success message after 3 seconds
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: any) {
      setSyncError(err.message || 'Erreur lors de la synchronisation');
      // Hide error message after 5 seconds
      setTimeout(() => setSyncError(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  // Navigation vers détail
  const handleAnimalPress = (animal: Animal) => {
    navigation.navigate('AnimalDetail', { animalId: animal.id });
  };

  // Options du bottom sheet
  const bottomSheetOptions: BottomSheetOption[] = [
    {
      id: 'achat',
      label: 'Acheter un animal',
      icon: 'cart',
      iconColor: '#30A15E',
      onPress: () => navigation.navigate('AnimalAchat'),
    },
    {
      id: 'saisie',
      label: 'Saisie manuelle',
      icon: 'pencil',
      iconColor: '#30A15E',
      onPress: () => navigation.navigate('AnimalForm', {}),
    },
  ];

  // Navigation vers formulaire création
  const handleAddAnimal = () => {
    bottomSheetRef.current?.present();
  };

  // Charger au montage
  useEffect(() => {
    loadActiveFarm();
  }, []);

  // Recharger quand farmId change
  useEffect(() => {
    if (farmId) {
      loadAnimals(1, true);
    }
  }, [farmId]);

  // Recharger quand l'écran reçoit le focus
  useFocusEffect(
    useCallback(() => {
      if (farmId) {
        loadAnimals(1, true);
      }
    }, [farmId])
  );

  // Subscribe to sync events to refresh data when sync completes
  useEffect(() => {
    const unsubscribeFull = syncEvents.subscribe('sync:full:completed', () => {
      console.log('[CheptelListScreen] Sync full completed event received, reloading animals');
      if (farmId) {
        loadAnimals(1, true);
      }
    });

    return () => {
      unsubscribeFull();
    };
  }, [farmId]);

  // Render item animal using reusable component
  const renderAnimal = ({ item }: { item: Animal }) => (
    <AnimalListItem animal={item} onPress={handleAnimalPress} />
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
      <AppButton
        title="Ajouter un animal"
        onPress={handleAddAnimal}
        style={styles.emptyButton}
      />
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <MaterialCommunityIcons name="alert-circle" size={64} color="#D32F2F" />
      <AppText style={styles.errorTitle} fontWeight="bold">
        Erreur de chargement
      </AppText>
      <AppText style={styles.errorText} color="#757575">
        {error}
      </AppText>
      <AppButton
        title="Réessayer"
        onPress={() => loadAnimals(1, true)}
        style={styles.errorButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Cheptel"
        subtitle="Gérez vos animaux"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />

      <View style={styles.content}>
        {/* Sync status banners */}
        {syncSuccess && (
          <View style={styles.syncBannerSuccess}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#2E7D32" />
            <AppText style={styles.syncBannerText} color="#2E7D32" fontSize={14}>
              Synchronisation réussie
            </AppText>
          </View>
        )}
        {syncError && (
          <View style={styles.syncBannerError}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
            <AppText style={styles.syncBannerText} color="#D32F2F" fontSize={14}>
              {syncError}
            </AppText>
          </View>
        )}

        {/* Barre de recherche et sync button */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un animal..."
            placeholderTextColor="#BDBDBD"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#BDBDBD" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleManualSync}
            disabled={syncing}
          >
            <MaterialCommunityIcons
              name={syncing ? 'loading' : 'sync'}
              size={20}
              color={syncing ? '#BDBDBD' : '#2E7D32'}
            />
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedSexe === 'male' && styles.filterChipActive]}
            onPress={() => {
              setSelectedSexe(selectedSexe === 'male' ? null : 'male');
              setPage(1);
              loadAnimals(1, false);
            }}
          >
            <MaterialCommunityIcons
              name="gender-male"
              size={14}
              color={selectedSexe === 'male' ? '#fff' : '#757575'}
              style={styles.filterChipIcon}
            />
            <AppText
              style={[styles.filterChipText, selectedSexe === 'male' && styles.filterChipTextActive]}
              fontSize={12}
            >
              Mâle
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedSexe === 'femelle' && styles.filterChipActive]}
            onPress={() => {
              setSelectedSexe(selectedSexe === 'femelle' ? null : 'femelle');
              setPage(1);
              loadAnimals(1, false);
            }}
          >
            <MaterialCommunityIcons
              name="gender-female"
              size={14}
              color={selectedSexe === 'femelle' ? '#fff' : '#757575'}
              style={styles.filterChipIcon}
            />
            <AppText
              style={[styles.filterChipText, selectedSexe === 'femelle' && styles.filterChipTextActive]}
              fontSize={12}
            >
              Femelle
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedStatut === 'ACTIF' && styles.filterChipActive]}
            onPress={() => {
              setSelectedStatut(selectedStatut === 'ACTIF' ? null : 'ACTIF');
              setPage(1);
              loadAnimals(1, false);
            }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={14}
              color={selectedStatut === 'ACTIF' ? '#fff' : '#757575'}
              style={styles.filterChipIcon}
            />
            <AppText
              style={[styles.filterChipText, selectedStatut === 'ACTIF' && styles.filterChipTextActive]}
              fontSize={12}
            >
              Actif
            </AppText>
          </TouchableOpacity>
          {(selectedSexe || selectedStatut) && (
            <TouchableOpacity
              style={[styles.filterChip, styles.filterChipReset]}
              onPress={resetFilters}
            >
              <AppText style={styles.filterChipTextReset} fontSize={12}>
                Réinitialiser
              </AppText>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Compteur */}
        {meta && (
          <AppText style={styles.counter} color="#757575">
            {meta.total} animal{meta.total > 1 ? 'x' : ''}
          </AppText>
        )}

        {/* Liste */}
        {loading && page === 1 ? (
          <View style={styles.loadingContainer}>
            <AppText color="#757575">Chargement...</AppText>
          </View>
        ) : error ? (
          renderErrorState()
        ) : animals.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={animals}
            renderItem={renderAnimal}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2E7D32" />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              page < (meta?.last_page || 1) ? (
                <View style={styles.loadingMore}>
                  <AppText color="#757575">Chargement...</AppText>
                </View>
              ) : null
            }
          />
        )}

        {/* Bottom Sheet */}
        <AppBottomSheet
          ref={bottomSheetRef}
          options={bottomSheetOptions}
        />

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleAddAnimal}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
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
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterChipReset: {
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
  },
  filterChipText: {
    color: '#757575',
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
    color: '#212121',
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
    color: '#212121',
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
  syncButton: {
    marginLeft: 12,
    padding: 8,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default CheptelListScreen;

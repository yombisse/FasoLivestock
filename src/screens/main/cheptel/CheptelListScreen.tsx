import React, { useState, useEffect, useCallback } from 'react';
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
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import animalService from '../../../services/animal.service';
import { authStorage } from '../../../storage/authStorage';
import { Animal, AnimalFilters } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type CheptelListNavigationProp = StackNavigationProp<CheptelStackParamList, 'CheptelList'>;

const CheptelListScreen = () => {
  const navigation = useNavigation<CheptelListNavigationProp>();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSexe, setSelectedSexe] = useState<'male' | 'femelle' | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<{ total: number; last_page: number } | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

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

  // Charger les animaux
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

      const filters: AnimalFilters = {
        page: pageNum,
        per_page: 15,
      };

      if (searchQuery) filters.search = searchQuery;
      if (selectedSexe) filters.sexe = selectedSexe;
      if (selectedStatut) filters.statut = selectedStatut;

      console.log('Calling animalService.getAnimals with farmId:', farmId, 'filters:', filters);
      const response = await animalService.getAnimals(farmId, filters);
      console.log('Response received:', response);

      if (pageNum === 1) {
        setAnimals(response.animals);
      } else {
        setAnimals([...animals, ...response.animals]);
      }

      setMeta({
        total: response.meta.total,
        last_page: response.meta.last_page,
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

  // Navigation vers détail
  const handleAnimalPress = (animal: Animal) => {
    navigation.navigate('AnimalDetail', { animalId: animal.id });
  };

  // Navigation vers formulaire création
  const handleAddAnimal = () => {
    navigation.navigate('AnimalForm', {});
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

  // Couleurs avatar par espèce
  const getAvatarColor = (especeNom?: string) => {
    if (!especeNom) return '#BDBDBD';
    const espece = especeNom.toLowerCase();
    if (espece.includes('bovin')) return '#795548';
    if (espece.includes('ovin')) return '#90A4AE';
    if (espece.includes('caprin')) return '#FF8F00';
    if (espece.includes('porcin')) return '#F48FB1';
    if (espece.includes('volaille')) return '#FDD835';
    return '#BDBDBD';
  };

  // Badge statut
  const getStatusBadge = (statut?: string) => {
    if (!statut) return null;
    const status = statut.toUpperCase();
    let backgroundColor = '#F5F5F5';
    let textColor = '#757575';

    if (status === 'ACTIF') {
      backgroundColor = '#E8F5E9';
      textColor = '#2E7D32';
    } else if (status === 'VENDU') {
      backgroundColor = '#E3F2FD';
      textColor = '#1565C0';
    } else if (status === 'DÉCÉDÉ' || status === 'DECÉDÉ') {
      backgroundColor = '#FFEBEE';
      textColor = '#C62828';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <AppText style={styles.statusText} color={textColor} fontSize={12} fontWeight="600">
          {status}
        </AppText>
      </View>
    );
  };

  // Render item animal
  const renderAnimal = ({ item }: { item: Animal }) => (
    <TouchableOpacity
      style={styles.animalCard}
      onPress={() => handleAnimalPress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.avatarContainer,
          { backgroundColor: getAvatarColor(item.espece?.nom) },
        ]}
      >
        {item.photo ? (
          <AppText style={styles.avatarText}>{item.espece?.nom?.charAt(0) || '?'}</AppText>
        ) : (
          <AppText style={styles.avatarText}>{item.espece?.nom?.charAt(0) || '?'}</AppText>
        )}
      </View>
      <View style={styles.animalInfo}>
        <View style={styles.animalHeader}>
          <AppText style={styles.animalName} fontWeight="bold">
            {item.nom}
          </AppText>
          {getStatusBadge(item.statut)}
        </View>
        {item.numero_identification && (
          <AppText style={styles.animalId} color="#757575">
            #{item.numero_identification}
          </AppText>
        )}
        <View style={styles.animalDetails}>
          <AppText style={styles.animalDetail} color="#757575">
            {item.espece?.nom || 'Espèce inconnue'}
          </AppText>
          <AppText style={styles.animalDetail} color="#757575">
            • {item.sexe === 'male' ? 'Mâle' : 'Femelle'}
          </AppText>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
    </TouchableOpacity>
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
        style={styles.animalHeader}
        onMenuPress={() => (navigation as any).openDrawer()}
      />

      <View style={styles.content}>
        {/* Barre de recherche */}
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
  animalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  animalInfo: {
    flex: 1,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    height: 120,
  },
  animalName: {
    fontSize: 16,
    color: '#212121',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
  },
  animalId: {
    fontSize: 12,
    marginBottom: 4,
  },
  animalDetails: {
    flexDirection: 'row',
  },
  animalDetail: {
    fontSize: 14,
    marginRight: 8,
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

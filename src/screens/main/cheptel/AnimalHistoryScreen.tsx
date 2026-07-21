import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppHeader from '../../../components/AppHeader';
import AnimalListItem from '../../../components/list/AnimalListItem';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { farmStorage } from '../../../storage/farmStorage';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { useAnimals } from '../../../hooks/useAnimals';
import { Theme } from '../../../config/colors';

type AnimalHistoryNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalHistory'>;

const AnimalHistoryScreen = () => {
  const navigation = useNavigation<AnimalHistoryNavigationProp>();
  const [farmId, setFarmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // WatermelonDB hooks
  const { animals: dbAnimals, loading } = useAnimals(farmId || '');

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

  // Filtrer les animaux dans l'historique (MORT, VENDU, PERDU)
  const historyAnimals = dbAnimals.filter((animal) => {
    const isHistory = ['MORT', 'VENDU', 'PERDU'].includes(animal.statut || '');
    
    if (searchQuery && isHistory) {
      const query = searchQuery.toLowerCase();
      if (
        !animal.nom?.toLowerCase().includes(query) &&
        !animal.numero_identification?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    
    return isHistory;
  });

  // Debounce de la recherche
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  // Navigation vers détail (lecture seule)
  const handleAnimalPress = (animal: any) => {
    navigation.navigate('AnimalDetail' as any, { animalId: animal.id, readOnly: true });
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
      healthStatus={item.etat_sante} 
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clock-outline" size={64} color="#BDBDBD" />
      <AppText style={styles.emptyTitle} fontWeight="bold">
        Aucun animal dans l'historique
      </AppText>
      <AppText style={styles.emptyText} color="#757575">
        Les animaux décédés, vendus ou perdus apparaîtront ici
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        showBackButton
        onBackPress={() => navigation.goBack()}
        title="Historique du Cheptel"
        subtitle="Animaux décédés, vendus ou perdus"
        style={styles.header}
      />
      <View style={styles.content}>
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={Theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher dans l'historique..."
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

        {/* Compteur */}
        <AppText style={styles.counter} color="#757575">
          {historyAnimals.length} animal{historyAnimals.length > 1 ? 'x' : ''} dans l'historique
        </AppText>

        {/* Liste */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <AppText color="#757575">Chargement...</AppText>
          </View>
        ) : historyAnimals.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={historyAnimals as any[]}
            renderItem={renderAnimal}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Theme.textPrimary,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default AnimalHistoryScreen;

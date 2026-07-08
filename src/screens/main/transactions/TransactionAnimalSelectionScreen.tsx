import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../../../components/AppText';
import AppHeader from '../../../components/AppHeader';
import { farmStorage } from '../../../storage/farmStorage';
import animalService from '../../../services/animal.service';
import { getLocalActiveAnimals } from '../../../database/repositories/animalRepository';

const TransactionAnimalSelectionScreen = () => {
  const navigation = useNavigation();
  const [animals, setAnimals] = useState<any[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadAnimals = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (!farm) return;

      setLoading(true);
      
      // Use local-first pattern - only active animals can be sold
      const localAnimals = await getLocalActiveAnimals(farm.id);
      setAnimals(localAnimals);
      setFilteredAnimals(localAnimals);
    } catch (error) {
      console.error('Error loading animals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, []);

  useEffect(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      setFilteredAnimals(animals);
    } else {
      const filtered = animals.filter((animal) =>
        `${animal.nom || ''} ${animal.numero_identification || ''}`.toLowerCase().includes(query)
      );
      setFilteredAnimals(filtered);
    }
  }, [search, animals]);

  const handleAnimalSelect = (animal: any) => {
    navigation.navigate('AnimalVente' as never, { animalId: animal.id } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Sélectionner un animal à vendre"
        showBackButton={true}
        showBackground={true}
      />
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9E9E9E" />
          <TextInput
            style={styles.searchText}
            placeholder="Rechercher un animal..."
            placeholderTextColor="#9E9E9E"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#2E7D32" />
        ) : filteredAnimals.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cow-off" size={48} color="#BDBDBD" />
            <AppText style={styles.emptyText} color="#757575">
              {search ? 'Aucun animal trouvé' : 'Aucun animal disponible'}
            </AppText>
          </View>
        ) : (
          filteredAnimals.map((animal) => (
            <TouchableOpacity
              key={animal.id}
              style={styles.animalCard}
              onPress={() => handleAnimalSelect(animal)}
            >
              <View style={styles.animalIcon}>
                <MaterialCommunityIcons
                  name={animal.sexe === 'male' ? 'gender-male' : 'gender-female'}
                  size={24}
                  color={animal.sexe === 'male' ? '#2196F3' : '#E91E63'}
                />
              </View>
              <View style={styles.animalContent}>
                <AppText style={styles.animalName} fontWeight="bold">
                  {animal.nom || 'Sans nom'}
                </AppText>
                <AppText style={styles.animalId} color="#757575" fontSize={12}>
                  {animal.numero_identification || 'N° ID non défini'}
                </AppText>
                <AppText style={styles.animalRace} color="#9E9E9E" fontSize={11}>
                  {animal.espece?.nom || ''} • {animal.race || 'Race non définie'}
                </AppText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  animalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  animalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  animalContent: {
    flex: 1,
  },
  animalName: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 2,
  },
  animalId: {
    marginBottom: 2,
  },
  animalRace: {
    fontSize: 11,
  },
});

export default TransactionAnimalSelectionScreen;

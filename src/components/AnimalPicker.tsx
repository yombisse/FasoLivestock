import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Modalize } from 'react-native-modalize';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimalListItem from './list/AnimalListItem';
import { Animal } from '../types/animal.types';
import { Theme } from '../config/colors';

export interface AnimalPickerRef {
  present: () => void;
  dismiss: () => void;
}

interface AnimalPickerProps {
  animals: Animal[];
  onSelect: (animal: Animal) => void;
  selectedId?: string;
  title?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  filterBySpecies?: boolean;
  speciesFilter?: string[];
  onOpen?: () => Promise<void> | void;
}

const AnimalPicker = forwardRef<AnimalPickerRef, AnimalPickerProps>(({
  animals,
  onSelect,
  selectedId,
  title = 'Sélectionner un animal',
  searchPlaceholder = 'Rechercher un animal...',
  emptyMessage = 'Aucun animal trouvé',
  loading = false,
  filterBySpecies = false,
  speciesFilter,
  onOpen,
}, ref) => {
  const modalizeRef = useRef<Modalize>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => open(),
    dismiss: () => modalizeRef.current?.close(),
  }));

  const open = async () => {
    modalizeRef.current?.open();
    if (onOpen) {
      try {
        await onOpen();
      } catch (err) {
        console.error('Error loading picker items:', err);
      }
    }
  };

  const handleSelect = (animal: Animal) => {
    modalizeRef.current?.close();
    onSelect(animal);
  };

  // Get unique species from animals
  const uniqueSpecies = useMemo(() => {
    if (!filterBySpecies) return [];
    const speciesSet = new Set<string>();
    animals.forEach(animal => {
      if (animal.espece?.nom) {
        speciesSet.add(animal.espece.nom);
      }
    });
    const speciesArray = Array.from(speciesSet);
    
    // Apply species filter if provided
    if (speciesFilter && speciesFilter.length > 0) {
      return speciesArray.filter(s => speciesFilter.includes(s));
    }
    
    return speciesArray;
  }, [animals, filterBySpecies, speciesFilter]);

  // Filter animals by search and species
  const filteredAnimals = useMemo(() => {
    let result = animals;

    console.log('[AnimalPicker] Filtering animals:', {
      total: animals.length,
      filterBySpecies,
      selectedSpecies,
      searchQuery,
    });

    // Filter to show only alive and present animals (exclude MORT, VENDU, PERDU)
    result = result.filter(animal => {
      const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
      return !excludedStatuses.includes(animal.statut || '');
    });
    console.log('[AnimalPicker] After alive/present filter:', result.length);

    // Filter by species if enabled
    if (filterBySpecies && selectedSpecies) {
      result = result.filter(a => a.espece?.nom === selectedSpecies);
      console.log('[AnimalPicker] After species filter:', result.length);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(animal =>
        `${animal.nom || ''} ${animal.numero_identification || ''}`.toLowerCase().includes(query)
      );
      console.log('[AnimalPicker] After search filter:', result.length);
    }

    console.log('[AnimalPicker] Final filtered animals:', result.length);
    return result;
  }, [animals, filterBySpecies, selectedSpecies, searchQuery]);

  const renderSpeciesChip = (species: string) => {
    const isActive = selectedSpecies === species;
    return (
      <TouchableOpacity
        key={species}
        style={[styles.speciesChip, isActive && styles.speciesChipActive]}
        onPress={() => setSelectedSpecies(isActive ? null : species)}
      >
        <Text style={[styles.speciesChipText, isActive && styles.speciesChipTextActive]}>
          {species}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modalize
      ref={modalizeRef}
      snapPoint={70}
      modalStyle={styles.modal}
      handleStyle={styles.indicator}
      keyboardAvoidingBehavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardAvoidingOffset={Platform.OS === 'android' ? 80 : 0}
      withHandle={true}
      flatListProps={{
        data: [
          { type: 'header', title },
          { type: 'search', placeholder: searchPlaceholder },
          ...(filterBySpecies && uniqueSpecies.length > 0 ? [{ type: 'species', species: uniqueSpecies }] : []),
          ...(loading ? [{ type: 'loading' }] : []),
          ...(loading ? [] : filteredAnimals.map(a => ({ type: 'animal', data: a }))),
        ],
        keyExtractor: (item, index) => {
          if (item.type === 'header') return 'header';
          if (item.type === 'search') return 'search';
          if (item.type === 'species') return 'species';
          if (item.type === 'loading') return 'loading';
          if (item.type === 'animal') return item.data.id;
          return index.toString();
        },
        renderItem: ({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.title}>{item.title}</Text>;
          }
          if (item.type === 'search') {
            return (
              <View style={styles.searchRow}>
                <MaterialCommunityIcons name="magnify" size={18} color={Theme.textSecondary} />
                <TextInput
                  placeholder={item.placeholder}
                  placeholderTextColor={Theme.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  autoFocus
                  returnKeyType="search"
                  blurOnSubmit={false}
                />
              </View>
            );
          }
          if (item.type === 'species') {
            return (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.speciesFilterScroll}
                contentContainerStyle={styles.speciesFilterContent}
              >
                <TouchableOpacity
                  key="all"
                  style={[styles.speciesChip, selectedSpecies === null && styles.speciesChipActive]}
                  onPress={() => setSelectedSpecies(selectedSpecies === null ? null : null)}
                >
                  <Text style={[styles.speciesChipText, selectedSpecies === null && styles.speciesChipTextActive]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {item.species.map((s: string) => {
                  const isActive = selectedSpecies === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.speciesChip, isActive && styles.speciesChipActive]}
                      onPress={() => setSelectedSpecies(isActive ? null : s)}
                    >
                      <Text style={[styles.speciesChipText, isActive && styles.speciesChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            );
          }
          if (item.type === 'loading') {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.primary} />
              </View>
            );
          }
          if (item.type === 'animal') {
            return (
              <AnimalListItem
                animal={item.data}
                onPress={handleSelect}
                isActive={item.data.id === selectedId}
              />
            );
          }
          return null;
        },
        ItemSeparatorComponent: () => <View style={styles.separator} />,
        ListEmptyComponent: () => (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ),
        contentContainerStyle: styles.container,
        keyboardShouldPersistTaps: 'handled',
      }}
    />
  );
});

const styles = StyleSheet.create({
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: Theme.white,
  },
  indicator: {
    backgroundColor: '#E0E0E0',
    width: 40,
    height: 4,
  },
  container: {
    padding: 16,
    height: '70%',
    
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: Theme.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    color: Theme.textPrimary,
  },
  speciesFilterScroll: {
    marginBottom: 12,
  },
  speciesFilterContent: {
    paddingRight: 8,
  },
  speciesChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Theme.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  speciesChipActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  speciesChipText: {
    fontSize: 14,
    color: Theme.textPrimary,
  },
  speciesChipTextActive: {
    color: Theme.white,
  },
  list: {
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.inputBackground,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 12,
    color: Theme.textSecondary,
  },
});

export default AnimalPicker;

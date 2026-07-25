import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Modalize } from 'react-native-modalize';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimalListItem from './list/AnimalListItem';
import { Animal } from '../types/animal.types';
import { Theme } from '../config/colors';

export interface AnimalMultiPickerRef {
  present: () => void;
  dismiss: () => void;
}

interface AnimalMultiPickerProps {
  animals: Animal[];
  onSelect: (selectedAnimals: Animal[]) => void;
  selectedIds?: string[];
  title?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  filterBySpecies?: boolean;
  speciesFilter?: string[];
  onOpen?: () => Promise<void> | void;
}

const AnimalMultiPicker = forwardRef<AnimalMultiPickerRef, AnimalMultiPickerProps>(({
  animals,
  onSelect,
  selectedIds = [],
  title = 'Sélectionner des animaux',
  searchPlaceholder = 'Rechercher des animaux...',
  emptyMessage = 'Aucun animal trouvé',
  loading = false,
  filterBySpecies = false,
  speciesFilter,
  onOpen,
}, ref) => {
  const modalizeRef = useRef<Modalize>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set(selectedIds));

  useImperativeHandle(ref, () => ({
    present: () => open(),
    dismiss: () => modalizeRef.current?.close(),
  }));

  const open = async () => {
    setTempSelectedIds(new Set(selectedIds));
    modalizeRef.current?.open();
    if (onOpen) {
      try {
        await onOpen();
      } catch (err) {
        console.error('Error loading picker items:', err);
      }
    }
  };

  const toggleSelection = (animal: Animal) => {
    const newSelected = new Set(tempSelectedIds);
    if (newSelected.has(animal.id)) {
      newSelected.delete(animal.id);
    } else {
      newSelected.add(animal.id);
    }
    setTempSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selectedAnimals = animals.filter(a => tempSelectedIds.has(a.id));
    modalizeRef.current?.close();
    onSelect(selectedAnimals);
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

    // Filter to show only alive and present animals (exclude MORT, VENDU, PERDU)
    result = result.filter(animal => {
      const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
      return !excludedStatuses.includes(animal.statut || '');
    });

    // Filter by species if enabled
    if (filterBySpecies && selectedSpecies) {
      result = result.filter(a => a.espece?.nom === selectedSpecies);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(animal =>
        `${animal.nom || ''} ${animal.numero_identification || ''}`.toLowerCase().includes(query)
      );
    }

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

  const renderAnimalItem = ({ item }: { item: Animal }) => {
    const isSelected = tempSelectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.animalItem, isSelected && styles.animalItemSelected]}
        onPress={() => toggleSelection(item)}
      >
        <View style={styles.animalItemContent}>
          <AnimalListItem animal={item} showStatus={false} />
        </View>
        <View style={styles.checkboxContainer}>
          <MaterialCommunityIcons
            name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={isSelected ? Theme.primary : Theme.textSecondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const selectedCount = tempSelectedIds.size;

  return (
    <Modalize
      ref={modalizeRef}
      snapPoint={85}
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
            return (
              <View style={styles.headerContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.selectedCount}>{selectedCount} sélectionné(s)</Text>
              </View>
            );
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
                  onPress={() => setSelectedSpecies(null)}
                >
                  <Text style={[styles.speciesChipText, selectedSpecies === null && styles.speciesChipTextActive]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {item.species.map((s: string) => renderSpeciesChip(s))}
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
            return renderAnimalItem({ item: item.data });
          }
          return null;
        },
        ListFooterComponent: () => (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmButton, selectedCount === 0 && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={selectedCount === 0}
            >
              <Text style={[styles.confirmButtonText, selectedCount === 0 && styles.confirmButtonTextDisabled]}>
                Valider ({selectedCount})
              </Text>
            </TouchableOpacity>
          </View>
        ),
        ListEmptyComponent: () => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ),
      }}
    />
  );
});

const styles = StyleSheet.create({
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    backgroundColor: Theme.textSecondary,
    width: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text,
  },
  selectedCount: {
    fontSize: 14,
    color: Theme.primary,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: Theme.text,
  },
  speciesFilterScroll: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  speciesFilterContent: {
    paddingRight: 10,
  },
  speciesChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.background,
    marginRight: 8,
  },
  speciesChipActive: {
    backgroundColor: Theme.primary,
  },
  speciesChipText: {
    fontSize: 13,
    color: Theme.textSecondary,
  },
  speciesChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  animalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  animalItemSelected: {
    backgroundColor: Theme.primary + '10',
  },
  animalItemContent: {
    flex: 1,
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  confirmButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Theme.border,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: Theme.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.textSecondary,
    fontSize: 14,
  },
});

export default AnimalMultiPicker;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppSelect, { AppSelectOption } from '../../../components/AppSelect';
import AnimalMultiPicker, { AnimalMultiPickerRef } from '../../../components/AnimalMultiPicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { getLocalLots } from '../../../database/repositories/lotRepository';
import { updateAnimal } from '../../../database/repositories/animalRepository';
import { useAnimals } from '../../../hooks/useAnimals';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type LotAssignNavigationProp = StackNavigationProp<CheptelStackParamList, 'LotAssign'>;

const LotAssignScreen = () => {
  const navigation = useNavigation<LotAssignNavigationProp>();
  const animalMultiPickerRef = useRef<AnimalMultiPickerRef>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  // Load animals from WatermelonDB
  const { animals, loading: loadingAnimals } = useAnimals(farmId || '');

  // Lots state
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');

  const lotOptions = lots.map((lot: any) => ({
    label: lot.nom_lot,
    value: lot.id,
  }));

  // Selected animals state
  const [selectedAnimals, setSelectedAnimals] = useState<Animal[]>([]);

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);

        // Load lots for this farm
        const farmLots = await getLocalLots(farm.id);
        setLots(farmLots);
      } else {
        setSubmitError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setSubmitError('Erreur lors du chargement de la ferme active');
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  const handleAnimalSelection = (selected: Animal[]) => {
    setSelectedAnimals(selected);
  };

  const removeAnimal = (animalId: string) => {
    setSelectedAnimals(prev => prev.filter(a => a.id !== animalId));
  };

  const validate = (): boolean => {
    if (!selectedLotId) {
      setSubmitError('Veuillez sélectionner un lot');
      return false;
    }
    if (selectedAnimals.length === 0) {
      setSubmitError('Veuillez sélectionner au moins un animal');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const user = await authStorage.getUser();
      const userId = user?.id;

      // Update each selected animal with the new lot_id
      for (const animal of selectedAnimals) {
        await updateAnimal(animal.id, {
          lot_id: selectedLotId,
          last_modified_by: userId,
        });
      }

      Alert.alert(
        'Succès',
        `${selectedAnimals.length} animal(s) assigné(s) au lot avec succès`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[LotAssignScreen] Error assigning animals to lot:', error);
      setSubmitError(error.message || 'Impossible d\'assigner les animaux au lot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Assigner des animaux à un lot" showBackButton />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {submitError && (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>{submitError}</AppText>
          </View>
        )}

        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Lot *</AppText>
            <AppSelect
              options={lotOptions}
              selectedValue={selectedLotId}
              onSelect={setSelectedLotId}
              placeholder="Sélectionner un lot"
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Animaux *</AppText>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => animalMultiPickerRef.current?.present()}
            >
              <AppText style={styles.selectButtonText}>
                {selectedAnimals.length > 0
                  ? `${selectedAnimals.length} animal(s) sélectionné(s)`
                  : 'Sélectionner des animaux'}
              </AppText>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
            </TouchableOpacity>
          </View>

          {selectedAnimals.length > 0 && (
            <View style={styles.selectedAnimalsContainer}>
              <AppText style={styles.selectedAnimalsTitle}>
                Animaux sélectionnés ({selectedAnimals.length})
              </AppText>
              {selectedAnimals.map((animal) => (
                <View key={animal.id} style={styles.selectedAnimalItem}>
                  <View style={styles.selectedAnimalInfo}>
                    <AppText style={styles.selectedAnimalName}>
                      {animal.nom || animal.numero_identification}
                    </AppText>
                    <AppText style={styles.selectedAnimalDetails}>
                      {animal.numero_identification} • {animal.espece?.nom || 'Non défini'}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeAnimal(animal.id)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <AppButton
            title="Assigner au lot"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!farmId || loadingAnimals}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>

      <AnimalMultiPicker
        ref={animalMultiPickerRef}
        animals={animals}
        onSelect={handleAnimalSelection}
        selectedIds={selectedAnimals.map(a => a.id)}
        title="Sélectionner des animaux"
        loading={loadingAnimals}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedAnimalsContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  selectedAnimalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  selectedAnimalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedAnimalInfo: {
    flex: 1,
  },
  selectedAnimalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedAnimalDetails: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  submitButton: {
    marginTop: 8,
  },
});

export default LotAssignScreen;

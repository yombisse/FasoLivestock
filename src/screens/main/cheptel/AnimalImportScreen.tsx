import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import mouvementService from '../../../services/mouvement.service';
import { authStorage } from '../../../storage/authStorage';
import { ImportRequest } from '../../../types/mouvement.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { getLocalAnimalByNumeroIdentification } from '../../../database/repositories/animalRepository';

type AnimalImportNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalImport'>;

const AnimalImportScreen = () => {
  const navigation = useNavigation<AnimalImportNavigationProp>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [dateImport, setDateImport] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<{
    provenance: string;
    notes: string;
  }>({
    provenance: '',
    notes: '',
  });

  const [animals, setAnimals] = useState<Array<{
    espece_id: string;
    race: string;
    sexe: 'male' | 'femelle';
    numero_identification: string;
    poids: string;
    date_naissance: string;
  }>>([
    {
      espece_id: '',
      race: '',
      sexe: 'male',
      numero_identification: '',
      poids: '',
      date_naissance: '',
    },
  ]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Charger la ferme active
  const loadActiveFarm = async () => {
    try {
      const activeFarm = await authStorage.getItem('active_farm');
      if (activeFarm) {
        const farm = JSON.parse(activeFarm);
        setFarmId(farm.id);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  const addAnimal = () => {
    setAnimals([
      ...animals,
      {
        espece_id: '',
        race: '',
        sexe: 'male',
        numero_identification: '',
        poids: '',
        date_naissance: '',
      },
    ]);
  };

  const removeAnimal = (index: number) => {
    if (animals.length > 1) {
      setAnimals(animals.filter((_, i) => i !== index));
    }
  };

  const updateAnimal = (index: number, field: string, value: any) => {
    const updatedAnimals = [...animals];
    updatedAnimals[index] = { ...updatedAnimals[index], [field]: value };
    setAnimals(updatedAnimals);
  };

  const validate = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};

    if (!dateImport) errors.dateImport = 'Date d\'import requise';
    if (!formData.provenance) errors.provenance = 'Provenance requise';

    for (let i = 0; i < animals.length; i++) {
      const animal = animals[i];
      if (!animal.espece_id) errors[`animal_${i}_espece`] = 'Espèce requise';

      // Check for duplicate numero_identification
      if (animal.numero_identification && farmId) {
        const existingAnimal = await getLocalAnimalByNumeroIdentification(farmId, animal.numero_identification);
        if (existingAnimal) {
          errors[`animal_${i}_numero_identification`] = 'Ce numéro existe déjà';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = await validate();
    if (!isValid) return;
    if (!farmId) {
      Alert.alert('Erreur', 'Aucune ferme active sélectionnée');
      return;
    }

    try {
      setSubmitting(true);

      const payload: ImportRequest = {
        farm_id: farmId,
        animaux: animals.map((a) => ({
          espece_id: a.espece_id,
          race: a.race || undefined,
          sexe: a.sexe,
          numero_identification: a.numero_identification || undefined,
          poids: a.poids ? parseFloat(a.poids) : undefined,
          date_naissance: a.date_naissance || undefined,
        })),
        date_import: dateImport!.toISOString(),
        provenance: formData.provenance,
        notes: formData.notes || undefined,
      };

      // Use local repository for offline-first pattern
      const { createAnimal } = await import('../../../database/repositories/animalRepository');
      
      // Create animals locally
      for (const animal of animals) {
        await createAnimal({
          farm_id: farmId,
          nom: `Animal importé ${animal.numero_identification || animal.espece_id}`,
          espece_id: animal.espece_id,
          race: animal.race || undefined,
          sexe: animal.sexe,
          numero_identification: animal.numero_identification || undefined,
          poids: animal.poids ? parseFloat(animal.poids) : undefined,
          date_naissance: animal.date_naissance || undefined,
          statut: 'ACTIF',
        });
      }
      
      Alert.alert('Succès', 'Import réussi', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'import');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Importer des animaux"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Provenance */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Provenance *</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Origine du lot"
            value={formData.provenance}
            onChangeText={(text) => setFormData({ ...formData, provenance: text })}
          />
          {fieldErrors.provenance && <AppText style={styles.errorText}>{fieldErrors.provenance}</AppText>}
        </View>

        {/* Date d'import */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Date d'import *</AppText>
          <AppDateTimePicker
            value={dateImport}
            onChange={setDateImport}
            placeholder="Sélectionner la date"
          />
          {fieldErrors.dateImport && <AppText style={styles.errorText}>{fieldErrors.dateImport}</AppText>}
        </View>

        {/* Notes */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Notes</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Notes supplémentaires"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
          />
        </View>

        {/* Liste des animaux */}
        <View style={styles.animalsSection}>
          <View style={styles.animalsHeader}>
            <AppText style={styles.animalsTitle}>Animaux ({animals.length})</AppText>
            <AppButton
              title="+ Ajouter"
              onPress={addAnimal}
              style={styles.addButton}
            />
          </View>

          {animals.map((animal, index) => (
            <View key={index} style={styles.animalCard}>
              <View style={styles.animalCardHeader}>
                <AppText style={styles.animalCardTitle}>Animal {index + 1}</AppText>
                {animals.length > 1 && (
                  <AppButton
                    title="Supprimer"
                    onPress={() => removeAnimal(index)}
                    style={styles.removeButton}
                  />
                )}
              </View>

              <AppText style={styles.fieldLabel}>Espèce *</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="ID de l'espèce"
                value={animal.espece_id}
                onChangeText={(text) => updateAnimal(index, 'espece_id', text)}
              />
              {fieldErrors[`animal_${index}_espece`] && (
                <AppText style={styles.errorText}>{fieldErrors[`animal_${index}_espece`]}</AppText>
              )}

              <AppText style={styles.fieldLabel}>Sexe</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="male ou femelle"
                value={animal.sexe}
                onChangeText={(text) => updateAnimal(index, 'sexe', text as 'male' | 'femelle')}
              />

              <AppText style={styles.fieldLabel}>Race</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="Race"
                value={animal.race}
                onChangeText={(text) => updateAnimal(index, 'race', text)}
              />

              <AppText style={styles.fieldLabel}>Numéro d'identification</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="Numéro"
                value={animal.numero_identification}
                onChangeText={(text) => updateAnimal(index, 'numero_identification', text)}
              />

              <AppText style={styles.fieldLabel}>Poids (kg)</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="Poids"
                value={animal.poids}
                onChangeText={(text) => updateAnimal(index, 'poids', text)}
                keyboardType="numeric"
              />

              <AppText style={styles.fieldLabel}>Date de naissance</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={animal.date_naissance}
                onChangeText={(text) => updateAnimal(index, 'date_naissance', text)}
              />
            </View>
          ))}
        </View>

        {/* Bouton submit */}
        <AppButton
          title="Importer le lot"
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitButton}
        />
      </ScrollView>
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
  contentContainer: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212121',
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  animalsSection: {
    marginTop: 24,
  },
  animalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  animalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  addButton: {
    width: 120,
    height: 36,
  },
  animalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  animalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  animalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  removeButton: {
    width: 80,
    height: 32,
    backgroundColor: '#D32F2F',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 8,
    color: '#757575',
  },
  submitButton: {
    marginTop: 24,
  },
});

export default AnimalImportScreen;

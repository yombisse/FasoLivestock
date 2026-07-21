import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AnimalPicker, { AnimalPickerRef } from '../../../components/AnimalPicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import mouvementService from '../../../services/mouvement.service';
import { authStorage } from '../../../storage/authStorage';
import { farmStorage } from '../../../storage/farmStorage';
import { NaissanceRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { createNaissance } from '../../../database/repositories/naissanceRepository';
import { useEligibleFemales } from '../../../hooks/useEligibleFemales';
import { Theme } from '../../../config/colors';
import { useEspeces } from '../../../hooks/useEspeces';
import database from '../../../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

type AnimalNaissanceRouteProp = RouteProp<CheptelStackParamList, 'AnimalNaissance'>;
type AnimalNaissanceNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalNaissance'>;

interface NewbornDraft {
  id: number;
  nom: string;
  numero_identification: string;
  sexe: 'male' | 'femelle' | '';
  poids: string;
}

const createBlankNewborn = (id: number): NewbornDraft => ({
  id,
  nom: '',
  numero_identification: '',
  sexe: '',
  poids: '',
});

const AnimalNaissanceScreen = () => {
  const navigation = useNavigation<AnimalNaissanceNavigationProp>();
  const route = useRoute<AnimalNaissanceRouteProp>();
  const motherPickerRef = useRef<AnimalPickerRef>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [selectedMother, setSelectedMother] = useState<Animal | null>(null);
  const [dateNaissance, setDateNaissance] = useState<Date | undefined>(undefined);
  const [newborns, setNewborns] = useState<NewbornDraft[]>([createBlankNewborn(1)]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nombrePetits: '1',
    poidsNaissance: '',
    observation: '',
    creerPetits: true,
  });

  // Load especes from WatermelonDB
  const { especes, loading: loadingEspeces } = useEspeces();

  // Load eligible females (with gestation EN_COURS) for mother selection
  const { eligibleFemales, loading: loadingFemales } = useEligibleFemales(farmId || '');

  const formatDate = (value?: Date) => value ? value.toISOString().split('T')[0] : undefined;

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

  useEffect(() => {
    loadActiveFarm();
  }, []);

  // Set selected mother from route params when eligible females are loaded
  useEffect(() => {
    if (route.params?.motherId && eligibleFemales.length > 0) {
      const existing = eligibleFemales.find((female: Animal) => female.id === route.params?.motherId);
      if (existing) {
        setSelectedMother(existing);
      }
    }
  }, [route.params?.motherId, eligibleFemales]);

  useEffect(() => {
    if (route.params?.motherId && !selectedMother) {
      setSelectedMother({ id: route.params.motherId, nom: route.params.motherName || 'Femelle sélectionnée' } as Animal);
    }
  }, [route.params?.motherId]);

  const updateNewbornCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(6, count));
    setFormData((prev) => ({ ...prev, nombrePetits: String(safeCount) }));

    setNewborns((prev) => {
      if (prev.length === safeCount) return prev;
      if (prev.length < safeCount) {
        const next = [...prev];
        while (next.length < safeCount) {
          next.push(createBlankNewborn(next.length + 1));
        }
        return next;
      }
      return prev.slice(0, safeCount);
    });
  };

  const updateNewborn = (index: number, field: keyof NewbornDraft, value: string) => {
    setNewborns((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedMother) errors.mother_id = 'Sélectionnez une femelle éligible';
    if (!dateNaissance) errors.dateNaissance = 'Date de naissance requise';
    const count = Number(formData.nombrePetits);
    if (!count || count < 1) errors.nombrePetits = 'Nombre de petits requis';

    newborns.forEach((newborn, index) => {
      if (!newborn.numero_identification.trim()) {
        errors[`newborn_${index}_numero_identification`] = 'Numéro d\'identification requis';
      }
      if (!newborn.sexe) {
        errors[`newborn_${index}_sexe`] = 'Sexe requis';
      }
      if (!newborn.poids.trim()) {
        errors[`newborn_${index}_poids`] = 'Poids requis';
      } else if (Number(newborn.poids) <= 0) {
        errors[`newborn_${index}_poids`] = 'Poids invalide';
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!farmId || !selectedMother) {
      setSubmitError('Aucune ferme active sélectionnée ou femelle non choisie');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const weights = newborns.map((item) => Number(item.poids));
      const averageWeight = weights.reduce((sum, value) => sum + value, 0) / weights.length;
      const observation = newborns
        .map((item, index) => `${item.nom.trim() || `Petit ${index + 1}`} • ${item.sexe === 'male' ? 'mâle' : 'femelle'} • ${item.poids} kg`)
        .join(' | ');

      // Create naissance record
      const createdNaissance = await createNaissance({
        farm_id: farmId,
        mother_id: selectedMother.id,
        date_naissance: formatDate(dateNaissance)!,
        nombre_petits: Number(formData.nombrePetits),
        poids_naissance: Number(averageWeight.toFixed(2)),
        observation: formData.observation || observation,
      });

      console.log('[AnimalNaissanceScreen] Created naissance locally:', createdNaissance.id);

      // Create animal records for each newborn if checkbox is checked
      if (formData.creerPetits) {
        await database.write(async () => {
          for (const newborn of newborns) {
            const animalCollection = database.get('animals');
            await animalCollection.create((animal: any) => {
              animal.numero_identification = newborn.numero_identification;
              animal.sexe = newborn.sexe;
              animal.statut = 'SAIN';
              animal.date_naissance = formatDate(dateNaissance);
              animal.poids = Number(newborn.poids);
              animal.farm_id = farmId;
              animal.espece_id = (selectedMother as any).espece_id;
              animal.categorie_id = (selectedMother as any).categorie_id;
              animal.lot_id = (selectedMother as any).lot_id;
              animal.mother_id = selectedMother.id;
              animal.nom = newborn.nom || `Petit ${newborn.numero_identification}`;
              animal.naissance_id = createdNaissance.id;
              animal.origine = 'naissance';
              animal.sync_status = 'pending';
              animal.version = 1;
              animal.created_at = Date.now();
              animal.updated_at = Date.now();
            });
            console.log('[AnimalNaissanceScreen] Created animal for newborn:', newborn.numero_identification);
          }
        });
      }

      navigation.goBack();
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        title="Déclarer une naissance"
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {submitError ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorBannerText}>{submitError}</AppText>
            </View>
          ) : null}

          <View style={styles.contextCard}>
            <AppText style={styles.contextTitle}>Femelle sélectionnée</AppText>
            <TouchableOpacity 
              onPress={() => motherPickerRef.current?.present()}
              activeOpacity={0.7}
              style={styles.input}
            >
              <AppText style={selectedMother ? styles.inputText : styles.inputPlaceholder}>
                {selectedMother?.nom || 'Sélectionner une femelle'}
              </AppText>
            </TouchableOpacity>
            {fieldErrors.mother_id ? <AppText style={styles.errorText}>{fieldErrors.mother_id}</AppText> : null}
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Date de naissance *</AppText>
            <AppDateTimePicker
              value={dateNaissance}
              onChange={setDateNaissance}
              placeholder="Sélectionner la date"
            />
            {fieldErrors.dateNaissance ? <AppText style={styles.errorText}>{fieldErrors.dateNaissance}</AppText> : null}
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Nombre de petits *</AppText>
            <AppTextInput
              style={styles.input}
              value={formData.nombrePetits}
              onChangeText={(text) => updateNewbornCount(Number(text || 1))}
              keyboardType="numeric"
              placeholder="Ex. 2"
            />
            {fieldErrors.nombrePetits ? <AppText style={styles.errorText}>{fieldErrors.nombrePetits}</AppText> : null}
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Observation</AppText>
            <AppTextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.observation}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, observation: text }))}
              placeholder="Détails éventuels"
              multiline
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Détails des petits</AppText>
            {newborns.map((newborn, index) => (
              <View key={newborn.id} style={styles.newbornCard}>
                <AppText style={styles.newbornTitle}>Petit {index + 1}</AppText>
                <AppTextInput
                  style={styles.input}
                  value={newborn.numero_identification}
                  onChangeText={(text) => updateNewborn(index, 'numero_identification', text)}
                  placeholder="Numéro d'identification *"
                />
                {fieldErrors[`newborn_${index}_numero_identification`] ? <AppText style={styles.errorText}>{fieldErrors[`newborn_${index}_numero_identification`]}</AppText> : null}
                <AppTextInput
                  style={styles.input}
                  value={newborn.nom}
                  onChangeText={(text) => updateNewborn(index, 'nom', text)}
                  placeholder="Nom (facultatif)"
                />
                <View style={styles.rowInputs}>
                  <View style={styles.halfField}>
                    <AppText style={styles.inlineLabel}>Sexe *</AppText>
                    <View style={styles.sexeContainer}>
                      <TouchableOpacity
                        style={[styles.sexeOption, newborn.sexe === 'male' && styles.sexeOptionSelected]}
                        onPress={() => updateNewborn(index, 'sexe', 'male')}
                      >
                        <AppText style={newborn.sexe === 'male' ? styles.sexeOptionTextSelected : styles.sexeOptionText}>M</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sexeOption, newborn.sexe === 'femelle' && styles.sexeOptionSelected]}
                        onPress={() => updateNewborn(index, 'sexe', 'femelle')}
                      >
                        <AppText style={newborn.sexe === 'femelle' ? styles.sexeOptionTextSelected : styles.sexeOptionText}>F</AppText>
                      </TouchableOpacity>
                    </View>
                    {fieldErrors[`newborn_${index}_sexe`] ? <AppText style={styles.errorText}>{fieldErrors[`newborn_${index}_sexe`]}</AppText> : null}
                  </View>
                  <View style={styles.halfField}>
                    <AppText style={styles.inlineLabel}>Poids (kg) *</AppText>
                    <AppTextInput
                      style={styles.input}
                      value={newborn.poids}
                      onChangeText={(text) => updateNewborn(index, 'poids', text)}
                      keyboardType="numeric"
                      placeholder="Ex. 32"
                    />
                    {fieldErrors[`newborn_${index}_poids`] ? <AppText style={styles.errorText}>{fieldErrors[`newborn_${index}_poids`]}</AppText> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setFormData((prev) => ({ ...prev, creerPetits: !prev.creerPetits }))}
          >
            <MaterialCommunityIcons name={formData.creerPetits ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color="#30A15E" />
            <AppText style={styles.checkboxText}>Créer automatiquement les petits enregistrés</AppText>
          </TouchableOpacity>

          <AppButton
            title="Enregistrer la naissance"
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AnimalPicker */}
      <AnimalPicker
        ref={motherPickerRef}
        animals={eligibleFemales}
        title="Sélectionner une femelle (gestation en cours)"
        onSelect={(animal) => setSelectedMother(animal)}
        selectedId={selectedMother?.id}
      />
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  contextCard: {
    backgroundColor: Theme.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Theme.textPrimary,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Theme.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputText: {
    fontSize: 16,
    color: Theme.textPrimary,
  },
  inputPlaceholder: {
    fontSize: 16,
    color: Theme.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Theme.textPrimary,
  },
  helperText: {
    color: Theme.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  newbornCard: {
    backgroundColor: Theme.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  newbornTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Theme.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  halfField: {
    flex: 1,
  },
  inlineLabel: {
    fontSize: 14,
    marginBottom: 6,
    color: Theme.textSecondary,
  },
  sexeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sexeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.inputBackground,
  },
  sexeOptionSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  sexeOptionText: {
    color: Theme.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  sexeOptionTextSelected: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  checkboxText: {
    marginLeft: 8,
    color: Theme.textPrimary,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F8BBD0',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 8,
  },
});

export default AnimalNaissanceScreen;

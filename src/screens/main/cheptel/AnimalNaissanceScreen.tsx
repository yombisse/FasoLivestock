import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppFarmPicker, { AppFarmPickerRef } from '../../../components/AppFarmPicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import mouvementService from '../../../services/mouvement.service';
import { authStorage } from '../../../storage/authStorage';
import { NaissanceRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { createNaissance } from '../../../database/repositories/naissanceRepository';

type AnimalNaissanceRouteProp = RouteProp<CheptelStackParamList, 'AnimalNaissance'>;
type AnimalNaissanceNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalNaissance'>;

interface NewbornDraft {
  id: number;
  nom: string;
  sexe: 'male' | 'femelle' | '';
  poids: string;
}

const createBlankNewborn = (id: number): NewbornDraft => ({
  id,
  nom: '',
  sexe: '',
  poids: '',
});

const AnimalNaissanceScreen = () => {
  const navigation = useNavigation<AnimalNaissanceNavigationProp>();
  const route = useRoute<AnimalNaissanceRouteProp>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [loadingFemales, setLoadingFemales] = useState<boolean>(false);
  const [females, setFemales] = useState<Animal[]>([]);
  const [selectedMother, setSelectedMother] = useState<Animal | null>(null);
  const [dateNaissance, setDateNaissance] = useState<Date | undefined>(undefined);
  const [dateSaillie, setDateSaillie] = useState<Date | undefined>(undefined);
  const [dateMiseBasPrevue, setDateMiseBasPrevue] = useState<Date | undefined>(undefined);
  const [newborns, setNewborns] = useState<NewbornDraft[]>([createBlankNewborn(1)]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const motherPickerRef = useRef<AppFarmPickerRef>(null);

  const [formData, setFormData] = useState({
    nombrePetits: '1',
    poidsNaissance: '',
    observation: '',
    creerPetits: true,
  });

  const formatDate = (value?: Date) => value ? value.toISOString().split('T')[0] : undefined;

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

  const loadFemellesEligibles = async () => {
    if (!farmId) return;
    try {
      setLoadingFemales(true);
      // Use local repository for offline-first pattern
      const { getLocalAnimals } = await import('../../../database/repositories/animalRepository');
      const data = await getLocalAnimals(farmId);
      const females = data.filter((a: any) => a.sexe === 'femelle' && a.statut === 'ACTIF');
      setFemales(females);
      if (route.params?.motherId) {
        const existing = females.find((female: Animal) => female.id === route.params?.motherId);
        if (existing) {
          setSelectedMother(existing);
        }
      }
    } catch (error: any) {
      console.error('Error loading females:', error);
      setFemales([]);
      setSelectedMother(null);
    } finally {
      setLoadingFemales(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  useEffect(() => {
    if (farmId) {
      loadFemellesEligibles();
    }
  }, [farmId]);

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

      // Create in local database (adds to sync queue)
      // UUID will be auto-generated by createLocalRecord via generateUUID()
      const createdNaissance = await createNaissance({
        farm_id: farmId,
        mother_id: selectedMother.id,
        date_naissance: formatDate(dateNaissance)!,
        nombre_petits: Number(formData.nombrePetits),
        poids_naissance: Number(averageWeight.toFixed(2)),
        observation: formData.observation || observation,
        date_saillie: formatDate(dateSaillie),
      });

      console.log('[AnimalNaissanceScreen] Created naissance locally:', createdNaissance.id);
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
        title="Déclarer une naissance"
        showBackButton
        onBackPress={() => navigation.goBack()}
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
              style={styles.selectButton}
              onPress={() => motherPickerRef.current?.present()}
              activeOpacity={0.8}
            >
              <View style={styles.selectButtonContent}>
                <AppText style={styles.selectButtonLabel}>
                  {selectedMother ? `${selectedMother.nom}${selectedMother.numero_identification ? ` • ${selectedMother.numero_identification}` : ''}` : 'Sélectionner une femelle éligible'}
                </AppText>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#30A15E" />
              </View>
            </TouchableOpacity>
            {fieldErrors.mother_id ? <AppText style={styles.errorText}>{fieldErrors.mother_id}</AppText> : null}
            {loadingFemales ? <AppText style={styles.helperText}>Chargement des femelles éligibles…</AppText> : null}
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
            <AppText style={styles.label}>Date de saillie</AppText>
            <AppDateTimePicker
              value={dateSaillie}
              onChange={setDateSaillie}
              placeholder="Sélectionner la date"
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Date de mise bas prévue</AppText>
            <AppDateTimePicker
              value={dateMiseBasPrevue}
              onChange={setDateMiseBasPrevue}
              placeholder="Sélectionner la date"
            />
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

      <AppFarmPicker
        ref={motherPickerRef}
        title="Femelles éligibles à une naissance"
        searchPlaceholder="Rechercher une femelle..."
        emptyMessage="Aucune femelle éligible. Enregistrez d'abord une gestation confirmée."
        items={females}
        loading={loadingFemales}
        getItemLabel={(item) => `${item.nom}${item.numero_identification ? ` • ${item.numero_identification}` : ''}`}
        onSelect={(female) => setSelectedMother(female)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  contextTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#212121',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
  },
  selectButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonLabel: {
    color: '#212121',
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212121',
  },
  helperText: {
    color: '#757575',
    fontSize: 12,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  newbornCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  newbornTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#212121',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  halfField: {
    flex: 1,
  },
  inlineLabel: {
    fontSize: 13,
    marginBottom: 6,
    color: '#616161',
  },
  sexeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sexeOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  sexeOptionSelected: {
    backgroundColor: '#30A15E',
    borderColor: '#30A15E',
  },
  sexeOptionText: {
    color: '#212121',
    fontSize: 14,
  },
  sexeOptionTextSelected: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  checkboxText: {
    marginLeft: 8,
    color: '#212121',
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

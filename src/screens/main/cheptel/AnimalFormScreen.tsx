import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppImagePicker from '../../../components/AppImagePicker';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppSelect from '../../../components/AppSelect';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../../../config/colors';
import { authStorage } from '../../../storage/authStorage';
import { farmStorage } from '../../../storage/farmStorage';
import { Animal, CreateAnimalRequest, UpdateAnimalRequest } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { createAnimal, updateAnimal, getLocalAnimalById, getLocalAnimalByNumeroIdentification } from '../../../database/repositories/animalRepository';
import { getLocalLots, Lot } from '../../../database/repositories/lotRepository';
import { useEspeces } from '../../../hooks/useEspeces';

type AnimalFormRouteProp = RouteProp<CheptelStackParamList, 'AnimalForm'>;
type AnimalFormNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalForm'>;

const AnimalFormScreen = () => {
  const navigation = useNavigation<AnimalFormNavigationProp>();
  const route = useRoute<AnimalFormRouteProp>();
  const { animalId } = route.params;

  const isEditMode = !!animalId;

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [photoUri, setPhotoUri] = useState<string>('');

  // Load especes from WatermelonDB using hook
  const { especes, loading: loadingEspeces } = useEspeces();
  const [dateNaissance, setDateNaissance] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<{
    nom: string;
    numero_identification: string;
    sexe: 'male' | 'femelle' | null;
    espece_id: string;
    lot_id: string;
    race: string;
    poids: string;
    date_naissance: string;
    photo: string;
    notes: string;
  }>({
    nom: '',
    numero_identification: '',
    sexe: null,
    espece_id: '',
    lot_id: '',
    race: '',
    poids: '',
    date_naissance: '',
    photo: '',
    notes: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Charger la ferme active
  const loadActiveFarm = async () => {
    try {
      console.log('[AnimalForm] Loading active farm from farmStorage');
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        console.log('[AnimalForm] Active farm loaded:', farm.id, farm.name);
        setFarmId(farm.id);
      } else {
        console.warn('[AnimalForm] No active farm found');
      }
    } catch (error) {
      console.error('[AnimalForm] Error loading active farm:', error);
    }
  };

  // Charger les lots depuis la base locale
  const loadLots = async () => {
    if (!farmId) return;
    try {
      const lotsData = await getLocalLots(farmId);
      setLots(lotsData);
    } catch (error: any) {
      console.error('Error loading lots:', error);
    }
  };

  // Charger l'animal en mode édition (lecture locale SQLite)
  const loadAnimal = async () => {
    if (!animalId) return;

    try {
      setLoading(true);
      const animal = await getLocalAnimalById(animalId);

      if (!animal) {
        setError('Animal non trouvé localement');
        return;
      }

      setFormData({
        nom: animal.nom,
        numero_identification: animal.numero_identification || '',
        sexe: animal.sexe,
        espece_id: animal.espece_id || '',
        lot_id: animal.lot_id || '',
        race: animal.race || '',
        poids: animal.poids ? String(animal.poids) : '',
        date_naissance: animal.date_naissance || '',
        photo: animal.photo || '',
        notes: '',
      });
      setPhotoUri(animal.photo || '');
      if (animal.date_naissance) {
        setDateNaissance(new Date(animal.date_naissance));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'animal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    if (isEditMode) {
      loadAnimal();
    }
  }, [animalId]);

  // Load lots when farmId is available
  useEffect(() => {
    if (farmId) {
      loadLots();
    }
  }, [farmId]);

  // Validation
  const validate = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};

    if (!formData.nom.trim()) {
      errors.nom = 'Le nom est requis';
    }

    if (!formData.sexe) {
      errors.sexe = 'Le sexe est requis';
    }

    if (!farmId) {
      errors.general = 'Aucune ferme active sélectionnée';
    }

    console.log('[AnimalForm] Validation check - nom:', formData.nom.trim(), 'sexe:', formData.sexe, 'farmId:', farmId);
    console.log('[AnimalForm] Validation errors so far:', errors);

    // Check for duplicate numero_identification only when creating a new animal
    if (!isEditMode && formData.numero_identification.trim() && farmId) {
      const existingAnimal = await getLocalAnimalByNumeroIdentification(farmId, formData.numero_identification.trim());
      if (existingAnimal) {
        errors.numero_identification = 'Ce numéro d\'identification existe déjà';
      }
    }

    setFieldErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('[AnimalForm] Final validation result:', isValid, 'errors:', errors);
    return isValid;
  };

  // Soumission
  const handleSubmit = async () => {
    console.log('[AnimalForm] handleSubmit called, isEditMode:', isEditMode);
    console.log('[AnimalForm] formData:', formData);
    console.log('[AnimalForm] farmId:', farmId);
    
    const isValid = await validate();
    console.log('[AnimalForm] Validation result:', isValid);
    if (!isValid) {
      console.log('[AnimalForm] Validation failed, fieldErrors:', fieldErrors);
      return;
    }
    if (!farmId) {
      console.log('[AnimalForm] No farmId, aborting');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFieldErrors({});
      console.log('[AnimalForm] Starting submission...');

      const payload: CreateAnimalRequest | UpdateAnimalRequest = {
        farm_id: farmId,
        nom: formData.nom.trim(),
        sexe: formData.sexe!,
      };
      console.log('[AnimalForm] Initial payload:', payload);

      if (formData.numero_identification.trim()) {
        payload.numero_identification = formData.numero_identification.trim();
      }
      if (formData.espece_id) {
        payload.espece_id = formData.espece_id;
      }
      if (formData.race.trim()) {
        payload.race = formData.race.trim();
      }
      if (formData.poids) {
        payload.poids = parseFloat(formData.poids);
      }
      if (formData.date_naissance.trim()) {
        payload.date_naissance = convertDateForAPI(formData.date_naissance.trim());
      }
      if (formData.photo.trim()) {
        payload.photo = formData.photo.trim();
      }

      // Set default status to SAIN for new animals
      if (!isEditMode) {
        (payload as CreateAnimalRequest).statut = 'SAIN';
      }

      if (isEditMode) {
        await updateAnimal(animalId, payload);
      } else {
        await createAnimal(payload);
      }

      if (isEditMode) {
        navigation.goBack();
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      if (err.message.includes(':')) {
        // Erreur de validation API
        const validationErrors: Record<string, string> = {};
        const lines = err.message.split('\n');
        lines.forEach((line: string) => {
          const [field, ...messageParts] = line.split(':');
          if (field && messageParts.length > 0) {
            validationErrors[field.trim()] = messageParts.join(':').trim();
          }
        });
        if (Object.keys(validationErrors).length > 0) {
          setFieldErrors(validationErrors);
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || 'Erreur lors de la soumission');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Conversion de format de date DD/MM/YYYY vers YYYY-MM-DD pour l'API
  const convertDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }
    return dateString;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title={isEditMode ? 'Modifier l\'animal' : 'Ajouter un animal'}
          showBackground={false}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          style={styles.header}
        />
        <View style={styles.loadingContainer}>
          <AppText color="#757575">Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={isEditMode ? 'Modifier l\'animal' : 'Ajouter un animal'}
        showBackground={false}
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
        titleStyle={styles.headerTitle}
      />

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
            <AppText style={styles.errorText} color="#D32F2F">
              {error}
            </AppText>
          </View>
        )}

        <View style={styles.form}>
          {/* Nom */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Nom *
            </AppText>
            <AppTextInput
              placeholder="Nom de l'animal"
              value={formData.nom}
              onChangeText={(text) => setFormData({ ...formData, nom: text })}
              error={fieldErrors.nom}
            />
          </View>

          {/* Numéro identification */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Numéro d'identification
            </AppText>
            <AppTextInput
              placeholder="Numéro d'identification"
              value={formData.numero_identification}
              onChangeText={(text) => setFormData({ ...formData, numero_identification: text })}
              error={fieldErrors.numero_identification}
            />
          </View>

          {/* Sexe */}
          <View style={styles.field}>
            <AppSelect
              label="Sexe *"
              placeholder="Sélectionner le sexe"
              value={formData.sexe ?? ''}
              options={[
                { label: 'Mâle', value: 'male' },
                { label: 'Femelle', value: 'femelle' },
              ]}
              onValueChange={(value) => setFormData({ ...formData, sexe: value as 'male' | 'femelle' })}
              error={fieldErrors.sexe}
            />
          </View>

          {/* Espèce */}
          <View style={styles.field}>
            <AppSelect
              label="Espèce"
              placeholder={loadingEspeces ? 'Chargement...' : 'Sélectionner une espèce'}
              value={formData.espece_id}
              options={especes.map((espece) => ({ label: espece.nom, value: espece.id }))}
              onValueChange={(value) => setFormData({ ...formData, espece_id: value })}
              error={fieldErrors.espece_id}
              disabled={loadingEspeces}
            />
          </View>

          {/* Race */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Race
            </AppText>
            <AppTextInput
              placeholder="Race"
              value={formData.race}
              onChangeText={(text) => setFormData({ ...formData, race: text })}
              error={fieldErrors.race}
            />
          </View>

          {/* Poids */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Poids (kg)
            </AppText>
            <AppTextInput
              placeholder="Poids en kg"
              value={formData.poids}
              onChangeText={(text) => setFormData({ ...formData, poids: text })}
              keyboardType="numeric"
              error={fieldErrors.poids}
            />
          </View>

          {/* Date de naissance */}
          <AppDateTimePicker
            label="Date de naissance"
            value={dateNaissance}
            onChange={(date, formatted) => {
              setDateNaissance(date);
              setFormData({ ...formData, date_naissance: formatted });
            }}
            mode="date"
            maximumDate={new Date()}
            placeholder="JJ/MM/AAAA"
            error={fieldErrors.date_naissance}
          />

          {/* Lot */}
          <View style={styles.field}>
            <AppSelect
              label="Lot"
              placeholder="Sélectionner un lot"
              value={formData.lot_id}
              options={lots.map((lot) => ({ label: lot.nom_lot, value: lot.id }))}
              onValueChange={(value) => setFormData({ ...formData, lot_id: value })}
              error={fieldErrors.lot_id}
            />
          </View>

          {/* Photo */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Photo
            </AppText>
            <View style={styles.imagePickerContainer}>
              <AppImagePicker
                onImageSelected={(uri, fileName, type) => {
                  setPhotoUri(uri);
                  setFormData({ ...formData, photo: uri });
                }}
                currentImageUri={photoUri}
                shape="square"
                size={140}
                placeholder="Photo de l'animal"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Notes
            </AppText>
            <AppTextInput
              placeholder="Notes additionnelles"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              error={fieldErrors.notes}
            />
          </View>

          {/* Bouton soumettre */}
          <AppButton
            title={submitting ? 'Enregistrement...' : isEditMode ? 'Modifier' : 'Enregistrer'}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: Theme.primary,
    height:100,
    paddingBottom:12
  },
  headerTitle:{
    alignSelf:'center'
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  imagePickerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 8,
  },
  fieldError: {
    marginTop: 4,
    fontSize: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  toggleTextActive: {
    color: '#fff',
  },
  chipsContainer: {
    marginBottom: 8,
  },
  chipsContent: {
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  chipText: {
    fontSize: 14,
    color: '#757575',
  },
  chipTextActive: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default AnimalFormScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import animalService from '../../../services/animal.service';
import especeService from '../../../services/espece.service';
import { authStorage } from '../../../storage/authStorage';
import { Animal, CreateAnimalRequest, UpdateAnimalRequest } from '../../../types/animal.types';
import { Espece } from '../../../types/espece.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalFormRouteProp = RouteProp<CheptelStackParamList, 'AnimalForm'>;
type AnimalFormNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalForm'>;

const STATUTS = ['ACTIF', 'VENDU', 'DÉCÉDÉ', 'TRANSFÉRÉ', 'ABATTU'];

const AnimalFormScreen = () => {
  const navigation = useNavigation<AnimalFormNavigationProp>();
  const route = useRoute<AnimalFormRouteProp>();
  const { animalId } = route.params;

  const isEditMode = !!animalId;

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [especes, setEspeces] = useState<Espece[]>([]);
  const [loadingEspeces, setLoadingEspeces] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    nom: string;
    numero_identification: string;
    sexe: 'male' | 'femelle' | null;
    espece_id: string;
    race: string;
    poids: string;
    date_naissance: string;
    statut: string;
    photo: string;
    notes: string;
  }>({
    nom: '',
    numero_identification: '',
    sexe: null,
    espece_id: '',
    race: '',
    poids: '',
    date_naissance: '',
    statut: 'ACTIF',
    photo: '',
    notes: '',
  });

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

  // Charger les espèces depuis l'API
  const loadEspeces = async () => {
    try {
      setLoadingEspeces(true);
      const especesData = await especeService.getEspeces();
      setEspeces(especesData);
    } catch (error: any) {
      console.error('Error loading especes:', error);
      setError('Erreur lors du chargement des espèces');
    } finally {
      setLoadingEspeces(false);
    }
  };

  // Charger l'animal en mode édition
  const loadAnimal = async () => {
    if (!animalId) return;

    try {
      setLoading(true);
      const animal = await animalService.getAnimal(animalId);
      setFormData({
        nom: animal.nom,
        numero_identification: animal.numero_identification || '',
        sexe: animal.sexe,
        espece_id: animal.espece_id || '',
        race: animal.race || '',
        poids: animal.poids ? String(animal.poids) : '',
        date_naissance: animal.date_naissance || '',
        statut: animal.statut || 'ACTIF',
        photo: animal.photo || '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'animal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadEspeces();
    if (isEditMode) {
      loadAnimal();
    }
  }, [animalId]);

  // Validation
  const validate = (): boolean => {
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

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumission
  const handleSubmit = async () => {
    if (!validate()) return;
    if (!farmId) return;

    try {
      setSubmitting(true);
      setError(null);
      setFieldErrors({});

      const payload: CreateAnimalRequest | UpdateAnimalRequest = {
        farm_id: farmId,
        nom: formData.nom.trim(),
        sexe: formData.sexe!,
      };

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
        payload.date_naissance = formData.date_naissance.trim();
      }
      if (formData.statut) {
        payload.statut = formData.statut;
      }
      if (formData.photo.trim()) {
        payload.photo = formData.photo.trim();
      }

      if (isEditMode) {
        await animalService.updateAnimal(animalId, payload);
      } else {
        await animalService.createAnimal(payload);
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

  // Sélection espèce
  const handleEspeceSelect = (especeId: string) => {
    setFormData({ ...formData, espece_id: especeId });
  };

  // Sélection statut
  const handleStatutSelect = (statut: string) => {
    setFormData({ ...formData, statut });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title={isEditMode ? 'Modifier l\'animal' : 'Ajouter un animal'}
          showBackground={true}
          showMenuButton={true}
          onMenuPress={() => (navigation as any).openDrawer()}
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
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
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
            <AppText style={styles.label} fontWeight="bold">
              Sexe *
            </AppText>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.sexe === 'male' && styles.toggleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, sexe: 'male' })}
              >
                <MaterialCommunityIcons
                  name="gender-male"
                  size={20}
                  color={formData.sexe === 'male' ? '#fff' : '#757575'}
                />
                <AppText
                  style={[styles.toggleText, formData.sexe === 'male' && styles.toggleTextActive]}
                >
                  Mâle
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.sexe === 'femelle' && styles.toggleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, sexe: 'femelle' })}
              >
                <MaterialCommunityIcons
                  name="gender-female"
                  size={20}
                  color={formData.sexe === 'femelle' ? '#fff' : '#757575'}
                />
                <AppText
                  style={[styles.toggleText, formData.sexe === 'femelle' && styles.toggleTextActive]}
                >
                  Femelle
                </AppText>
              </TouchableOpacity>
            </View>
            {fieldErrors.sexe && (
              <AppText style={styles.fieldError} color="#D32F2F" fontSize={12}>
                {fieldErrors.sexe}
              </AppText>
            )}
          </View>

          {/* Espèce */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Espèce
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
              contentContainerStyle={styles.chipsContent}
            >
              {loadingEspeces ? (
                <AppText color="#757575">Chargement des espèces...</AppText>
              ) : especes.length === 0 ? (
                <AppText color="#757575">Aucune espèce disponible</AppText>
              ) : (
                especes.map((espece) => (
                  <TouchableOpacity
                    key={espece.id}
                    style={[
                      styles.chip,
                      formData.espece_id === espece.id && styles.chipActive,
                    ]}
                    onPress={() => handleEspeceSelect(espece.id)}
                  >
                    <AppText
                      style={[styles.chipText, formData.espece_id === espece.id && styles.chipTextActive]}
                    >
                      {espece.nom}
                    </AppText>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Date de naissance
            </AppText>
            <AppTextInput
              placeholder="YYYY-MM-DD"
              value={formData.date_naissance}
              onChangeText={(text) => setFormData({ ...formData, date_naissance: text })}
              error={fieldErrors.date_naissance}
            />
          </View>

          {/* Statut */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              Statut
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
              contentContainerStyle={styles.chipsContent}
            >
              {STATUTS.map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.chip,
                    formData.statut === statut && styles.chipActive,
                  ]}
                  onPress={() => handleStatutSelect(statut)}
                >
                  <AppText
                    style={[styles.chipText, formData.statut === statut && styles.chipTextActive]}
                  >
                    {statut}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lot ID */}
          {/* TODO: Module Lots — ajouter un Picker lot_id via GET /lots?farm_id=... */}

          {/* Photo URL */}
          <View style={styles.field}>
            <AppText style={styles.label} fontWeight="bold">
              URL de la photo
            </AppText>
            <AppTextInput
              placeholder="URL de la photo"
              value={formData.photo}
              onChangeText={(text) => setFormData({ ...formData, photo: text })}
              error={fieldErrors.photo}
            />
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

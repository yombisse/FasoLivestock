import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppImagePicker from '../../../components/AppImagePicker';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppSelect from '../../../components/AppSelect';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import mouvementService from '../../../services/mouvement.service';
import especeService from '../../../services/espece.service';
import { authStorage } from '../../../storage/authStorage';
import { AchatRequest } from '../../../types/mouvement.types';
import { Espece } from '../../../types/espece.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalAchatNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalAchat'>;

const AnimalAchatScreen = () => {
  const navigation = useNavigation<AnimalAchatNavigationProp>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [especes, setEspeces] = useState<Espece[]>([]);
  const [loadingEspeces, setLoadingEspeces] = useState<boolean>(false);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [dateAchat, setDateAchat] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<{
    nom: string;
    espece_id: string;
    race: string;
    sexe: 'male' | 'femelle' | null;
    prix_achat: string;
    provenance: string;
    numero_identification: string;
    poids: string;
  }>({
    nom: '',
    espece_id: '',
    race: '',
    sexe: null,
    prix_achat: '',
    provenance: '',
    numero_identification: '',
    poids: '',
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
      setSubmitError(null);
      const especesData = await especeService.getEspeces();
      setEspeces(especesData);
    } catch (error: any) {
      console.error('Error loading especes:', error);
      setSubmitError(error.message || 'Erreur lors du chargement des espèces');
    } finally {
      setLoadingEspeces(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadEspeces();
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nom.trim()) errors.nom = 'Nom requis';
    if (!formData.espece_id) errors.espece_id = 'Espèce requise';
    if (!formData.sexe) errors.sexe = 'Sexe requis';
    if (!formData.prix_achat) errors.prix_achat = 'Prix requis';
    if (!formData.provenance.trim()) errors.provenance = 'Provenance requise';
    if (!dateAchat) errors.dateAchat = 'Date d\'achat requise';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!farmId) {
      setSubmitError('Aucune ferme active sélectionnée');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload: AchatRequest = {
        farm_id: farmId,
        nom: formData.nom.trim(),
        espece_id: formData.espece_id,
        race: formData.race || undefined,
        sexe: formData.sexe!,
        numero_identification: formData.numero_identification || undefined,
        poids: formData.poids ? parseFloat(formData.poids) : undefined,
        provenance: formData.provenance.trim(),
        prix_achat: parseFloat(formData.prix_achat),
        date_achat: dateAchat!.toISOString().split('T')[0],
      };

      // Use local repository for offline-first pattern
      const { createAnimal } = await import('../../../database/repositories/animalRepository');
      const animalData = {
        farm_id: farmId,
        nom: formData.nom.trim(),
        espece_id: formData.espece_id,
        race: formData.race || undefined,
        sexe: formData.sexe!,
        numero_identification: formData.numero_identification || undefined,
        poids: formData.poids ? parseFloat(formData.poids) : undefined,
        statut: 'ACTIF',
      };
      await createAnimal(animalData);
      
      navigation.goBack();
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de l\'achat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Acheter un animal"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {submitError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorBannerText}>{submitError}</AppText>
          </View>
        ) : null}

        {/* Nom */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Nom *</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Nom de l'animal"
            value={formData.nom}
            onChangeText={(text) => setFormData({ ...formData, nom: text })}
          />
          {fieldErrors.nom && <AppText style={styles.errorText}>{fieldErrors.nom}</AppText>}
        </View>

        {/* Espèce */}
        <View style={styles.fieldContainer}>
          <AppSelect
            label="Espèce *"
            placeholder={loadingEspeces ? 'Chargement...' : 'Sélectionner une espèce'}
            value={formData.espece_id}
            options={especes.map((espece) => ({ label: espece.nom, value: espece.id }))}
            onValueChange={(value) => setFormData({ ...formData, espece_id: value })}
            error={fieldErrors.espece_id}
            disabled={loadingEspeces}
          />
        </View>

        {/* Sexe */}
        <View style={styles.fieldContainer}>
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

        {/* Race */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Race</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Race de l'animal"
            value={formData.race}
            onChangeText={(text) => setFormData({ ...formData, race: text })}
          />
        </View>

        {/* Prix d'achat */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Prix d'achat (FCFA) *</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Prix d'achat"
            value={formData.prix_achat}
            onChangeText={(text) => setFormData({ ...formData, prix_achat: text })}
            keyboardType="numeric"
          />
          {fieldErrors.prix_achat && <AppText style={styles.errorText}>{fieldErrors.prix_achat}</AppText>}
        </View>

        {/* Date d'achat */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Date d'achat *</AppText>
          <AppDateTimePicker
            value={dateAchat}
            onChange={setDateAchat}
            placeholder="Sélectionner la date"
          />
          {fieldErrors.dateAchat && <AppText style={styles.errorText}>{fieldErrors.dateAchat}</AppText>}
        </View>

        {/* Provenance */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Provenance *</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Ex. marché, voisin, autre ferme"
            value={formData.provenance}
            onChangeText={(text) => setFormData({ ...formData, provenance: text })}
          />
          {fieldErrors.provenance && <AppText style={styles.errorText}>{fieldErrors.provenance}</AppText>}
        </View>

        {/* Numéro d'identification */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Numéro d'identification</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Numéro d'identification"
            value={formData.numero_identification}
            onChangeText={(text) => setFormData({ ...formData, numero_identification: text })}
          />
        </View>

        {/* Poids */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Poids (kg)</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Poids de l'animal"
            value={formData.poids}
            onChangeText={(text) => setFormData({ ...formData, poids: text })}
            keyboardType="numeric"
          />
        </View>

        {/* Photo */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Photo</AppText>
          <AppImagePicker onImageSelected={setPhotoUri} />
        </View>

        {/* Bouton submit */}
        <AppButton
          title="Enregistrer l'achat"
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
  sexeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sexeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  sexeOptionSelected: {
    backgroundColor: '#30A15E',
    borderColor: '#30A15E',
  },
  sexeOptionText: {
    color: '#212121',
  },
  sexeOptionTextSelected: {
    color: '#FFFFFF',
  },
  loadingText: {
    color: '#757575',
    fontStyle: 'italic',
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
    marginTop: 16,
  },
});

export default AnimalAchatScreen;

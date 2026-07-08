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
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import mouvementService from '../../../services/mouvement.service';
import animalService from '../../../services/animal.service';
import { DecesRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { createLocalRecord } from '../../../database/repositories/baseRepository';
import { updateAnimal } from '../../../database/repositories/animalRepository';
import { clearFarmCache } from '../../../database/repositories/cacheRepository';
import { authStorage } from '../../../storage/authStorage';
import { farmStorage } from '../../../storage/farmStorage';

type AnimalDecesRouteProp = RouteProp<CheptelStackParamList, 'AnimalDeces'>;
type AnimalDecesNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalDeces'>;

const AnimalDecesScreen = () => {
  const navigation = useNavigation<AnimalDecesNavigationProp>();
  const route = useRoute<AnimalDecesRouteProp>();
  const { animalId } = route.params;

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [animalContext, setAnimalContext] = useState<Animal | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [dateDeces, setDateDeces] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<{
    cause: string;
    notes: string;
  }>({
    cause: '',
    notes: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAnimalContext = async () => {
      try {
        setLoadingContext(true);
        const animal = await animalService.getAnimal(animalId);
        setAnimalContext(animal);
      } catch (error: any) {
        setSubmitError(error.message || 'Impossible de charger les détails de l’animal');
      } finally {
        setLoadingContext(false);
      }
    };

    loadAnimalContext();
  }, [animalId]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!dateDeces) errors.dateDeces = 'Date de décès requise';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        setSubmitError('Aucune ferme active sélectionnée');
        return;
      }

      const user = await authStorage.getUser();
      const userId = user?.id;

      const payload: DecesRequest = {
        date_deces: dateDeces!.toISOString().split('T')[0],
        cause: formData.cause || undefined,
      };

      // Create event record locally for offline-first pattern
      const { createLocalRecord } = await import('../../../database/repositories/baseRepository');
      const { getTypeEvenementIdByName } = await import('../../../database/repositories/typeEvenementRepository');
      
      // Get the deces type_evenement_id using the shared function
      const typeEvenementId = await getTypeEvenementIdByName('Décès');
      if (!typeEvenementId) {
        setSubmitError("Type d'événement Décès introuvable en local. Synchronisation requise.");
        return;
      }

      await createLocalRecord('evenements', {
        farm_id: farm.id,
        type_evenement_id: typeEvenementId,
        animal_id: animalId,
        date_evenement: dateDeces!.toISOString().split('T')[0],
        description: formData.cause || 'Décès',
        categorie: 'SANITAIRE',
        statut_avant: animalContext?.statut || 'ACTIF',
        statut_apres: 'MORT',
        sync_status: 'pending',
        last_modified_by: userId,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Update animal status locally (optimistic update)
      await updateAnimal(animalId, { statut: 'MORT' });

      // Invalidate cache for this farm to reflect updated animal status
      await clearFarmCache(farm.id);

      Alert.alert('Succès', 'Décès déclaré', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Déclarer le décès"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.contextCard}>
          <AppText style={styles.contextTitle}>Opération sur l’animal</AppText>
          {loadingContext ? (
            <AppText style={styles.contextValue}>Chargement du contexte…</AppText>
          ) : animalContext ? (
            <>
              <AppText style={styles.contextValue}>Nom : {animalContext.nom}</AppText>
              <AppText style={styles.contextValue}>ID : {animalContext.id}</AppText>
              {animalContext.numero_identification ? (
                <AppText style={styles.contextValue}>N° ident. : {animalContext.numero_identification}</AppText>
              ) : null}
            </>
          ) : (
            <AppText style={styles.contextValue}>Aucune information disponible</AppText>
          )}
        </View>

        {/* Date de décès */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Date de décès *</AppText>
          <AppDateTimePicker
            value={dateDeces}
            onChange={setDateDeces}
            placeholder="Sélectionner la date"
          />
          {fieldErrors.dateDeces && <AppText style={styles.errorText}>{fieldErrors.dateDeces}</AppText>}
        </View>

        {/* Cause */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Cause du décès</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Cause probable"
            value={formData.cause}
            onChangeText={(text) => setFormData({ ...formData, cause: text })}
          />
        </View>

        {submitError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorBannerText}>{submitError}</AppText>
          </View>
        ) : null}

        {/* Bouton submit */}
        <AppButton
          title="Déclarer le décès"
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
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#212121',
  },
  contextValue: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
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

export default AnimalDecesScreen;

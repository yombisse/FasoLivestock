import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
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
import { farmStorage } from '../../../storage/farmStorage';
import { AbattageRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalAbattageRouteProp = RouteProp<CheptelStackParamList, 'AnimalAbattage'>;
type AnimalAbattageNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalAbattage'>;

const AnimalAbattageScreen = () => {
  const navigation = useNavigation<AnimalAbattageNavigationProp>();
  const route = useRoute<AnimalAbattageRouteProp>();
  const { animalId } = route.params;

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [animalContext, setAnimalContext] = useState<Animal | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [dateAbattage, setDateAbattage] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<{
    poids: string;
    motif: string;
    notes: string;
  }>({
    poids: '',
    motif: '',
    notes: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAnimalContext = async () => {
      try {
        setLoadingContext(true);
        const farm = await farmStorage.getActiveFarm();
        if (!farm) {
          throw new Error('Aucune ferme active');
        }
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

    if (!dateAbattage) errors.dateAbattage = 'Date d\'abattage requise';

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
        throw new Error('Aucune ferme active');
      }

      const payload: AbattageRequest = {
        date_abattage: dateAbattage!.toISOString().split('T')[0],
        motif: formData.motif || undefined,
      };

      // Use local repository for offline-first pattern
      const { createLocalRecord } = await import('../../../database/repositories/baseRepository');
      const { getTypeEvenementIdByName } = await import('../../../database/repositories/typeEvenementRepository');
      
      // Get the abattage type_evenement_id using the shared function
      const typeEvenementId = await getTypeEvenementIdByName('Abattage');
      if (!typeEvenementId) {
        setSubmitError("Type d'événement Abattage introuvable en local. Synchronisation requise.");
        return;
      }

      await createLocalRecord('evenements', {
        farm_id: farm.id,
        animal_id: animalId,
        type_evenement_id: typeEvenementId,
        date_evenement: dateAbattage!.toISOString().split('T')[0],
        description: formData.motif || 'Abattage',
        categorie: 'SANITAIRE',
      });
      
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
        title="Enregistrer un abattage"
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

        {/* Date d'abattage */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Date d'abattage *</AppText>
          <AppDateTimePicker
            value={dateAbattage}
            onChange={setDateAbattage}
            placeholder="Sélectionner la date"
          />
          {fieldErrors.dateAbattage && <AppText style={styles.errorText}>{fieldErrors.dateAbattage}</AppText>}
        </View>

        {/* Raison */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Raison</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Raison de l'abattage"
            value={formData.motif}
            onChangeText={(text) => setFormData({ ...formData, motif: text })}
          />
        </View>

        {submitError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorBannerText}>{submitError}</AppText>
          </View>
        ) : null}

        {/* Bouton submit */}
        <AppButton
          title="Enregistrer l'abattage"
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

export default AnimalAbattageScreen;

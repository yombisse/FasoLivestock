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
import { getLocalTypeEvenements } from '../../../database/repositories/typeEvenementRepository';
import { VenteRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalVenteRouteProp = RouteProp<CheptelStackParamList, 'AnimalVente'>;
type AnimalVenteNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalVente'>;

const AnimalVenteScreen = () => {
  const navigation = useNavigation<AnimalVenteNavigationProp>();
  const route = useRoute<AnimalVenteRouteProp>();
  const { animalId } = route.params;

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [animalContext, setAnimalContext] = useState<Animal | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [dateVente, setDateVente] = useState<Date | undefined>(undefined);
  const [typeEvenements, setTypeEvenements] = useState<any[]>([]);

  const [formData, setFormData] = useState<{
    prix: string;
    acheteur: string;
    notes: string;
  }>({
    prix: '',
    acheteur: '',
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

    const loadTypeEvenements = async () => {
      try {
        const typeEvenementsData = await getLocalTypeEvenements();
        setTypeEvenements(typeEvenementsData);
      } catch (error) {
        console.error('Error loading type evenements:', error);
      }
    };

    loadTypeEvenements();
  }, [animalId]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.prix) errors.prix = 'Prix requis';
    if (!dateVente) errors.dateVente = 'Date de vente requise';

    // Check if animal is active
    if (animalContext && animalContext.statut !== 'ACTIF') {
      errors.animal = `Impossible de vendre cet animal (statut: ${animalContext.statut})`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      console.log('[AnimalVenteScreen] Starting vente submission');

      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }

      const payload: VenteRequest = {
        prix_vente: parseFloat(formData.prix),
        date_vente: dateVente!.toISOString().split('T')[0],
        acheteur: formData.acheteur || undefined,
      };

      // Use local repository for offline-first pattern
      const { createLocalRecord } = await import('../../../database/repositories/baseRepository');
      
      console.log('[AnimalVenteScreen] Getting type_evenement_id for Vente from loaded type evenements');
      // Get the vente type_evenement_id from loaded type evenements
      const venteTypeEvenement = typeEvenements.find(
        (type: any) => type.nom_type.toLowerCase() === 'vente'
      );
      const typeEvenementId = venteTypeEvenement?.id;
      console.log('[AnimalVenteScreen] type_evenement_id result:', typeEvenementId);
      
      if (!typeEvenementId) {
        console.log('[AnimalVenteScreen] type_evenement_id not found, showing error');
        setSubmitError("Type d'événement Vente introuvable en local. Synchronisation requise.");
        return;
      }

      await createLocalRecord('evenements', {
        farm_id: farm.id,
        animal_id: animalId,
        type_evenement_id: typeEvenementId,
        date_evenement: dateVente!.toISOString().split('T')[0],
        description: `Vente à ${formData.acheteur || 'acheteur inconnu'} pour ${formData.prix}`,
        categorie: 'MOUVEMENT',
      });

      // Update animal status locally
      const { updateAnimal } = await import('../../../database/repositories/animalRepository');
      await updateAnimal(animalId, { statut: 'VENDU' });
      
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
        title="Vendre l'animal"
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
              <AppText style={styles.contextValue}>Sexe : {animalContext.sexe === 'male' ? 'Mâle' : 'Femelle'}</AppText>
              <AppText style={styles.contextValue}>Statut : {animalContext.statut || 'ACTIF'}</AppText>
            </>
          ) : (
            <AppText style={styles.contextValue}>Aucune information disponible</AppText>
          )}
        </View>

        {/* Prix */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Prix de vente (FCFA) *</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Prix de vente"
            value={formData.prix}
            onChangeText={(text) => setFormData({ ...formData, prix: text })}
            keyboardType="numeric"
          />
          {fieldErrors.prix && <AppText style={styles.errorText}>{fieldErrors.prix}</AppText>}
        </View>

        {/* Date de vente */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Date de vente *</AppText>
          <AppDateTimePicker
            value={dateVente}
            onChange={setDateVente}
            placeholder="Sélectionner la date"
          />
          {fieldErrors.dateVente && <AppText style={styles.errorText}>{fieldErrors.dateVente}</AppText>}
        </View>

        {/* Acheteur */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Acheteur</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Nom de l'acheteur"
            value={formData.acheteur}
            onChangeText={(text) => setFormData({ ...formData, acheteur: text })}
          />
        </View>

        {submitError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorBannerText}>{submitError}</AppText>
          </View>
        ) : null}

        {/* Bouton submit */}
        <AppButton
          title="Enregistrer la vente"
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

export default AnimalVenteScreen;

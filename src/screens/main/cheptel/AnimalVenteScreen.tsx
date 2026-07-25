import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { farmStorage } from '../../../storage/farmStorage';
import { TypeEvenementIds } from '../../../constants/typeEvenements';
import { CategorieSystemeIds } from '../../../constants/categories';
import { VenteRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { getLocalAnimalById, filterAnimalsForMouvement } from '../../../database/repositories/animalRepository';
import { useAnimals } from '../../../hooks/useAnimals';
import { Theme } from '../../../config/colors';
import { validerMouvement } from '../../../utils/transactionValidation';

type AnimalVenteRouteProp = RouteProp<CheptelStackParamList, 'AnimalVente'>;
type AnimalVenteNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalVente'>;

const AnimalVenteScreen = () => {
  const navigation = useNavigation<AnimalVenteNavigationProp>();
  const route = useRoute<AnimalVenteRouteProp>();
  const { animalId } = route.params || {};
  const animalPickerRef = useRef<AnimalPickerRef>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [animalContext, setAnimalContext] = useState<Animal | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [dateVente, setDateVente] = useState<Date | undefined>(undefined);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  // Load animals from WatemelonDB
  const { animals, loading: loadingAnimals } = useAnimals(farmId || '');
  // Filtre d'éligibilité pour les mouvements de type VENTE
  const availableAnimals = filterAnimalsForMouvement(animals, 'vente');

  const [formData, setFormData] = useState<{
    prix: string;
    acheteur: string;
    notes: string;
    remarque: string;
  }>({
    prix: '',
    acheteur: '',
    notes: '',
    remarque: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadFarm = async () => {
      const farm = await farmStorage.getActiveFarm();
      setFarmId(farm?.id || null);
    };
    loadFarm();

    if (animalId) {
      const loadAnimalContext = async () => {
        try {
          setLoadingContext(true);
          const animal = await getLocalAnimalById(animalId);
          setAnimalContext(animal);
        } catch (error: any) {
          setSubmitError(error.message || "Impossible de charger les details de l'animal");
        } finally {
          setLoadingContext(false);
        }
      };
      loadAnimalContext();
    } else {
      setLoadingContext(false);
    }
  }, [animalId]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.prix) errors.prix = 'Prix requis';
    if (!dateVente) errors.dateVente = 'Date de vente requise';

    // Validation selon le mode
    const animalToValidate = animalId ? animalContext : selectedAnimal;
    if (!animalToValidate) {
      errors.animal = 'Animal requis';
    } else {
      // Only allow sale of alive and present animals (exclude MORT, VENDU, PERDU)
      const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
      if (excludedStatuses.includes(animalToValidate.statut || '')) {
        errors.animal = `Impossible de vendre cet animal (statut: ${animalToValidate.statut})`;
      }
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

      console.log('[AnimalVenteScreen] Loading active farm...');
      const farm = await farmStorage.getActiveFarm();
      console.log('[AnimalVenteScreen] Active farm from storage:', farm);
      if (!farm) {
        console.error('[AUDIT] Vente - No active farm');
        console.warn('[AnimalVenteScreen] No active farm found in storage');
        throw new Error('Aucune ferme active');
      }

      const animalToSell = animalId ? animalContext : selectedAnimal;
      const animalIdToUse = animalId || selectedAnimal?.id;

      if (!animalToSell || !animalIdToUse) {
        console.error('[AUDIT] Vente - No animal selected');
        throw new Error('Animal non sélectionné');
      }

      // Use constant type_evenement_id for vente
      const typeEvenementId = TypeEvenementIds.VENTE;
      console.log('[AnimalVenteScreen] type_evenement_id result:', typeEvenementId);

      // Validation backend pour éviter les rejets lors du sync
      const validation = validerMouvement({
        animal_id: animalIdToUse,
        type_evenement_id: typeEvenementId,
        date_evenement: dateVente!.toISOString().split('T')[0],
        description: `Vente à ${formData.acheteur || 'acheteur inconnu'} pour ${formData.prix}${formData.remarque ? ` - ${formData.remarque}` : ''}`,
        cout: 0,
        statut_avant: animalToSell.statut as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        statut_apres: 'VENDU',
      }, 'Vente');

      if (!validation.valide) {
        setSubmitError(validation.erreur || 'Erreur de validation');
        return;
      }

      // Use local repository for offline-first pattern
      const { createLocalRecord } = await import('../../../database/repositories/baseRepository');

      const createdEvent = await createLocalRecord('evenements', {
        farm_id: farm.id,
        animal_id: animalIdToUse,
        type_evenement_id: typeEvenementId,
        date_evenement: dateVente!.toISOString().split('T')[0],
        description: `Vente à ${formData.acheteur || 'acheteur inconnu'} pour ${formData.prix}${formData.remarque ? ` - ${formData.remarque}` : ''}`,
        categorie: 'MOUVEMENT',
        statut_avant: animalToSell.statut,
        statut_apres: 'VENDU',
      });
      
      console.log('[AUDIT] Vente - Evenement created:', {
        local_id: (createdEvent as any).id,
        farm_id: farm.id,
        animal_id: animalIdToUse,
        type_evenement_id: typeEvenementId,
        categorie: 'MOUVEMENT',
        statut_avant: animalToSell.statut,
        statut_apres: 'VENDU',
        _status: (createdEvent as any)._status,
        sync_status: (createdEvent as any).sync_status,
      });

      // Update animal status locally
      const { updateAnimal } = await import('../../../database/repositories/animalRepository');
      const updatedAnimal = await updateAnimal(animalIdToUse, { statut: 'VENDU' });
      
      console.log('[AUDIT] Vente - Animal status updated:', {
        animal_id: animalIdToUse,
        old_statut: animalToSell.statut,
        new_statut: 'VENDU',
        _status: (updatedAnimal as any)._status,
        sync_status: (updatedAnimal as any).sync_status,
      });

      // Create transaction for the sale using constant category ID
      const createdTransaction = await createLocalRecord('transactions', {
        farm_id: farm.id,
        type_transaction: 'ENTREE',
        montant: parseFloat(formData.prix),
        date_transaction: dateVente!.toISOString(),
        description: `Vente à ${formData.acheteur || 'acheteur inconnu'}${formData.remarque ? ` - ${formData.remarque}` : ''}`,
        tiers: formData.acheteur || '',
        animal_id: animalIdToUse,
        evenement_id: (createdEvent as any).id,
        categorie_id: CategorieSystemeIds.VENTE_ANIMAUX,
      });
      
      console.log('[AUDIT] Vente - Transaction created:', {
        local_id: (createdTransaction as any).id,
        farm_id: farm.id,
        type_transaction: 'ENTREE',
        montant: parseFloat(formData.prix),
        animal_id: animalIdToUse,
        evenement_id: (createdEvent as any).id,
        categorie_id: CategorieSystemeIds.VENTE_ANIMAUX,
        _status: (createdTransaction as any)._status,
        sync_status: (createdTransaction as any).sync_status,
      });

      navigation.goBack();
    } catch (err: any) {
      console.error('[AUDIT] Vente - Error:', err);
      setSubmitError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        title="Vendre l'animal"
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
        titleStyle={styles.headerTitle}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {submitError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorBannerText}>{submitError}</AppText>
          </View>
        ) : null}

        {/* Sélection animal (mode libre) */}
        {!animalId && (
          <View style={styles.contextCard}>
            <AppText style={styles.contextTitle}>Animal vendu *</AppText>
            <TouchableOpacity 
              onPress={() => animalPickerRef.current?.present()}
              activeOpacity={0.7}
              style={styles.input}
            >
              <AppText style={selectedAnimal ? styles.inputText : styles.inputPlaceholder}>
                {selectedAnimal?.nom || 'Sélectionner un animal'}
              </AppText>
            </TouchableOpacity>
            {fieldErrors.animal && <AppText style={styles.errorText}>{fieldErrors.animal}</AppText>}
          </View>
        )}

        {/* ContextCard (mode fiche animal) */}
        {animalId && (
          <View style={styles.contextCard}>
            <AppText style={styles.contextTitle}>Animal vendu</AppText>
            {loadingContext ? (
              <AppText style={styles.contextValue}>Chargement du contexte…</AppText>
            ) : animalContext ? (
              <>
                <AppText style={styles.contextName}>{animalContext.nom}</AppText>
                <AppText style={styles.contextMeta}>
                  {animalContext.numero_identification || 'Sans ID'} • {animalContext.statut}
                </AppText>
              </>
            ) : (
              <AppText style={styles.contextValue}>Aucune information disponible</AppText>
            )}
          </View>
        )}

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

        {/* Remarque */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Remarque</AppText>
          <AppTextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Détails optionnels"
            value={formData.remarque}
            onChangeText={(text) => setFormData({ ...formData, remarque: text })}
            multiline
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

      {/* AnimalPicker */}
      {!animalId && (
        <AnimalPicker
          ref={animalPickerRef}
          animals={availableAnimals}
          title="Sélectionner un animal"
          onSelect={(animal) => setSelectedAnimal(animal)}
          selectedId={selectedAnimal?.id}
        />
      )}
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
    height: 100,
    paddingBottom: 12,
  },
  headerTitle: {
    alignSelf: 'center',
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
  contextCard: {
    backgroundColor: Theme.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
  contextName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.textPrimary,
    marginBottom: 4,
  },
  contextMeta: {
    fontSize: 14,
    color: Theme.textSecondary,
  },
  contextValue: {
    fontSize: 14,
    color: Theme.textSecondary,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Theme.textPrimary,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
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

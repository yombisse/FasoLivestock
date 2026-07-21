import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppFarmPicker from '../../../components/AppFarmPicker';
import { farmStorage } from '../../../storage/farmStorage';
import { TransfertRequest } from '../../../types/mouvement.types';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { getLocalAnimalById } from '../../../database/repositories/animalRepository';

type AnimalTransfertRouteProp = RouteProp<CheptelStackParamList, 'AnimalTransfert'>;
type AnimalTransfertNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalTransfert'>;

const AnimalTransfertScreen = () => {
  const navigation = useNavigation<AnimalTransfertNavigationProp>();
  const route = useRoute<AnimalTransfertRouteProp>();
  const { animalId, typeEvenementId } = route.params;

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [animalContext, setAnimalContext] = useState<Animal | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [dateTransfert, setDateTransfert] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<{
    farm_destination_id: string;
    motif: string;
  }>({
    farm_destination_id: '',
    motif: '',
  });

  const [selectedFarmName, setSelectedFarmName] = useState<string>('');
  const farmPickerRef = useRef<any>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAnimalContext = async () => {
      try {
        setLoadingContext(true);
        const animal = await getLocalAnimalById(animalId);
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

    if (!formData.farm_destination_id) errors.farm_destination_id = 'Ferme de destination requise';
    if (!dateTransfert) errors.dateTransfert = 'Date de transfert requise';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!typeEvenementId) {
      console.error('[AUDIT] Transfert - No type evenement id');
      setSubmitError("Type d'événement non spécifié. Veuillez sélectionner depuis les actions de l'animal.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        console.error('[AUDIT] Transfert - No active farm');
        throw new Error('Aucune ferme active');
      }

      // Use local repository for offline-first pattern
      const { createLocalRecord } = await import('../../../database/repositories/baseRepository');

      await createLocalRecord('evenements', {
        farm_id: farm.id,
        animal_id: animalId,
        type_evenement_id: typeEvenementId,
        date_evenement: dateTransfert!.toISOString().split('T')[0],
        description: formData.motif || 'Transfert',
        categorie: 'MOUVEMENT',
      });
      
      navigation.goBack();
    } catch (err: any) {
      console.error('Transfer error:', err);
      const serverMessage = err?.message || '';
      if (typeof serverMessage === 'string' && serverMessage.includes('SQLSTATE')) {
        setSubmitError('Erreur serveur lors du transfert : statut animal non accepté. Contactez l\'administrateur.');
      } else if (err?.errors) {
        // API validation errors
        const messages = Object.entries(err.errors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        setSubmitError(messages || 'Erreur de validation');
      } else {
        setSubmitError(serverMessage || 'Erreur lors de l\'enregistrement');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Transférer l'animal"
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

        {/* Ferme de destination */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Ferme de destination *</AppText>
          <TouchableOpacity
            style={[styles.input, styles.pickerTouchable]}
            onPress={() => farmPickerRef.current?.present()}
            activeOpacity={0.8}
          >
            <AppText style={{ color: selectedFarmName ? '#212121' : '#BDBDBD' }}>
              {selectedFarmName || 'Sélectionner une ferme de destination'}
            </AppText>
          </TouchableOpacity>
          {fieldErrors.farm_destination_id && (
            <AppText style={styles.errorText}>{fieldErrors.farm_destination_id}</AppText>
          )}
        </View>

        {/* Date de transfert */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Date de transfert *</AppText>
          <AppDateTimePicker
            value={dateTransfert}
            onChange={setDateTransfert}
            placeholder="Sélectionner la date"
          />
          {fieldErrors.dateTransfert && <AppText style={styles.errorText}>{fieldErrors.dateTransfert}</AppText>}
        </View>

        {/* Motif */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Motif</AppText>
          <AppTextInput
            style={styles.input}
            placeholder="Motif du transfert"
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
          title="Enregistrer le transfert"
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitButton}
        />
      </ScrollView>
      <AppFarmPicker
        ref={farmPickerRef}
        selectedId={formData.farm_destination_id}
        onSelect={(farm) => {
          setFormData({ ...formData, farm_destination_id: farm.id });
          setSelectedFarmName(farm.name);
        }}
      />
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
  pickerTouchable: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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

export default AnimalTransfertScreen;

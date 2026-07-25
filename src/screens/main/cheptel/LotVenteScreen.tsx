import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppSelect, { AppSelectOption } from '../../../components/AppSelect';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { farmStorage } from '../../../storage/farmStorage';
import { getLocalLots } from '../../../database/repositories/lotRepository';
import { getAnimalsByLot } from '../../../database/repositories/animalRepository';
import { processVenteAnimal } from '../../../services/venteService';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import { Theme } from '../../../config/colors';

type LotVenteNavigationProp = StackNavigationProp<CheptelStackParamList, 'LotVente'>;

type PriceMode = 'per_head' | 'global';

const LotVenteScreen = () => {
  const navigation = useNavigation<LotVenteNavigationProp>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  // Lots state
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');

  const lotOptions = lots.map((lot: any) => ({
    label: lot.nom_lot,
    value: lot.id,
  }));

  // Animals in lot
  const [lotAnimals, setLotAnimals] = useState<Animal[]>([]);
  const [healthyAnimals, setHealthyAnimals] = useState<Animal[]>([]);

  // Form state
  const [priceMode, setPriceMode] = useState<PriceMode>('per_head');
  const [price, setPrice] = useState('');
  const [dateVente, setDateVente] = useState<Date | undefined>(undefined);
  const [acheteur, setAcheteur] = useState('');
  const [remarque, setRemarque] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const PRICE_MODE_OPTIONS: AppSelectOption[] = [
    { label: 'Par tête', value: 'per_head' },
    { label: 'Global', value: 'global' },
  ];

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);

        // Load lots for this farm
        const farmLots = await getLocalLots(farm.id);
        setLots(farmLots);
      } else {
        setSubmitError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setSubmitError('Erreur lors du chargement de la ferme active');
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  useEffect(() => {
    if (selectedLotId) {
      loadLotAnimals();
    } else {
      setLotAnimals([]);
      setHealthyAnimals([]);
    }
  }, [selectedLotId]);

  const loadLotAnimals = async () => {
    try {
      const animals = await getAnimalsByLot(selectedLotId);
      setLotAnimals(animals);
      const healthy = animals.filter(a => a.statut === 'SAIN');
      setHealthyAnimals(healthy);
    } catch (error) {
      console.error('Error loading lot animals:', error);
    }
  };

  const calculateTotalPrice = (): number => {
    const priceValue = parseFloat(price) || 0;
    if (priceMode === 'global') {
      return priceValue;
    } else {
      return priceValue * healthyAnimals.length;
    }
  };

  const calculatePricePerAnimal = (): number => {
    const priceValue = parseFloat(price) || 0;
    if (priceMode === 'per_head') {
      return priceValue;
    } else {
      return healthyAnimals.length > 0 ? priceValue / healthyAnimals.length : 0;
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedLotId) {
      errors.lot = 'Lot requis';
    }
    if (!price) {
      errors.price = 'Prix requis';
    }
    if (!dateVente) {
      errors.dateVente = 'Date de vente requise';
    }
    if (healthyAnimals.length === 0) {
      errors.animals = 'Aucun animal SAIN dans ce lot';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const prixParAnimal = calculatePricePerAnimal();

      console.log('[LotVenteScreen] Starting lot vente for', healthyAnimals.length, 'animals');

      const results = [];
      for (const animal of healthyAnimals) {
        try {
          const result = await processVenteAnimal({
            animal,
            farmId: farmId!,
            prix: prixParAnimal,
            dateVente: dateVente!,
            acheteur: acheteur || undefined,
            remarque: remarque || undefined,
          });
          results.push(result);
        } catch (error: any) {
          console.error('[LotVenteScreen] Error processing animal:', animal.id, error);
          throw error;
        }
      }

      const totalPrice = calculateTotalPrice();

      Alert.alert(
        'Succès',
        `${healthyAnimals.length} animal(s) vendu(s) pour un total de ${totalPrice.toLocaleString()} FCFA`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[LotVenteScreen] Error during lot vente:', error);
      setSubmitError(error.message || 'Impossible de vendre le lot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Vente en lot" showBackButton />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {submitError && (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>{submitError}</AppText>
          </View>
        )}

        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Lot *</AppText>
            <AppSelect
              options={lotOptions}
              selectedValue={selectedLotId}
              onSelect={setSelectedLotId}
              placeholder="Sélectionner un lot"
            />
            {fieldErrors.lot && <AppText style={styles.errorText}>{fieldErrors.lot}</AppText>}
          </View>

          {selectedLotId && (
            <View style={styles.infoCard}>
              <AppText style={styles.infoTitle}>Animaux dans le lot</AppText>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>Total:</AppText>
                <AppText style={styles.infoValue}>{lotAnimals.length}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>SAIN (vendables):</AppText>
                <AppText style={[styles.infoValue, styles.infoValueHighlight]}>{healthyAnimals.length}</AppText>
              </View>
            </View>
          )}

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Mode de prix *</AppText>
            <AppSelect
              options={PRICE_MODE_OPTIONS}
              selectedValue={priceMode}
              onSelect={(value) => setPriceMode(value as PriceMode)}
              placeholder="Sélectionner le mode"
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>
              Prix {priceMode === 'per_head' ? 'par tête' : 'global'} (FCFA) *
            </AppText>
            <AppTextInput
              value={price}
              onChangeText={setPrice}
              placeholder={priceMode === 'per_head' ? 'Ex: 150000' : 'Ex: 750000'}
              keyboardType="numeric"
            />
            {fieldErrors.price && <AppText style={styles.errorText}>{fieldErrors.price}</AppText>}
          </View>

          {selectedLotId && healthyAnimals.length > 0 && price && (
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryTitle}>Résumé</AppText>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>Prix par animal:</AppText>
                <AppText style={styles.summaryValue}>
                  {calculatePricePerAnimal().toLocaleString()} FCFA
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>Prix total:</AppText>
                <AppText style={[styles.summaryValue, styles.summaryValueHighlight]}>
                  {calculateTotalPrice().toLocaleString()} FCFA
                </AppText>
              </View>
            </View>
          )}

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Date de vente *</AppText>
            <AppDateTimePicker
              value={dateVente}
              onChange={setDateVente}
              placeholder="Sélectionner la date"
            />
            {fieldErrors.dateVente && <AppText style={styles.errorText}>{fieldErrors.dateVente}</AppText>}
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Acheteur</AppText>
            <AppTextInput
              value={acheteur}
              onChangeText={setAcheteur}
              placeholder="Nom de l'acheteur"
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Remarque</AppText>
            <AppTextInput
              value={remarque}
              onChangeText={setRemarque}
              placeholder="Détails optionnels"
              multiline
              style={styles.multilineInput}
            />
          </View>

          {fieldErrors.animals && (
            <View style={styles.errorContainer}>
              <AppText style={styles.errorText}>{fieldErrors.animals}</AppText>
            </View>
          )}

          <AppButton
            title="Vendre le lot"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!farmId || healthyAnimals.length === 0}
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
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  infoValueHighlight: {
    color: '#0369a1',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  summaryValueHighlight: {
    color: '#15803d',
    fontWeight: '600',
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default LotVenteScreen;

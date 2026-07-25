import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTextInput from '../../../components/AppTextInput';
import AppSelect, { AppSelectOption } from '../../../components/AppSelect';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { createLot } from '../../../database/repositories/lotRepository';
import { useEspeces } from '../../../hooks/useEspeces';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type LotCreateNavigationProp = StackNavigationProp<CheptelStackParamList, 'LotCreate'>;

const LotCreateScreen = () => {
  const navigation = useNavigation<LotCreateNavigationProp>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  // WatermelonDB hooks
  const { especes, loading: loadingEspeces } = useEspeces();

  const especeOptions = especes.map((e: any) => ({
    label: e.nom,
    value: e.id,
  }));

  const [formData, setFormData] = useState<{
    nom_lot: string;
    description: string;
    espece_id: string;
    nombre: string;
  }>({
    nom_lot: '',
    description: '',
    espece_id: '',
    nombre: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
      } else {
        setSubmitError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setSubmitError('Impossible de charger la ferme active');
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nom_lot.trim()) {
      errors.nom_lot = 'Nom du lot requis';
    }

    if (formData.nombre && isNaN(Number(formData.nombre))) {
      errors.nombre = 'Nombre doit être un chiffre valide';
    }

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

      const user = await authStorage.getUser();
      const userId = user?.id;

      const lotData = {
        farm_id: farmId,
        nom_lot: formData.nom_lot.trim(),
        description: formData.description.trim() || undefined,
        espece_id: formData.espece_id || undefined,
        nombre: formData.nombre ? Number(formData.nombre) : 0,
        last_modified_by: userId,
      };

      await createLot(lotData);

      Alert.alert('Succès', 'Lot créé avec succès', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('[LotCreateScreen] Error creating lot:', error);
      setSubmitError(error.message || 'Impossible de créer le lot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Créer un lot" showBackButton />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {submitError && (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>{submitError}</AppText>
          </View>
        )}

        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Nom du lot *</AppText>
            <AppTextInput
              value={formData.nom_lot}
              onChangeText={(text) => setFormData({ ...formData, nom_lot: text })}
              placeholder="Ex: Lot de bovins 2024"
              error={fieldErrors.nom_lot}
            />
            {fieldErrors.nom_lot && (
              <AppText style={styles.fieldErrorText}>{fieldErrors.nom_lot}</AppText>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Description</AppText>
            <AppTextInput
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Description du lot (optionnel)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Espèce (optionnel)</AppText>
            <AppSelect
              options={especeOptions}
              selectedValue={formData.espece_id}
              onSelect={(value) => setFormData({ ...formData, espece_id: value })}
              placeholder="Sélectionner une espèce"
            />
          </View>

          <View style={styles.fieldContainer}>
            <AppText style={styles.label}>Nombre d'animaux (optionnel)</AppText>
            <AppTextInput
              value={formData.nombre}
              onChangeText={(text) => setFormData({ ...formData, nombre: text })}
              placeholder="0"
              keyboardType="numeric"
              error={fieldErrors.nombre}
            />
            {fieldErrors.nombre && (
              <AppText style={styles.fieldErrorText}>{fieldErrors.nombre}</AppText>
            )}
          </View>

          <AppButton
            title="Créer le lot"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!farmId || loadingEspeces}
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
  fieldErrorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
  },
});

export default LotCreateScreen;

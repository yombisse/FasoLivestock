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
import AppSelect, { AppSelectOption } from '../../../components/AppSelect';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import { Transaction, TransactionType, CreateTransactionData } from '../../../types/transaction.types';
import { getLocalAnimalById, updateAnimal } from '../../../database/repositories/animalRepository';
import { createTransaction } from '../../../database/repositories/transactionRepository';
import { createLocalRecord } from '../../../database/repositories/baseRepository';
import { clearFarmCache } from '../../../database/repositories/cacheRepository';
import transactionService from '../../../services/transaction.service';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type AnimalVenteRouteProp = RouteProp<any, 'AnimalVente'>;
type AnimalVenteNavigationProp = StackNavigationProp<any, 'AnimalVente'>;

const AnimalVenteScreen = () => {
  const navigation = useNavigation<AnimalVenteNavigationProp>();
  const route = useRoute<AnimalVenteRouteProp>();
  const { animalId } = route.params || {};

  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  const [montant, setMontant] = useState('');
  const [dateTransaction, setDateTransaction] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [tiers, setTiers] = useState('');

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
      } else {
        setError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setError('Erreur lors du chargement de la ferme active');
    }
  };

  const loadAnimal = async () => {
    if (!animalId) return;

    try {
      setLoading(true);
      const data = await getLocalAnimalById(animalId);
      if (data) {
        setAnimal(data);
        // Pre-fill description with animal info
        setDescription(`Vente de ${data.nom || 'animal'} (${data.espece?.nom || 'espèce inconnue'})`);
      } else {
        setError('Animal non trouvé');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'animal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  useEffect(() => {
    if (animalId) {
      loadAnimal();
    }
  }, [animalId]);

  const handleSubmit = async () => {
    if (!farmId || !animalId) {
      Alert.alert('Erreur', 'Informations manquantes');
      return;
    }

    if (!montant || !dateTransaction) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Check if animal is active
    if (animal && animal.statut !== 'ACTIF') {
      Alert.alert('Erreur', `Impossible de vendre cet animal (statut: ${animal.statut})`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const user = await authStorage.getUser();
      const userId = user?.id;

      const transactionData: CreateTransactionData = {
        farm_id: farmId,
        type_transaction: 'ENTREE',
        montant: parseFloat(montant),
        date_transaction: dateTransaction.toISOString(),
        animal_id: animalId,
        description: description || `Vente de ${animal?.nom || 'animal'}`,
        tiers: tiers || undefined,
        user_id: userId,
      };

      // Create locally - sync will handle server push via syncService
      await createTransaction(transactionData);

      // Get the vente type_evenement_id using the shared function
      const { getTypeEvenementIdByName } = await import('../../../database/repositories/typeEvenementRepository');
      const typeEvenementId = await getTypeEvenementIdByName('Vente');
      if (!typeEvenementId) {
        setError("Type d'événement Vente introuvable en local. Synchronisation requise.");
        return;
      }

      // Create vente event locally (for consistency with backend EvenementMouvementService)
      await createLocalRecord('evenements', {
        farm_id: farmId,
        type_evenement_id: typeEvenementId,
        animal_id: animalId,
        date_evenement: dateTransaction.toISOString().split('T')[0],
        description: description || `Vente de ${animal?.nom || 'animal'}`,
        categorie: 'MOUVEMENT',
        statut_avant: animal?.statut || 'ACTIF',
        statut_apres: 'VENDU',
        sync_status: 'pending',
        last_modified_by: userId,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Update animal status locally (optimistic update)
      await updateAnimal(animalId, { statut: 'VENDU' });

      // Invalidate cache for this farm to reflect updated animal status and transaction
      await clearFarmCache(farmId);

      Alert.alert('Succès', 'Transaction enregistrée', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la transaction');
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Vente d'animal" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <AppText color="#757575">Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Vente d'animal" showBackButton={true} />
      <ScrollView style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}

        {/* Animal Info Card */}
        {animal && (
          <View style={styles.animalCard}>
            <View style={styles.animalHeader}>
              <View style={styles.animalIcon}>
                <MaterialCommunityIcons
                  name={animal.sexe === 'male' ? 'gender-male' : 'gender-female'}
                  size={24}
                  color={animal.sexe === 'male' ? '#2196F3' : '#E91E63'}
                />
              </View>
              <View style={styles.animalInfo}>
                <AppText style={styles.animalName} fontWeight="bold">{animal.nom || 'Sans nom'}</AppText>
                <AppText style={styles.animalDetails} color="#757575" fontSize={12}>
                  {animal.espece?.nom || 'Espèce inconnue'} • {animal.race || 'Race non définie'}
                </AppText>
                <AppText style={styles.animalId} color="#9E9E9E" fontSize={11}>
                  {animal.numero_identification || 'N° ID non défini'}
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* Transaction Form */}
        <View style={styles.formSection}>
          <AppText style={styles.sectionTitle} fontWeight="bold">Informations de vente</AppText>

          <AppText style={styles.label}>Montant (FCFA) *</AppText>
          <AppTextInput
            value={montant}
            onChangeText={setMontant}
            placeholder="Ex: 150000"
            keyboardType="numeric"
          />

          <AppText style={styles.label}>Date de transaction *</AppText>
          <AppDateTimePicker
            value={dateTransaction}
            onChange={setDateTransaction}
            mode="date"
          />

          <AppText style={styles.label}>Acheteur (optionnel)</AppText>
          <AppTextInput
            value={tiers}
            onChangeText={setTiers}
            placeholder="Nom de l'acheteur"
          />

          <AppText style={styles.label}>Description</AppText>
          <AppTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description de la vente"
            multiline
            numberOfLines={3}
          />
        </View>

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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  animalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  animalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 2,
  },
  animalDetails: {
    marginBottom: 2,
  },
  animalId: {
    fontSize: 11,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginTop: 12,
    marginBottom: 6,
  },
  submitButton: {
    marginTop: 8,
  },
});

export default AnimalVenteScreen;

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
import { createTransaction } from '../../../database/repositories/transactionRepository';
import { createAnimal } from '../../../database/repositories/animalRepository';
import { createLocalRecord } from '../../../database/repositories/baseRepository';
import { getTypeEvenementIdByName, getLocalTypeEvenements } from '../../../database/repositories/typeEvenementRepository';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import { getLocalEspeces } from '../../../database/repositories/especeRepository';
import transactionService from '../../../services/transaction.service';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type AnimalAchatRouteProp = RouteProp<any, 'AnimalAchat'>;
type AnimalAchatNavigationProp = StackNavigationProp<any, 'AnimalAchat'>;

const AnimalAchatScreen = () => {
  const navigation = useNavigation<AnimalAchatNavigationProp>();
  const route = useRoute<AnimalAchatRouteProp>();
  
  // Get categorieId from route params (passed from TransactionListScreen)
  const categorieId = route.params?.categorieId;

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [especes, setEspeces] = useState<AppSelectOption[]>([]);
  const [typeEvenements, setTypeEvenements] = useState<any[]>([]);

  const [montant, setMontant] = useState('');
  const [dateTransaction, setDateTransaction] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [tiers, setTiers] = useState('');
  const [animalNumero, setAnimalNumero] = useState('');
  const [animalNom, setAnimalNom] = useState('');
  const [animalEspeceId, setAnimalEspeceId] = useState('');
  const [animalRace, setAnimalRace] = useState('');
  const [animalSexe, setAnimalSexe] = useState<'MALE' | 'FEMELLE'>('MALE');
  const [animalPoids, setAnimalPoids] = useState('');

  const SEXE_OPTIONS: AppSelectOption[] = [
    { label: 'Mâle', value: 'MALE' },
    { label: 'Femelle', value: 'FEMELLE' },
  ];

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
        // Load expense categories if categorieId not provided
        if (!categorieId) {
          const localCategories = await getLocalCategories();
          const expenseCategories = localCategories.filter((cat: any) => cat.type === 'DEPENSE');
          if (expenseCategories.length > 0) {
            console.log('[AnimalAchatScreen] Using first expense category as fallback');
          }
        }
      } else {
        setError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
      setError('Erreur lors du chargement de la ferme active');
    }
  };

  const loadEspeces = async () => {
    try {
      const especesData = await getLocalEspeces();
      const options = especesData.map((e: any) => ({
        label: e.nom,
        value: e.id,
      }));
      setEspeces(options);
    } catch (error) {
      console.error('Error loading especes:', error);
    }
  };

  const loadTypeEvenements = async () => {
    try {
      const typeEvenementsData = await getLocalTypeEvenements();
      setTypeEvenements(typeEvenementsData);
    } catch (error) {
      console.error('Error loading type evenements:', error);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadEspeces();
    loadTypeEvenements();
  }, []);

  const handleSubmit = async () => {
    if (!farmId) {
      Alert.alert('Erreur', 'Aucune ferme active sélectionnée');
      return;
    }

    if (!categorieId) {
      Alert.alert('Erreur', 'Catégorie non spécifiée. Veuillez sélectionner une catégorie depuis la liste des transactions.');
      return;
    }

    if (!montant || !dateTransaction || !animalNumero || !animalEspeceId) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (numéro, espèce, montant, date)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('[AnimalAchatScreen] Starting achat submission');

      const user = await authStorage.getUser();
      const userId = user?.id;

      // Step 1: Create the Animal with statut ACTIF
      const newAnimal = await createAnimal({
        farm_id: farmId,
        nom: animalNom || undefined,
        numero_identification: animalNumero,
        espece_id: animalEspeceId,
        race: animalRace || undefined,
        sexe: animalSexe,
        poids: animalPoids ? parseFloat(animalPoids) : undefined,
        statut: 'ACTIF',
      });
      console.log('[AnimalAchatScreen] Created animal with ID:', newAnimal.id, 'numero:', animalNumero);

      // Step 2: Get type_evenement_id for 'Achat' from loaded type evenements
      const achatTypeEvenement = typeEvenements.find(
        (type: any) => type.nom_type.toLowerCase() === 'achat'
      );
      const typeEvenementId = achatTypeEvenement?.id;
      if (!typeEvenementId) {
        Alert.alert('Erreur', 'Type d\'événement Achat introuvable. Veuillez synchroniser.');
        return;
      }

      // Step 3: Create the Evenement associated with the animal
      await createLocalRecord('evenements', {
        farm_id: farmId,
        animal_id: newAnimal.id,
        type_evenement_id: typeEvenementId,
        date_evenement: dateTransaction.toISOString().split('T')[0],
        description: description || `Achat de ${animalNumero}`,
        categorie: 'MOUVEMENT',
      });
      console.log('[AnimalAchatScreen] Created evenement for animal');

      // Step 4: Create the Transaction with the categorieId passed from TransactionListScreen
      const transactionData: CreateTransactionData = {
        farm_id: farmId,
        type_transaction: 'SORTIE',
        montant: parseFloat(montant),
        date_transaction: dateTransaction.toISOString(),
        description: description || `Achat de ${animalNumero}`,
        tiers: tiers || undefined,
        user_id: userId,
        animal_id: newAnimal.id,
        categorie_id: categorieId,
      };

      const transaction = await createTransaction(transactionData);
      console.log('[AnimalAchatScreen] Created transaction with ID:', transaction.id);

      Alert.alert('Succès', 'Animal et transaction enregistrés', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      console.error('[AnimalAchatScreen] Error:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Achat d'animal" showBackButton={true} />
      <ScrollView style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}

        {/* Animal Info Card */}
        <View style={styles.animalCard}>
          <View style={styles.animalHeader}>
            <View style={styles.animalIcon}>
              <MaterialCommunityIcons
                name="cow"
                size={24}
                color="#2E7D32"
              />
            </View>
            <View style={styles.animalInfo}>
              <AppText style={styles.animalName} fontWeight="bold">Nouvel animal</AppText>
              <AppText style={styles.animalDetails} color="#757575" fontSize={12}>
                Enregistrement des informations de l'animal acheté
              </AppText>
            </View>
          </View>
        </View>

        {/* Animal Form */}
        <View style={styles.formSection}>
          <AppText style={styles.sectionTitle} fontWeight="bold">Informations de l'animal</AppText>

          <AppText style={styles.label}>Numéro d'identification *</AppText>
          <AppTextInput
            value={animalNumero}
            onChangeText={setAnimalNumero}
            placeholder="Ex: B001"
          />

          <AppText style={styles.label}>Nom (optionnel)</AppText>
          <AppTextInput
            value={animalNom}
            onChangeText={setAnimalNom}
            placeholder="Ex: Bovin-001"
          />

          <AppText style={styles.label}>Espèce *</AppText>
          <AppSelect
            value={animalEspeceId}
            onValueChange={setAnimalEspeceId}
            options={especes}
            placeholder="Sélectionner l'espèce"
          />

          <AppText style={styles.label}>Race</AppText>
          <AppTextInput
            value={animalRace}
            onChangeText={setAnimalRace}
            placeholder="Ex: Zébu"
          />

          <AppText style={styles.label}>Sexe *</AppText>
          <AppSelect
            value={animalSexe}
            onValueChange={(value) => setAnimalSexe(value as 'male' | 'femelle')}
            options={SEXE_OPTIONS}
            placeholder="Sélectionner le sexe"
          />

          <AppText style={styles.label}>Poids (kg)</AppText>
          <AppTextInput
            value={animalPoids}
            onChangeText={setAnimalPoids}
            placeholder="Ex: 250"
            keyboardType="numeric"
          />
        </View>

        {/* Transaction Form */}
        <View style={styles.formSection}>
          <AppText style={styles.sectionTitle} fontWeight="bold">Informations d'achat</AppText>

          <AppText style={styles.label}>Montant (FCFA) *</AppText>
          <AppTextInput
            value={montant}
            onChangeText={setMontant}
            placeholder="Ex: 150000"
            keyboardType="numeric"
          />

          <AppText style={styles.label}>Date d'achat *</AppText>
          <AppDateTimePicker
            value={dateTransaction}
            onChange={setDateTransaction}
            mode="date"
          />

          <AppText style={styles.label}>Provenance</AppText>
          <AppTextInput
            value={tiers}
            onChangeText={setTiers}
            placeholder="provenace"
          />

          <AppText style={styles.label}>Description</AppText>
          <AppTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description de l'achat"
            multiline
            numberOfLines={3}
          />
        </View>

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
    backgroundColor: '#E8F5E9',
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

export default AnimalAchatScreen;

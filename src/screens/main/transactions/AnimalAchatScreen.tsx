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
import database from '../../../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { useEspeces } from '../../../hooks/useEspeces';
import { useTypeEvenements } from '../../../hooks/useTypeEvenements';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { CategorieSystemeIds } from '../../../constants/categories';
import { TypeEvenementIds } from '../../../constants/typeEvenements';
import { createAnimal } from '../../../database/repositories/animalRepository';
import { createEvenement } from '../../../database/repositories/evenementRepository';
import { createTransaction } from '../../../database/repositories/transactionRepository';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type AnimalAchatRouteProp = RouteProp<any, 'AnimalAchat'>;
type AnimalAchatNavigationProp = StackNavigationProp<any, 'AnimalAchat'>;

const AnimalAchatScreen = () => {
  const navigation = useNavigation<AnimalAchatNavigationProp>();
  const route = useRoute<AnimalAchatRouteProp>();
  
  // Use constant category ID for "Achat d'animaux"
  const categorieId = CategorieSystemeIds.ACHAT_ANIMAUX;

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  // WatermelonDB hooks
  const { especes, loading: loadingEspeces } = useEspeces();
  const { typeEvenements, loading: loadingTypes } = useTypeEvenements();

  const especeOptions = especes.map((e: any) => ({
    label: e.nom,
    value: e.id,
  }));

  const [montant, setMontant] = useState('');
  const [dateTransaction, setDateTransaction] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [tiers, setTiers] = useState('');
  const [animalNumero, setAnimalNumero] = useState('');
  const [animalNom, setAnimalNom] = useState('');
  const [animalEspeceId, setAnimalEspeceId] = useState('');
  const [animalRace, setAnimalRace] = useState('');
  const [animalSexe, setAnimalSexe] = useState<'male' | 'femelle'>('male');
  const [animalPoids, setAnimalPoids] = useState('');

  const SEXE_OPTIONS: AppSelectOption[] = [
    { label: 'Mâle', value: 'male' },
    { label: 'Femelle', value: 'femelle' },
  ];

  const loadActiveFarm = async () => {
    try {
      console.log('[AnimalAchatScreen] Loading active farm...');
      const farm = await farmStorage.getActiveFarm();
      console.log('[AnimalAchatScreen] Active farm from storage:', farm);
      if (farm) {
        setFarmId(farm.id);
        console.log('[AnimalAchatScreen] Farm ID set:', farm.id);
      } else {
        console.warn('[AnimalAchatScreen] No active farm found in storage');
        setError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('[AnimalAchatScreen] Error loading active farm:', error);
      setError('Erreur lors du chargement de la ferme active');
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  const handleSubmit = async () => {
    if (!farmId) {
      console.error('[AnimalAchatScreen] No active farm selected');
      setError('Aucune ferme active sélectionnée');
      return;
    }

    if (!categorieId) {
      console.error('[AnimalAchatScreen] Category not specified');
      setError('Catégorie non spécifiée. Veuillez sélectionner une catégorie depuis la liste des transactions.');
      return;
    }

    if (!montant || !dateTransaction || !animalNumero || !animalEspeceId) {
      console.error('[AnimalAchatScreen] Missing required fields');
      setError('Veuillez remplir tous les champs obligatoires (numéro, espèce, montant, date)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('[AnimalAchatScreen] Starting achat submission');

      // Get user ID from auth storage
      const userId = await authStorage.getUserId();
      console.log('[AnimalAchatScreen] User ID:', userId);

      // Use constant type_evenement_id for achat
      const typeEvenementId = TypeEvenementIds.ACHAT;

      // Step 1: Create the Animal using repository
      const newAnimal = await createAnimal({
        farm_id: farmId,
        nom: animalNom || '',
        numero_identification: animalNumero,
        espece_id: animalEspeceId,
        race: animalRace || '',
        sexe: animalSexe,
        poids: animalPoids ? parseFloat(animalPoids) : 0,
        statut: 'SAIN',
        last_modified_by: userId,
      });
      console.log('[AnimalAchatScreen] Created animal with ID:', newAnimal.id);

      // Step 2: Create the Evenement using repository
      const createdEvent = await createEvenement({
        farm_id: farmId,
        animal_id: newAnimal.id,
        type_evenement_id: typeEvenementId,
        date_evenement: dateTransaction.toISOString().split('T')[0],
        description: description || `Achat de ${animalNumero}`,
        categorie: 'MOUVEMENT',
        statut_avant: 'SAIN',
        statut_apres: 'SAIN',
        last_modified_by: userId,
      });
      console.log('[AnimalAchatScreen] Created evenement for animal');

      // Step 3: Create the Transaction using repository (NOT linked to evenement - per contract)
      const createdTransaction = await createTransaction({
        farm_id: farmId,
        type_transaction: 'SORTIE',
        montant: parseFloat(montant),
        date_transaction: dateTransaction.toISOString(),
        description: description || `Achat de ${animalNumero}`,
        tiers: tiers || '',
        animal_id: newAnimal.id,
        categorie_id: categorieId,
        user_id: userId,
        last_modified_by: userId,
      });
      console.log('[AnimalAchatScreen] Created transaction');
      
      // Check WatermelonDB sync queue status after transaction
      const pendingRecords = await database.get('animals')
        .query(Q.where('_status', 'created'))
        .fetch();
      console.log('[AUDIT] Achat - WatermelonDB sync queue after transaction:', {
        pending_animals: pendingRecords.length,
      });

      console.log('[AnimalAchatScreen] Animal and transaction recorded successfully');
      navigation.goBack();
    } catch (err: any) {
      console.error('[AUDIT] Achat - Error during submission:', {
        error_message: err.message,
        error_stack: err.stack,
        farm_id: farmId,
        categorie_id: categorieId,
        animal_numero: animalNumero,
        animal_nom: animalNom,
        espece_id: animalEspeceId,
        montant: montant,
        date_transaction: dateTransaction?.toISOString(),
      });
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Achat d'animal"
        showBackButton={true}
        showBackground={false}
        style={styles.header}
        titleStyle={styles.headerTitle}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollcontainer}>
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
            options={especeOptions}
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
  header: {
    backgroundColor: '#2E7D32',
    height: 100,
    paddingBottom: 12,
  },
  headerTitle: {
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
   
  },
  scrollcontainer:{
    paddingVertical:16

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

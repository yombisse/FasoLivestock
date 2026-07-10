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
import { Transaction, TransactionType, CreateTransactionData, UpdateTransactionData } from '../../../types/transaction.types';
import { getLocalTransactionById } from '../../../database/repositories/transactionRepository';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import transactionService from '../../../services/transaction.service';
import { creerEvenementDepuisTransaction } from '../../../services/evenementTransactionService';
import { getTypeEvenementIdByName } from '../../../database/repositories/typeEvenementRepository';
import { farmStorage } from '../../../storage/farmStorage';

type TransactionFormRouteProp = RouteProp<any, 'TransactionForm'>;
type TransactionFormNavigationProp = StackNavigationProp<any, 'TransactionForm'>;

const TYPE_OPTIONS: AppSelectOption[] = [
  { label: 'Entrée', value: 'ENTREE' },
  { label: 'Sortie', value: 'SORTIE' },
  { label: 'Transfert', value: 'TRANSFERT' },
  { label: 'Ajustement', value: 'AJUSTEMENT' },
];

const TransactionFormScreen = () => {
  const navigation = useNavigation<TransactionFormNavigationProp>();
  const route = useRoute<TransactionFormRouteProp>();
  const { transactionId } = route.params || {};
  const isEditMode = !!transactionId;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [categories, setCategories] = useState<AppSelectOption[]>([]);

  const [typeTransaction, setTypeTransaction] = useState<TransactionType>('ENTREE');
  const [montant, setMontant] = useState('');
  const [dateTransaction, setDateTransaction] = useState<Date | undefined>(undefined);
  const [categorieId, setCategorieId] = useState('');
  const [description, setDescription] = useState('');
  const [evenementId, setEvenementId] = useState('');
  const [animalId, setAnimalId] = useState('');

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

  const loadCategories = async () => {
    try {
      const localCategories = await getLocalCategories();
      const categoryOptions: AppSelectOption[] = localCategories.map(cat => ({
        label: cat.nom_categorie,
        value: cat.id,
      }));
      setCategories(categoryOptions);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTransaction = async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      const data = await getLocalTransactionById(transactionId);
      if (data) {
        setTransaction(data);
        setTypeTransaction(data.type_transaction);
        setMontant(data.montant.toString());
        setDateTransaction(new Date(data.date_transaction));
        setCategorieId(data.categorie_id || '');
        setDescription(data.description || '');
        setEvenementId(data.evenement_id || '');
        setAnimalId(data.animal_id || '');
      } else {
        setError('Transaction non trouvée');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadCategories();
  }, []);

  useEffect(() => {
    if (transactionId) {
      loadTransaction();
    }
  }, [transactionId]);

  const validateForm = (): boolean => {
    if (!typeTransaction) {
      setError('Le type de transaction est requis');
      return false;
    }
    if (!montant || parseFloat(montant) <= 0) {
      setError('Le montant doit être supérieur à 0');
      return false;
    }
    if (!dateTransaction) {
      setError('La date de transaction est requise');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!farmId) {
      setError('Aucune ferme active sélectionnée');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const transactionData: CreateTransactionData = {
        type_transaction: typeTransaction,
        montant: parseFloat(montant),
        date_transaction: dateTransaction ? dateTransaction.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        categorie_id: categorieId || undefined,
        description: description || undefined,
        evenement_id: evenementId || undefined,
        farm_id: farmId,
      };

      if (isEditMode && transaction) {
        const updateData: UpdateTransactionData = {
          ...transactionData,
          version: transaction.version,
          animal_id: animalId || undefined,
        };
        const { updateTransaction } = await import('../../../database/repositories/transactionRepository');
        await updateTransaction(transactionId, updateData);
      } else {
        const { createTransaction } = await import('../../../database/repositories/transactionRepository');
        const createdTransaction = await createTransaction(transactionData);

        // Create corresponding event if transaction has animal_id and no evenement_id
        if (animalId && !evenementId && parseFloat(montant) > 0) {
          const typeEvenementId = await getTypeEvenementIdByName('AUTRE');
          if (typeEvenementId) {
            await creerEvenementDepuisTransaction({
              transactionId: createdTransaction.id,
              farmId: farmId,
              animalId: animalId,
              montant: parseFloat(montant),
              dateTransaction: dateTransaction ? dateTransaction.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              typeEvenementId: typeEvenementId,
            });
          }
        }
      }

      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title={isEditMode ? 'Modifier transaction' : 'Nouvelle transaction'}
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <AppText>Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={isEditMode ? 'Modifier transaction' : 'Nouvelle transaction'}
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}

        <View style={styles.formSection}>
          <AppText style={styles.sectionTitle} fontWeight="bold">Informations générales</AppText>

          <AppText style={styles.label}>Type de transaction *</AppText>
          <AppSelect
            placeholder="Sélectionner le type"
            value={typeTransaction}
            options={TYPE_OPTIONS}
            onValueChange={(value) => setTypeTransaction(value as TransactionType)}
          />

          <AppText style={styles.label}>Montant (FCFA) *</AppText>
          <AppTextInput
            value={montant}
            onChangeText={setMontant}
            placeholder="Ex: 15000"
            keyboardType="numeric"
          />

          <AppText style={styles.label}>Date de transaction *</AppText>
          <AppDateTimePicker
            value={dateTransaction}
            onChange={setDateTransaction}
            placeholder="Sélectionner une date"
          />

          <AppText style={styles.label}>Catégorie</AppText>
          <AppSelect
            placeholder="Sélectionner une catégorie"
            value={categorieId}
            options={categories}
            onValueChange={setCategorieId}
          />

          <AppText style={styles.label}>Description</AppText>
          <AppTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description de la transaction (optionnel)"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formSection}>
          <AppText style={styles.sectionTitle} fontWeight="bold">Informations complémentaires</AppText>

          <AppText style={styles.label}>ID de l'événement</AppText>
          <AppTextInput
            value={evenementId}
            onChangeText={setEvenementId}
            placeholder="ID de l'événement lié (optionnel)"
          />

          {isEditMode && (
            <>
              <AppText style={styles.label}>ID de l'animal</AppText>
              <AppTextInput
                value={animalId}
                onChangeText={setAnimalId}
                placeholder="ID de l'animal lié (optionnel)"
                style={styles.disabledInput}
              />
              {transaction?.animal_id && (
                <AppText style={styles.note} color="#F57C00" fontSize={12}>
                  Note: Les transactions liées à un animal sont immuables
                </AppText>
              )}
            </>
          )}
        </View>

        {isEditMode && transaction && (
          <View style={styles.formSection}>
            <AppText style={styles.sectionTitle} fontWeight="bold">Métadonnées</AppText>
            <View style={styles.metaRow}>
              <AppText style={styles.metaLabel} color="#757575">Version:</AppText>
              <AppText style={styles.metaValue}>{transaction.version}</AppText>
            </View>
            <View style={styles.metaRow}>
              <AppText style={styles.metaLabel} color="#757575">Statut sync:</AppText>
              <AppText style={styles.metaValue}>{transaction.sync_status}</AppText>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <AppButton
            title={submitting ? 'Enregistrement...' : (isEditMode ? 'Mettre à jour' : 'Créer')}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 8,
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
  },
  note: {
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 14,
    color: '#212121',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
});

export default TransactionFormScreen;

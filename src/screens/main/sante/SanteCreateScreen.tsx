import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppTab from '../../../components/AppTab';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppTextInput from '../../../components/AppTextInput';
import AppSelect, { AppSelectOption } from '../../../components/AppSelect';
import AnimalPicker, { AnimalPickerRef } from '../../../components/AnimalPicker';
import database from '../../../database/watermelonIndex';
import { useTypeEvenements } from '../../../hooks/useTypeEvenements';
import { useCategories } from '../../../hooks/useCategories';
import { useAnimals } from '../../../hooks/useAnimals';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { TypeEvenementSanitaire, MetadonneesSanitaire } from '../../../types/sante.types';
import { TypeEvenementIds } from '../../../constants/typeEvenements';
import { Animal } from '../../../types/animal.types';
import { createEvenementSanitaire } from '../../../database/repositories/santeEvenementsRepository';
import { creerTransactionDepuisEvenement } from '../../../services/evenementTransactionService';
import { filterAnimalsForSanitaire } from '../../../database/repositories/animalRepository';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../../../config/colors';
import { validerEvenementSanitaire } from '../../../utils/santeValidation';

const TABS_CONFIG = [
  { id: 'maladie', label: 'Maladie' },
  { id: 'vaccination', label: 'Vaccination' },
  { id: 'surveillance', label: 'Surveillance' },
  { id: 'traitement', label: 'Traitement' },
];

const SanteCreateScreen = () => {
  const navigation = useNavigation();
  const animalPickerRef = useRef<AnimalPickerRef>(null);
  const [activeTab, setActiveTab] = useState<'maladie' | 'vaccination' | 'surveillance' | 'traitement'>('maladie');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [dateEvent, setDateEvent] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [cout, setCout] = useState('');
  const [metadata, setMetadata] = useState<MetadonneesSanitaire>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSyncMessage, setShowSyncMessage] = useState(false);
  const [farmId, setFarmId] = useState<string | null>(null);

  // WatermelonDB hooks
  const { typeEvenements, loading: loadingTypes } = useTypeEvenements(farmId || undefined);
  const { categories, loading: loadingCategories } = useCategories(farmId || '');
  const { animals, loading: loadingAnimals } = useAnimals(farmId || '');

  // Filtre d'éligibilité local selon le type d'événement sanitaire
  // Utilise la fonction utilitaire filterAnimalsForSanitaire du repository
  // Règles backend (calcul local pour mobile offline-first) :
  // - VACCINATION : Animaux vivants (statut = 'SAIN' ou 'MALADE')
  // - TRAITEMENT : Animaux malades (statut = 'MALADE')
  // - CONTRÔLE/MALADIE/SURVEILLANCE : Animaux vivants (statut = 'SAIN' ou 'MALADE')
  const tabToTypeEvenement: Record<string, string> = {
    'maladie': 'MALADIE',
    'vaccination': 'VACCINATION',
    'surveillance': 'SURVEILLANCE',
    'traitement': 'TRAITEMENT',
  };
  const typeEvenement = tabToTypeEvenement[activeTab];
  const availableAnimals = filterAnimalsForSanitaire(animals, typeEvenement);

  // Filter to only show SANITAIRE type evenements
  const santeTypeEvenements = typeEvenements.filter(
    (type: any) => type.categorie === 'SANITAIRE'
  );

  // Log available sanitary event types for debugging
  console.log('[SanteCreateScreen] Available SANITAIRE type evenements:', santeTypeEvenements.map((t: any) => ({ id: t.id, nom_type: t.nom_type })));

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      console.log('[SanteCreateScreen] Active farm:', farm);
      if (farm) {
        setFarmId(farm.id);
        console.log('[SanteCreateScreen] Farm ID set:', farm.id);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  const handleMetadataChange = (key: keyof MetadonneesSanitaire, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleMetadataDateChange = (key: keyof MetadonneesSanitaire, _: any, date: string) => {
    // Convert formatted date (DD/MM/YYYY) to ISO format (YYYY-MM-DD) for storage
    if (date) {
      const parts = date.split('/');
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        setMetadata(prev => ({ ...prev, [key]: isoDate }));
      }
    } else {
      setMetadata(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSubmit = async () => {
    console.log('[SanteCreateScreen] handleSubmit called');
    console.log('[SanteCreateScreen] selectedAnimal:', selectedAnimal);
    console.log('[SanteCreateScreen] selectedAnimal.id:', selectedAnimal?.id);
    console.log('[SanteCreateScreen] activeTab:', activeTab);
    console.log('[SanteCreateScreen] dateEvent:', dateEvent);
    console.log('[SanteCreateScreen] farmId:', farmId);

    if (!selectedAnimal || !selectedAnimal.id || !activeTab || !dateEvent || !farmId) {
      console.log('[SanteCreateScreen] Validation failed - missing required fields');
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Check if animal is active
    console.log('[AUDIT] Sanitary event - checking animal status:', {
      animal_id: selectedAnimal.id,
      animal_nom: selectedAnimal.nom,
      statut: selectedAnimal.statut,
      required_statut: 'SAIN',
    });
    
    // Allow health events for SAIN, MALADE, EN_TRAITEMENT animals
    const allowedStatuses = ['SAIN', 'MALADE', 'EN_TRAITEMENT'];
    if (!allowedStatuses.includes(selectedAnimal.statut || '')) {
      console.log('[SanteCreateScreen] Animal not eligible for health event:', selectedAnimal.statut);
      setError(`Impossible de créer un événement sanitaire pour cet animal (statut: ${selectedAnimal.statut})`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('[SanteCreateScreen] Starting sanitary event submission for type:', activeTab);

      // Map activeTab to type_evenement_id using constants
      const typeEvenementMap = {
        maladie: TypeEvenementIds.MALADIE,
        vaccination: TypeEvenementIds.VACCINATION,
        surveillance: TypeEvenementIds.CONTROLE,
        traitement: TypeEvenementIds.TRAITEMENT,
      };
      const typeEvenementId = typeEvenementMap[activeTab as keyof typeof typeEvenementMap];
      console.log('[SanteCreateScreen] type_evenement_id:', typeEvenementId);

      if (!typeEvenementId) {
        console.error('[AUDIT] Sanitaire - Type evenement not found:', activeTab);
        console.log('[SanteCreateScreen] type_evenement_id not found, showing error');
        setError(`Type d'événement introuvable pour: ${activeTab}`);
        return;
      }

      // Validation backend pour éviter les rejets lors du sync
      const typeMap = {
        maladie: 'maladie',
        vaccination: 'vaccination',
        surveillance: 'controle',
        traitement: 'traitement',
      };
      const typeName = typeMap[activeTab] as any;

      const validation = validerEvenementSanitaire({
        animal_id: selectedAnimal.id,
        type: typeName,
        date_evenement: dateEvent.toISOString().split('T')[0],
        description: description || undefined,
        cout: cout ? parseFloat(cout) : undefined,
        metadonnees: metadata,
      });

      if (!validation.valide) {
        setError(validation.erreur || 'Erreur de validation');
        return;
      }

      // Get user ID from auth storage
      const userId = await authStorage.getUserId();

      // Determine statut_apres based on event type
      let statutApres: 'SAIN' | 'MALADE' | 'EN_TRAITEMENT' | 'VENDU' | 'MORT' | 'PERDU' = (selectedAnimal.statut || 'SAIN') as any;
      
      if (activeTab === 'maladie') {
        statutApres = 'MALADE';
      } else if (activeTab === 'traitement') {
        statutApres = 'EN_TRAITEMENT';
      } else if (activeTab === 'vaccination' || activeTab === 'surveillance') {
        // Keep current status for vaccination and surveillance
        statutApres = (selectedAnimal.statut || 'SAIN') as any;
      }

      // Create the Evenement using repository
      const createdEvent = await createEvenementSanitaire({
        farm_id: farmId,
        type_evenement_id: typeEvenementId,
        animal_id: selectedAnimal.id,
        date_evenement: dateEvent.toISOString().split('T')[0],
        description: description || '',
        categorie: 'SANITAIRE',
        type: typeName,
        statut_avant: (selectedAnimal.statut || 'SAIN') as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        statut_apres: statutApres as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        metadonnees: JSON.stringify(metadata),
        cout: cout ? parseFloat(cout) : undefined,
        last_modified_by: userId,
      });
      console.log('[SanteCreateScreen] Created evenement with ID:', (createdEvent as any).id);

      // Create transaction locally if cost > 0 (offline-first architecture)
      // This ensures consistency with other screens (AnimalAchatScreen, etc.)
      if (cout && parseFloat(cout) > 0) {
        try {
          // Use 'SANTE' as the category name - will be resolved to ID by the service
          await creerTransactionDepuisEvenement({
            evenementId: (createdEvent as any).id,
            farmId: farmId,
            animalId: selectedAnimal.id,
            cout: parseFloat(cout),
            dateEvenement: dateEvent.toISOString().split('T')[0],
            categorieId: 'SANTE',
            userId: userId,
          });
          console.log('[SanteCreateScreen] Transaction créée localement pour l\'événement sanitaire:', (createdEvent as any).id);
        } catch (error) {
          console.error('[SanteCreateScreen] Erreur création transaction:', error);
          // Ne pas bloquer si la transaction échoue - l'événement est déjà créé
        }
      }

      console.log('[SanteCreateScreen] Sanitary event submission completed');

      // Show sync message to user
      setShowSyncMessage(true);
      setTimeout(() => setShowSyncMessage(false), 3000);

      // Navigate to Sante tab using reset to ensure proper navigation
      console.log('[SanteCreateScreen] Navigating to Sante tab');
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never, params: { screen: 'Sante' as never } as never }],
      });
      console.log('[SanteCreateScreen] Navigation initiated');
    } catch (e: any) {
      console.error('[SanteCreateScreen] Error in handleSubmit:', e);
      setError(e.message || 'Échec de l\'enregistrement');
    } finally {
      console.log('[SanteCreateScreen] Setting submitting to false');
      setSubmitting(false);
    }
  };

  const renderMetadataFields = () => {
    const fields: Array<{ key: keyof MetadonneesSanitaire; label: string; placeholder: string; type?: 'text' | 'select' | 'date'; options?: AppSelectOption[]; optional?: boolean }> = [];

    switch (activeTab) {
      case 'vaccination':
        // Rappel créé automatiquement par backend via espece_parametre.intervalle_vaccin_jours
        fields.push(
          { key: 'nom_vaccin', label: 'Nom du vaccin', placeholder: 'Ex: Rage', type: 'text' },
          { key: 'lot_vaccin', label: 'Lot', placeholder: 'Numéro de lot', type: 'text' },
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
      case 'traitement':
        // Rappel conditionnel via metadonnees.date_rappel_suggeree
        fields.push(
          { key: 'nom_medicament', label: 'Médicament', placeholder: 'Nom du médicament', type: 'text' },
          { key: 'dosage', label: 'Dosage', placeholder: 'Ex: 2x par jour', type: 'text' },
          { key: 'duree', label: 'Durée', placeholder: 'Ex: 7 jours', type: 'text' },
          { key: 'date_rappel_suggeree', label: 'Date de rappel (optionnel)', placeholder: 'Pour créer un rappel', type: 'date', optional: true },
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
      case 'maladie':
        // Pas de rappel pour les maladies
        fields.push(
          { key: 'nom_maladie', label: 'Nom de la maladie *', placeholder: 'Ex: Fièvre aphteuse', type: 'text' },
          { key: 'symptomes', label: 'Symptômes', placeholder: 'Décrire les symptômes', type: 'text' },
          { key: 'diagnostic', label: 'Diagnostic', placeholder: 'Diagnostic présumé', type: 'text' },
          { key: 'gravite', label: 'Gravité', placeholder: 'Légère, Modérée, Grave', type: 'select', options: [
            { label: 'Légère', value: 'legere' },
            { label: 'Modérée', value: 'moderee' },
            { label: 'Grave', value: 'grave' },
          ]},
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
      case 'surveillance':
        // Rappel conditionnel via metadonnees.date_prochain_controle
        fields.push(
          { key: 'type_controle', label: 'Type de contrôle', placeholder: 'Ex: Poids, Température', type: 'text' },
          { key: 'resultat', label: 'Résultat', placeholder: 'Résultat du contrôle', type: 'text' },
          { key: 'date_prochain_controle', label: 'Date prochain contrôle (optionnel)', placeholder: 'Pour créer un rappel', type: 'date', optional: true },
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
    }

    return fields.map(field => (
      <View key={field.key} style={styles.fieldContainer}>
        <AppText style={styles.label}>
          {field.label}
          {field.optional && <AppText style={styles.optionalLabel}> (optionnel)</AppText>}
        </AppText>
        {field.type === 'select' && field.options ? (
          <AppSelect
            placeholder={field.placeholder}
            value={metadata[field.key] || ''}
            options={field.options}
            onValueChange={(value) => handleMetadataChange(field.key, value)}
          />
        ) : field.type === 'date' ? (
          <AppDateTimePicker
            value={metadata[field.key] ? new Date(metadata[field.key] as string) : undefined}
            onChange={(_, date) => handleMetadataDateChange(field.key, _, date)}
            placeholder={field.placeholder}
          />
        ) : (
          <AppTextInput 
            value={metadata[field.key] || ''} 
            onChangeText={(value) => handleMetadataChange(field.key, value)} 
            placeholder={field.placeholder} 
          />
        )}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        title="Nouvel événement santé"
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorBannerText}>{error}</AppText></View>}
        {showSyncMessage && (
          <View style={styles.syncMessage}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#2E7D32" />
            <AppText style={styles.syncMessageText}>
              Enregistré ! La transaction associée apparaîtra une fois synchronisée.
            </AppText>
          </View>
        )}

        <AppTab
          options={TABS_CONFIG}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as any)}
          textStyle={styles.tabText}
        />

        <View style={styles.contextCard}>
          <AppText style={styles.contextTitle}>Animal concerné *</AppText>
          <TouchableOpacity 
            onPress={() => {
              console.log('Opening animal picker, ref:', animalPickerRef);
              animalPickerRef.current?.present();
            }}
            activeOpacity={0.7}
            style={styles.input}
          >
            <AppText style={selectedAnimal ? styles.inputText : styles.inputPlaceholder}>
              {selectedAnimal?.nom || 'Sélectionner un animal'}
            </AppText>
          </TouchableOpacity>
        </View>

        <AnimalPicker
          ref={animalPickerRef}
          animals={availableAnimals}
          title="Sélectionner un animal"
          onSelect={(animal) => setSelectedAnimal(animal)}
          selectedId={selectedAnimal?.id}
        />

        <AppText style={styles.label}>Date de l'événement *</AppText>
        <AppDateTimePicker
          value={dateEvent}
          onChange={setDateEvent}
          placeholder="Sélectionner une date"
        />

        <AppText style={styles.label}>Description</AppText>
        <AppTextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description de l'événement (optionnel)"
          multiline
        />

        <AppText style={styles.label}>Coût (FCFA)</AppText>
        <AppTextInput
          style={styles.input}
          value={cout}
          onChangeText={setCout}
          placeholder="Coût (optionnel)"
          keyboardType="numeric"
        />

        <AppText style={styles.label}>Détails</AppText>
        {renderMetadataFields()}

        <View style={styles.buttonContainer}>
          <AppButton
            title={submitting ? 'Enregistrement...' : 'Enregistrer l\'événement'}
            onPress={handleSubmit}
            disabled={!selectedAnimal || !dateEvent || submitting}
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
    backgroundColor: Theme.backgroundLight,
  },
  header: {
    backgroundColor: Theme.primary,
    height: 100,
    alignItems:'center'
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#F44336',
    fontSize: 14,
  },
  syncMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncMessageText: {
    color: '#2E7D32',
    fontSize: 14,
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Theme.white,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'transparent',
    borderColor: Theme.primary,
  },
  tabText: {
    color: Theme.textPrimary,
    fontSize: 9,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Theme.primary,
    fontWeight: '600',
  },
  contextCard: {
    backgroundColor: Theme.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contextTitle: {
    color: Theme.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    color: Theme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionalLabel: {
    color: Theme.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  input: {
    backgroundColor: Theme.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: Theme.textPrimary,
  },
  inputText: {
    fontSize: 16,
    color: Theme.textPrimary,
  },
  inputPlaceholder: {
    fontSize: 16,
    color: Theme.textSecondary,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default SanteCreateScreen;

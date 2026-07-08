import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Modalize } from 'react-native-modalize';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppTextInput from '../../../components/AppTextInput';
import AppSelect, { AppSelectOption } from '../../../components/AppSelect';
import { createEvenementSanitaire } from '../../../database/repositories/santeEvenementsRepository';
import { clearFarmCache } from '../../../database/repositories/cacheRepository';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { TypeEvenementSanitaire, MetadonneesSanitaire } from '../../../types/sante.types';
import { getLocalTypeEvenements } from '../../../database/repositories/typeEvenementRepository';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import { getLocalLots } from '../../../database/repositories/lotRepository';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const TYPE_CONFIG_SANTE: Record<string, { icon: string; color: string }> = {
  'Vaccination': { icon: 'needle', color: '#2196F3' },
  'Traitement': { icon: 'pill', color: '#FF9800' },
  'Maladie': { icon: 'virus', color: '#F44336' },
  'Contrôle': { icon: 'stethoscope', color: '#4CAF50' },
  'Pesée': { icon: 'scale', color: '#9C27B0' },
  'Autre': { icon: 'information', color: '#757575' },
};

const SanteCreateScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const selectedAnimal = (route.params as any)?.animal;
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [dateEvent, setDateEvent] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [cout, setCout] = useState('');
  const [metadata, setMetadata] = useState<MetadonneesSanitaire>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [lots, setLots] = useState<Array<{ id: string; nom_lot: string }>>([]);
  const [typeEvenements, setTypeEvenements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const bottomSheetRef = useRef<Modalize>(null);

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
        // Load lots for this farm
        const farmLots = await getLocalLots(farm.id);
        setLots(farmLots.map(lot => ({ id: lot.id, nom_lot: lot.nom_lot })));
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  const loadTypeEvenements = async () => {
    try {
      const typeEvenementsData = await getLocalTypeEvenements();
      // Filter to only show SANITAIRE type evenements
      const filteredTypeEvenements = typeEvenementsData.filter(
        (type: any) => type.categorie === 'SANITAIRE'
      );
      setTypeEvenements(filteredTypeEvenements);
    } catch (error) {
      console.error('Error loading type evenements:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getLocalCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadTypeEvenements();
    loadCategories();
    if (selectedAnimal) {
      bottomSheetRef.current?.open();
    }
  }, []);

  const handleTypePress = (type: TypeEvenementSanitaire) => {
    setSelectedType(type);
    bottomSheetRef.current?.close();
  };

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
    console.log('[SanteCreateScreen] selectedType:', selectedType);
    console.log('[SanteCreateScreen] dateEvent:', dateEvent);
    console.log('[SanteCreateScreen] farmId:', farmId);

    if (!selectedAnimal || !selectedType || !dateEvent || !farmId) {
      console.log('[SanteCreateScreen] Validation failed - missing required fields');
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Check if animal is active
    if (selectedAnimal.statut !== 'ACTIF') {
      console.log('[SanteCreateScreen] Animal not active:', selectedAnimal.statut);
      setError(`Impossible de créer un événement sanitaire pour cet animal (statut: ${selectedAnimal.statut})`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('[SanteCreateScreen] Starting sanitary event submission for type:', selectedType);

      // Get the UUID from the selected type evenement (loaded dynamically)
      const typeEvenementId = selectedType?.id;
      console.log('[SanteCreateScreen] type_evenement_id:', typeEvenementId);

      if (!typeEvenementId) {
        console.log('[SanteCreateScreen] type_evenement_id not found, showing error');
        setError(`Type d'événement introuvable. Synchronisation requise.`);
        return;
      }

      console.log('[SanteCreateScreen] Calling createEvenementSanitaire');
      const createdEvent = await createEvenementSanitaire({
        farm_id: farmId,
        type_evenement_id: typeEvenementId,
        animal_id: selectedAnimal.id,
        date_evenement: dateEvent.toISOString().split('T')[0],
        description: description || undefined,
        cout: cout ? Number(cout) : undefined,
        metadonnees: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
      });
      console.log('[SanteCreateScreen] createEvenementSanitaire completed successfully');

      // Create transaction if cost > 0 (offline-first support)
      if (cout && Number(cout) > 0) {
        const user = await authStorage.getUser();
        const userId = user?.id;

        // Get categorieId for FRAIS_SANITAIRE from loaded categories
        const fraisSanitaireCategory = categories.find(
          (cat: any) => cat.nom_categorie === 'FRAIS_SANITAIRE'
        );
        const categorieId = fraisSanitaireCategory?.id;

        const { creerTransactionDepuisEvenement } = await import('../../../services/evenementTransactionService');
        await creerTransactionDepuisEvenement({
          evenementId: createdEvent.id,
          farmId: farmId,
          animalId: selectedAnimal.id,
          cout: Number(cout),
          dateEvenement: dateEvent.toISOString(),
          categorieId: categorieId,
          userId: userId,
        });
        console.log('[SanteCreateScreen] Transaction created for sanitary event');
      }

      // Invalidate cache for this farm to reflect new sanitary event
      await clearFarmCache(farmId);
      console.log('[SanteCreateScreen] Cache cleared');

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
    if (!selectedType) return null;

    const fields: Array<{ key: keyof MetadonneesSanitaire; label: string; placeholder: string; type?: 'text' | 'select' | 'date'; options?: AppSelectOption[] }> = [];

    switch (selectedType) {
      case 'vaccination':
        fields.push(
          { key: 'nom_vaccin', label: 'Nom du vaccin', placeholder: 'Ex: Rage', type: 'text' },
          { key: 'lot_vaccin', label: 'Lot', placeholder: 'Numéro de lot', type: 'select', options: lots.map(lot => ({ label: lot.nom_lot, value: lot.nom_lot })) },
          { key: 'date_prochaine', label: 'Date prochaine', placeholder: 'YYYY-MM-DD', type: 'date' },
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
      case 'traitement':
        fields.push(
          { key: 'nom_medicament', label: 'Médicament', placeholder: 'Nom du médicament', type: 'text' },
          { key: 'dosage', label: 'Dosage', placeholder: 'Ex: 2x par jour', type: 'text' },
          { key: 'duree', label: 'Durée', placeholder: 'Ex: 7 jours', type: 'text' },
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
      case 'maladie':
        fields.push(
          { key: 'symptomes', label: 'Symptômes', placeholder: 'Décrire les symptômes', type: 'text' },
          { key: 'diagnostic', label: 'Diagnostic', placeholder: 'Diagnostic présumé', type: 'text' },
          { key: 'gravite', label: 'Gravité', placeholder: 'Légère, Modérée, Grave', type: 'select', options: [
            { label: 'Légère', value: 'Légère' },
            { label: 'Modérée', value: 'Modérée' },
            { label: 'Grave', value: 'Grave' },
          ]},
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
      case 'controle':
        fields.push(
          { key: 'type_controle', label: 'Type de contrôle', placeholder: 'Ex: Poids, Température', type: 'text' },
          { key: 'resultat', label: 'Résultat', placeholder: 'Résultat du contrôle', type: 'text' },
          { key: 'veterinaire', label: 'Vétérinaire', placeholder: 'Nom du vétérinaire', type: 'text' },
        );
        break;
    }

    return fields.map(field => (
      <View key={field.key} style={styles.fieldContainer}>
        <AppText style={styles.label}>{field.label}</AppText>
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

  if (!selectedAnimal) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader 
          title="Erreur" 
          showBackground 
          showBackButton 
          onBackPress={() => navigation.goBack()} 
        />
        <View style={styles.content}>
          <AppText style={styles.errorText}>Aucun animal sélectionné</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Ajouter événement sanitaire" 
        subtitle={selectedAnimal.nom || 'Animal sans nom'} 
        showBackground 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorBannerText}>{error}</AppText></View>}
        
        <View style={styles.animalInfo}>
          <View style={styles.animalIcon}>
            <MaterialCommunityIcons 
              name={selectedAnimal.sexe === 'male' ? 'gender-male' : 'gender-female'} 
              size={32} 
              color={selectedAnimal.sexe === 'male' ? '#2196F3' : '#E91E63'} 
            />
          </View>
          <View>
            <AppText style={styles.animalName} fontWeight="bold">{selectedAnimal.nom || 'Sans nom'}</AppText>
            <AppText style={styles.animalMeta} color="#757575" fontSize={12}>
              {selectedAnimal.numero_identification || 'N° ID non défini'} • {selectedAnimal.espece?.nom || ''}
            </AppText>
          </View>
        </View>

        {!selectedType ? (
          <TouchableOpacity style={styles.selectTypeButton} onPress={() => bottomSheetRef.current?.open()}>
            <MaterialCommunityIcons name="plus-circle" size={24} color="#2E7D32" />
            <AppText style={styles.selectTypeText} fontWeight="bold">Sélectionner le type d'événement</AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedTypeContainer}>
            <View style={styles.selectedTypeBadge}>
              <MaterialCommunityIcons 
                name={TYPE_CONFIG_SANTE[selectedType?.nom_type]?.icon || 'information'} 
                size={20} 
                color={TYPE_CONFIG_SANTE[selectedType?.nom_type]?.color || '#757575'} 
              />
              <AppText style={styles.selectedTypeText}>{selectedType?.nom_type}</AppText>
            </View>
            <TouchableOpacity onPress={() => bottomSheetRef.current?.open()}>
              <MaterialCommunityIcons name="pencil" size={20} color="#757575" />
            </TouchableOpacity>
          </View>
        )}

        {selectedType && (
          <>
            <AppText style={styles.label}>Date de l'événement *</AppText>
            <AppDateTimePicker
              value={dateEvent}
              onChange={setDateEvent}
              placeholder="Sélectionner une date"
            />

            <AppText style={styles.label}>Description</AppText>
            <AppTextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description de l'événement (optionnel)"
            />

            <AppText style={styles.label}>Coût</AppText>
            <AppTextInput
              value={cout}
              onChangeText={setCout}
              placeholder="Coût (optionnel)"
              keyboardType="numeric"
            />

            <AppText style={styles.label}>Détails</AppText>
            {renderMetadataFields()}

            <View style={styles.buttonContainer}>
              <AppButton
                title={submitting ? 'Enregistrement...' : 'Enregistrer'}
                onPress={handleSubmit}
                disabled={!selectedType || !dateEvent || submitting}
              />
            </View>
          </>
        )}
      </ScrollView>

      <Modalize
        ref={bottomSheetRef}
        adjustToContentHeight
        modalStyle={styles.bottomSheetModal}
        handleStyle={styles.bottomSheetHandle}
      >
        <View style={styles.bottomSheetContent}>
          <AppText style={styles.bottomSheetTitle} fontWeight="bold">Type d'événement</AppText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeScrollContent}
          >
            {typeEvenements.map((type) => {
              const config = TYPE_CONFIG_SANTE[type.nom_type] || { icon: 'information', color: '#757575' };
              const isSelected = selectedType?.id === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                  onPress={() => handleTypePress(type)}
                >
                  <View style={[styles.typeChipIcon, { backgroundColor: isSelected ? config.color : config.color + '20' }]}>
                    <MaterialCommunityIcons name={config.icon} size={24} color={isSelected ? '#fff' : config.color} />
                  </View>
                  <AppText style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>{type.nom_type}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modalize>
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
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
  animalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  animalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  animalName: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 4,
  },
  animalMeta: {
    fontSize: 12,
  },
  selectTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    gap: 12,
    marginBottom: 20,
  },
  selectTypeText: {
    fontSize: 16,
    color: '#2E7D32',
  },
  selectedTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTypeText: {
    fontSize: 16,
    color: '#212121',
  },
  label: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 8,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  bottomSheetModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  bottomSheetHandle: {
    backgroundColor: '#E0E0E0',
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginTop: 8,
    borderRadius: 2,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  bottomSheetTitle: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 20,
    fontWeight: '700',
  },
  typeScrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  typeChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  typeChipSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#2E7D32',
  },
  typeChipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChipText: {
    fontSize: 12,
    color: '#212121',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
});

export default SanteCreateScreen;

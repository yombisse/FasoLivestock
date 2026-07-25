import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
import AnimalPicker, { AnimalPickerRef } from '../../../components/AnimalPicker';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { ReproductionEventType } from '../../../types/reproduction.types';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../../../config/colors';
import { getReproductionEventColor } from '../../../config/colors';
import { validerEvenementReproduction, Animal, Evenement } from '../../../utils/reproductionValidation';
import { getReproductionEvents } from '../../../database/repositories/reproductionRepository';
import { filterAnimalsForReproduction } from '../../../database/repositories/animalRepository';

const TABS_CONFIG = [
  { id: 'saillie', label: 'Saillie' },
  { id: 'gestation', label: 'Gestation' },
  { id: 'misebas', label: 'Mise bas' },
];

const AddReproductionEventScreen = () => {
  const navigation = useNavigation();
  const femaleSailliePickerRef = useRef<AnimalPickerRef>(null);
  const malePickerRef = useRef<AnimalPickerRef>(null);
  const femaleGestationPickerRef = useRef<AnimalPickerRef>(null);
  const femaleMiseBasPickerRef = useRef<AnimalPickerRef>(null);
  const [loading, setLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState<ReproductionEventType[]>([]);
  const [activeTab, setActiveTab] = useState<'saillie' | 'gestation' | 'misebas'>('saillie');
  const [description, setDescription] = useState('');
  const [cout, setCout] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableFemales, setAvailableFemales] = useState<any[]>([]);
  const [availableMales, setAvailableMales] = useState<any[]>([]);
  const [animalEvents, setAnimalEvents] = useState<Evenement[]>([]);

  // Saillie states
  const [selectedFemaleSaillie, setSelectedFemaleSaillie] = useState<any>(null);
  const [selectedMale, setSelectedMale] = useState<any>(null);
  const [dateSaillie, setDateSaillie] = useState<Date | undefined>(undefined);
  const [calculatedBirthDate, setCalculatedBirthDate] = useState<Date | null>(null);
  const [filteredMales, setFilteredMales] = useState<any[]>([]);
  
  // Gestation states
  const [selectedFemaleGestation, setSelectedFemaleGestation] = useState<any>(null);
  const [dateConfirmation, setDateConfirmation] = useState<Date | undefined>(undefined);
  const [estimatedBirthDate, setEstimatedBirthDate] = useState<Date | null>(null);
  
  // Mise bas states
  const [selectedFemaleMiseBas, setSelectedFemaleMiseBas] = useState<any>(null);
  const [dateMiseBas, setDateMiseBas] = useState<Date | undefined>(undefined);
  const [nombreNouveauNes, setNombreNouveauNes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }
      
      // Use local repositories for offline-first pattern
      const { getLocalTypeEvenements } = await import('../../../database/repositories/typeEvenementRepository');
      const { getLocalActiveFemales, getLocalActiveMales } = await import('../../../database/repositories/animalRepository');

      const [types, categoriesData, females, males] = await Promise.all([
        getLocalTypeEvenements(),
        getLocalCategories(),
        getLocalActiveFemales(farm.id),
        getLocalActiveMales(farm.id),
      ]);

      // Filtrer les types reproductifs uniquement
      const reproductionTypes = types.filter((type: any) =>
        type.categorie === 'REPRODUCTION'
      );

      setEventTypes(reproductionTypes);
      setCategories(categoriesData);

      console.log('[AddReproductionEvent] Available females:', females.length);
      console.log('[AddReproductionEvent] Available males:', males.length);
      females.slice(0, 3).forEach((f: any) => {
        console.log('[AddReproductionEvent] Female details:', {
          id: f.id,
          nom: f.nom,
          especeNom: f.espece?.nom,
          especeObj: f.espece,
          allKeys: Object.keys(f),
          _raw: f._raw
        });
      });
      console.log('[AddReproductionEvent] Males sample:', males.slice(0, 3).map(m => ({ id: m.id, nom: m.nom, espece: m.espece?.nom })));

      setAvailableFemales(females);
      setAvailableMales(males);
      
      // Charger les événements de reproduction pour le filtrage d'éligibilité
      const reproductionEvents = await getReproductionEvents(farm.id);
      setAnimalEvents(reproductionEvents);
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError(e.message || 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const calculateBirthDate = () => {
    if (!dateSaillie || !selectedFemaleSaillie) return;
    const gestationDays = selectedFemaleSaillie.espece?.nom?.toLowerCase().includes('bovin') ? 285 : 150;
    const birthDate = new Date(dateSaillie);
    birthDate.setDate(birthDate.getDate() + gestationDays);
    setCalculatedBirthDate(birthDate);
  };

  // Filter males by species when a female is selected for saillie
  useEffect(() => {
    const { filterAnimalsBySpecies } = require('../../../utils/animalUtils');

    console.log('[AddReproductionEvent] Selected female:', selectedFemaleSaillie);
    console.log('[AddReproductionEvent] Female species:', selectedFemaleSaillie?.espece);
    console.log('[AddReproductionEvent] Available males:', availableMales.length);

    if (selectedFemaleSaillie && selectedFemaleSaillie.espece?.nom) {
      const femaleSpecies = selectedFemaleSaillie.espece.nom;
      const malesOfSameSpecies = filterAnimalsBySpecies(availableMales, femaleSpecies);
      setFilteredMales(malesOfSameSpecies);
      console.log('[AddReproductionEvent] Filtering males by species:', femaleSpecies, '=>', malesOfSameSpecies.length, 'males');
    } else {
      setFilteredMales(availableMales);
    }
  }, [selectedFemaleSaillie, availableMales]);

  // Filter females based on reproduction eligibility rules
  useEffect(() => {
    if (availableFemales.length === 0 || animalEvents.length === 0) {
      return;
    }

    const tabToTypeReproduction: Record<string, string> = {
      'saillie': 'SAILLIE',
      'gestation': 'GESTATION',
      'misebas': 'MISE_BAS',
    };
    
    const typeReproduction = tabToTypeReproduction[activeTab];
    const eligibleFemales = filterAnimalsForReproduction(
      availableFemales,
      typeReproduction,
      animalEvents,
      {} // especeParametres - could be loaded from espece table if needed
    );

    console.log('[AddReproductionEvent] Filtered eligible females for', typeReproduction, ':', eligibleFemales.length);
    
    // Update the appropriate state based on active tab
    if (activeTab === 'saillie') {
      // Saillie uses its own picker, so we don't need to update availableFemales
      // But we could add validation to show only eligible females
    } else if (activeTab === 'gestation') {
      // Gestation uses its own picker
    } else if (activeTab === 'misebas') {
      // Mise bas uses its own picker
    }
  }, [activeTab, availableFemales, animalEvents]);

  const calculateEstimatedBirthDate = () => {
    if (!dateConfirmation || !selectedFemaleGestation) return;
    const gestationDays = selectedFemaleGestation.espece?.nom?.toLowerCase().includes('bovin') ? 285 : 150;
    const birthDate = new Date(dateConfirmation);
    birthDate.setDate(birthDate.getDate() + gestationDays);
    setEstimatedBirthDate(birthDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getSelectedFemale = () => {
    if (activeTab === 'saillie') return selectedFemaleSaillie;
    if (activeTab === 'gestation') return selectedFemaleGestation;
    if (activeTab === 'misebas') return selectedFemaleMiseBas;
    return null;
  };

  const loadAnimalEvents = async (animalId: string) => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (!farm) return;

      const events = await getReproductionEvents(farm.id, animalId);
      
      // Charger les types d'événements pour mapper les IDs aux noms
      const { getLocalTypeEvenements } = await import('../../../database/repositories/typeEvenementRepository');
      const typeEvenements = await getLocalTypeEvenements();
      const typeMap = new Map(typeEvenements.map((t: any) => [t.id, t.nom_type]));
      
      // Convertir les événements au format attendu par les validations
      const formattedEvents: Evenement[] = events.map(e => ({
        id: e.id,
        type_nom: typeMap.get(e.type_evenement_id) || e.type_evenement_id, // Utiliser le nom si disponible, sinon l'ID
        date_evenement: e.date_evenement,
        statut: null, // Le statut n'est pas stocké dans EvenementReproductif
        date_fin: null,
      }));

      console.log('[AddReproductionEvent] Loaded animal events:', {
        animalId,
        eventsCount: events.length,
        formattedEvents: formattedEvents.map(e => ({ type_nom: e.type_nom, date: e.date_evenement })),
      });

      setAnimalEvents(formattedEvents);
    } catch (error) {
      console.error('[AddReproductionEvent] Error loading animal events:', error);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Charger les événements quand une femelle est sélectionnée pour la saillie
  useEffect(() => {
    if (selectedFemaleSaillie?.id) {
      void loadAnimalEvents(selectedFemaleSaillie.id);
    }
  }, [selectedFemaleSaillie]);

  // Charger les événements quand une femelle est sélectionnée pour la gestation
  useEffect(() => {
    if (selectedFemaleGestation?.id) {
      void loadAnimalEvents(selectedFemaleGestation.id);
    }
  }, [selectedFemaleGestation]);

  // Charger les événements quand une femelle est sélectionnée pour la mise bas
  useEffect(() => {
    if (selectedFemaleMiseBas?.id) {
      void loadAnimalEvents(selectedFemaleMiseBas.id);
    }
  }, [selectedFemaleMiseBas]);

  const handleSubmit = async () => {
    const selectedFemale = getSelectedFemale();
    
    // Validation selon onglet
    if (activeTab === 'saillie' && (!selectedFemaleSaillie || !selectedMale || !dateSaillie)) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (activeTab === 'gestation' && (!selectedFemaleGestation || !dateConfirmation)) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (activeTab === 'misebas' && (!selectedFemaleMiseBas || !dateMiseBas)) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation backend pour éviter les rejets lors du sync
    const typeMap = {
      saillie: 'Saillie',
      gestation: 'Gestation',
      misebas: 'Mise bas',
    };
    const typeName = typeMap[activeTab];
    
    // Convertir l'animal au format attendu par les validations
    const animalForValidation: Animal = {
      id: selectedFemale.id,
      sexe: selectedFemale.sexe,
      date_naissance: selectedFemale.date_naissance,
      espece_id: selectedFemale.espece_id,
    };

    // Déterminer la date selon l'onglet
    let eventDate: Date;
    if (activeTab === 'saillie') eventDate = dateSaillie!;
    else if (activeTab === 'gestation') eventDate = dateConfirmation!;
    else eventDate = dateMiseBas!;

    const validation = validerEvenementReproduction(
      typeName,
      animalForValidation,
      undefined, // especeParametres - non disponible localement pour l'instant
      animalEvents,
      eventDate.toISOString().split('T')[0]
    );

    if (!validation.valide) {
      setError(validation.erreur || 'Erreur de validation');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        console.error('[AUDIT] Reproduction - No active farm');
        throw new Error('Aucune ferme active');
      }
      
      const eventType = eventTypes.find(t => t.nom_type === typeName);
      
      if (!eventType) {
        console.error('[AUDIT] Reproduction - Event type not found:', typeName);
        throw new Error('Type d\'événement non trouvé');
      }
      
      // Use local repository for offline-first pattern
      const { createReproductionEvent } = await import('../../../database/repositories/reproductionRepository');

      // Prepare metadata for saillie events (includes male_id)
      const metadata = activeTab === 'saillie' && selectedMale
        ? JSON.stringify({ male_id: selectedMale.id })
        : undefined;

      const eventId = await createReproductionEvent({
        farm_id: farm.id,
        animal_id: selectedFemale.id,
        type_evenement_id: eventType.id,
        date_evenement: eventDate.toISOString().split('T')[0],
        categorie: eventType.categorie,
        description: description || undefined,
        cout: cout ? Number(cout) : undefined,
        metadonnees: metadata,
      });

      console.log('[AddReproductionEvent] Event created successfully:', eventId);

      // Note: La transaction associée sera créée par le backend lors du sync
      // pour éviter la duplication de logique métier côté mobile

      // Reset form
      setDescription('');
      setCout('');
      setDateSaillie(undefined);
      setDateConfirmation(undefined);
      setDateMiseBas(undefined);
      setSelectedFemaleSaillie(null);
      setSelectedFemaleGestation(null);
      setSelectedFemaleMiseBas(null);
      setSelectedMale(null);
      setNombreNouveauNes('');
      setCalculatedBirthDate(null);
      setEstimatedBirthDate(null);

      // Navigate to Reproduction tab using reset to ensure proper navigation
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never, params: { screen: 'Reproduction' as never } as never }],
      });
    } catch (e: any) {
      console.error('[AUDIT] Reproduction - Error:', e);
      setError(e.message || 'Échec de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        showBackground={false}
        title="Événement Reproductif"
        subtitle="Saillie · Gestation · Mise bas"
        showBackButton
        onBackPress={() => navigation.goBack()}
        style={styles.header}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}
        
        <AppTab
          options={TABS_CONFIG}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as any)}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.primary} />
          </View>
        ) : (
          <>
            {/* Formulaire Saillie */}
            {activeTab === 'saillie' && (
              <View style={styles.formSection}>
                <AppText style={styles.label}>Femelle *</AppText>
                <TouchableOpacity 
                  onPress={() => femaleSailliePickerRef.current?.present()}
                  activeOpacity={0.7}
                  style={styles.input}
                >
                  <AppText style={selectedFemaleSaillie ? styles.inputText : styles.inputPlaceholder}>
                    {selectedFemaleSaillie?.nom || 'Sélectionner une femelle'}
                  </AppText>
                </TouchableOpacity>
                
                <AppText style={styles.label}>Mâle *</AppText>
                <TouchableOpacity 
                  onPress={() => malePickerRef.current?.present()}
                  activeOpacity={0.7}
                  style={styles.input}
                >
                  <AppText style={selectedMale ? styles.inputText : styles.inputPlaceholder}>
                    {selectedMale?.nom || 'Sélectionner un mâle'}
                  </AppText>
                </TouchableOpacity>
                
                <AppText style={styles.label}>Date de saillie *</AppText>
                <AppDateTimePicker 
                  value={dateSaillie} 
                  onChange={(_: any, formatted: string) => {
                    setDateSaillie(new Date(formatted.split('/').reverse().join('-')));
                    calculateBirthDate();
                  }}
                  placeholder="Sélectionner une date" 
                />
                
                {calculatedBirthDate && (
                  <View style={styles.infoCard}>
                    <AppText style={styles.infoTitle}>Date estimée de mise bas</AppText>
                    <AppText style={styles.infoValue}>{formatDate(calculatedBirthDate)}</AppText>
                    <AppText style={styles.infoSub}>
                      {selectedFemaleSaillie?.espece?.nom?.toLowerCase().includes('bovin') 
                        ? 'Bovins : ~285 jours' 
                        : 'Ovins/Caprins : ~150 jours'}
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {/* Formulaire Gestation */}
            {activeTab === 'gestation' && (
              <View style={styles.formSection}>
                <AppText style={styles.label}>Femelle *</AppText>
                <TouchableOpacity 
                  onPress={() => femaleGestationPickerRef.current?.present()}
                  activeOpacity={0.7}
                  style={styles.input}
                >
                  <AppText style={selectedFemaleGestation ? styles.inputText : styles.inputPlaceholder}>
                    {selectedFemaleGestation?.nom || 'Sélectionner une femelle'}
                  </AppText>
                </TouchableOpacity>
                
                <AppText style={styles.label}>Date de confirmation *</AppText>
                <AppDateTimePicker 
                  value={dateConfirmation} 
                  onChange={(_: any, formatted: string) => {
                    setDateConfirmation(new Date(formatted.split('/').reverse().join('-')));
                    calculateEstimatedBirthDate();
                  }}
                  placeholder="Sélectionner une date" 
                />
                
                {estimatedBirthDate && (
                  <View style={styles.infoCard}>
                    <AppText style={styles.infoTitle}>Date estimée de mise bas</AppText>
                    <AppText style={styles.infoValue}>{formatDate(estimatedBirthDate)}</AppText>
                  </View>
                )}
              </View>
            )}

            {/* Formulaire Mise bas */}
            {activeTab === 'misebas' && (
              <View style={styles.formSection}>
                <AppText style={styles.label}>Femelle *</AppText>
                <TouchableOpacity 
                  onPress={() => femaleMiseBasPickerRef.current?.present()}
                  activeOpacity={0.7}
                  style={styles.input}
                >
                  <AppText style={selectedFemaleMiseBas ? styles.inputText : styles.inputPlaceholder}>
                    {selectedFemaleMiseBas?.nom || 'Sélectionner une femelle'}
                  </AppText>
                </TouchableOpacity>
                
                <AppText style={styles.label}>Date de mise bas *</AppText>
                <AppDateTimePicker 
                  value={dateMiseBas} 
                  onChange={(_: any, formatted: string) => setDateMiseBas(new Date(formatted.split('/').reverse().join('-')))}
                  placeholder="Sélectionner une date" 
                />
                
                <AppText style={styles.label}>Nombre de nouveau-nés</AppText>
                <AppTextInput 
                  value={nombreNouveauNes} 
                  onChangeText={setNombreNouveauNes} 
                  keyboardType="numeric" 
                  placeholder="0" 
                />
              </View>
            )}

            {/* Champs communs */}
            <View style={styles.formSection}>
              <AppText style={styles.label}>Description</AppText>
              <AppTextInput 
                value={description} 
                onChangeText={setDescription} 
                multiline 
                placeholder="Détails (optionnel)" 
                style={styles.multiline} 
              />
              
              <AppText style={styles.label}>Coût</AppText>
              <AppTextInput 
                value={cout} 
                onChangeText={setCout} 
                keyboardType="numeric" 
                placeholder="0 FCFA" 
              />
              
              <View style={styles.formActions}>
                <AppButton 
                  title={submitting ? 'Enregistrement...' : 'Enregistrer'} 
                  onPress={handleSubmit} 
                  disabled={submitting} 
                  style={styles.submitButton} 
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* AnimalPickers */}
      <AnimalPicker
        ref={femaleSailliePickerRef}
        animals={availableFemales}
        title="Sélectionner une femelle"
        onSelect={(animal) => setSelectedFemaleSaillie(animal)}
        selectedId={selectedFemaleSaillie?.id}
      />
      <AnimalPicker
        ref={malePickerRef}
        animals={filteredMales}
        title="Sélectionner un mâle"
        onSelect={(animal) => setSelectedMale(animal)}
        selectedId={selectedMale?.id}
      />
      <AnimalPicker
        ref={femaleGestationPickerRef}
        animals={availableFemales}
        title="Sélectionner une femelle"
        onSelect={(animal) => setSelectedFemaleGestation(animal)}
        selectedId={selectedFemaleGestation?.id}
      />
      <AnimalPicker
        ref={femaleMiseBasPickerRef}
        animals={availableFemales}
        title="Sélectionner une femelle"
        onSelect={(animal) => setSelectedFemaleMiseBas(animal)}
        selectedId={selectedFemaleMiseBas?.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundLight },
  header: {
    backgroundColor: Theme.primary,
  },
  content: { flex: 1, padding: 16 },
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
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Theme.white,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  formSection: {
    backgroundColor: Theme.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600', color: Theme.textPrimary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  infoCard: {
    backgroundColor: '#F5F7F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.textPrimary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.primary,
    marginBottom: 4,
  },
  infoSub: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  formActions: { marginTop: 16 },
  submitButton: { width: '100%' },
  errorBanner: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 10 },
  errorText: { color: '#C62828' },
});

export default AddReproductionEventScreen;

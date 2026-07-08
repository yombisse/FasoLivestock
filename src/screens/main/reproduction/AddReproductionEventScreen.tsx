import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Modalize } from 'react-native-modalize';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppDateTimePicker from '../../../components/AppDateTimePicker';
import AppTextInput from '../../../components/AppTextInput';
import { farmStorage } from '../../../storage/farmStorage';
import { authStorage } from '../../../storage/authStorage';
import { ReproductionEventType } from '../../../types/reproduction.types';
import { getLocalCategories } from '../../../database/repositories/categorieRepository';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Configuration des types reproductifs avec icônes et couleurs
const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  'Chaleur': { icon: 'fire', color: '#ff9800' },
  'Saillie': { icon: 'heart-pulse', color: '#e91e63' },
  'Gestation confirmée': { icon: 'human-female', color: '#9c27b0' },
  'Mise bas': { icon: 'baby-face-outline', color: '#4caf50' },
};

const AddReproductionEventScreen = () => {
  const navigation = useNavigation();
  const [females, setFemales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState<ReproductionEventType[]>([]);
  const [selectedFemale, setSelectedFemale] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<ReproductionEventType | null>(null);
  const [dateEvent, setDateEvent] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [cout, setCout] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const bottomSheetRef = useRef<Modalize>(null);

  const filteredFemales = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return females;
    return females.filter((female: any) => 
      `${female.nom || ''} ${female.numero_identification || ''}`.toLowerCase().includes(query)
    );
  }, [females, search]);

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
      const { getLocalAnimals } = await import('../../../database/repositories/animalRepository');
      
      const [types, femalesData, categoriesData] = await Promise.all([
        getLocalTypeEvenements(),
        getLocalAnimals(farm.id),
        getLocalCategories(),
      ]);
      
      console.log('[AddReproductionEventScreen] Loaded type_evenements:', types.length);
      console.log('[AddReproductionEventScreen] All types:', types.map((t: any) => t.nom_type));
      
      // Filtrer les types reproductifs uniquement
      const reproductionTypes = types.filter((type: any) => 
        type.categorie === 'REPRODUCTION'
      );
      
      console.log('[AddReproductionEventScreen] Filtered reproduction types:', reproductionTypes.map((t: any) => t.nom_type));
      
      setEventTypes(reproductionTypes);
      setFemales(femalesData.filter((a: any) => a.sexe === 'femelle' && a.statut === 'ACTIF'));
      setCategories(categoriesData);
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError(e.message || 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleFemalePress = (female: any) => {
    setSelectedFemale(female);
    setSelectedType(null);
    setShowForm(false);
    bottomSheetRef.current?.open();
  };

  const handleTypePress = (type: ReproductionEventType) => {
    setSelectedType(type);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!selectedFemale || !selectedType || !dateEvent) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        throw new Error('Aucune ferme active');
      }
      
      // Use local repository for offline-first pattern
      const { createReproductionEvent } = await import('../../../database/repositories/reproductionRepository');
      const eventId = await createReproductionEvent({
        farm_id: farm.id,
        animal_id: selectedFemale.id,
        type_evenement_id: selectedType.id,
        date_evenement: dateEvent.toISOString().split('T')[0],
        description: description || undefined,
        cout: cout ? Number(cout) : undefined,
      });

      // Create transaction if cost > 0 (offline-first support)
      if (cout && Number(cout) > 0) {
        const user = await authStorage.getUser();
        const userId = user?.id;

        // Get categorieId for FRAIS_REPRODUCTION from loaded categories
        const fraisReproductionCategory = categories.find(
          (cat: any) => cat.nom_categorie === 'FRAIS_REPRODUCTION'
        );
        const categorieId = fraisReproductionCategory?.id;

        const { creerTransactionDepuisEvenement } = await import('../../../services/evenementTransactionService');
        await creerTransactionDepuisEvenement({
          evenementId: eventId,
          farmId: farm.id,
          animalId: selectedFemale.id,
          cout: Number(cout),
          dateEvenement: dateEvent.toISOString(),
          categorieId: categorieId,
          userId: userId,
        });
      }

      // Reset form
      setDescription('');
      setCout('');
      setDateEvent(undefined);
      setSelectedFemale(null);
      setSelectedType(null);
      setShowForm(false);
      bottomSheetRef.current?.close();

      // Navigate to Reproduction tab using reset to ensure proper navigation
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never, params: { screen: 'Reproduction' as never } as never }],
      });
    } catch (e: any) {
      setError(e.message || 'Échec de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBottomSheetClose = () => {
    setSelectedFemale(null);
    setSelectedType(null);
    setShowForm(false);
    setDescription('');
    setCout('');
    setDateEvent(undefined);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Ajouter événement" 
        subtitle="Sélectionnez une femelle" 
        showBackground 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      <View style={styles.content}>
        {error && <View style={styles.errorBanner}><AppText style={styles.errorText}>{error}</AppText></View>}
        
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#757575" />
          <TextInput 
            value={search} 
            onChangeText={setSearch} 
            placeholder="Rechercher une femelle" 
            style={styles.searchInput} 
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {filteredFemales.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="cow" size={48} color="#BDBDBD" />
                <AppText style={styles.emptyText} color="#757575">Aucune femelle trouvée</AppText>
              </View>
            ) : (
              filteredFemales.map((female) => (
                <TouchableOpacity
                  key={female.id}
                  style={styles.femaleCard}
                  onPress={() => handleFemalePress(female)}
                >
                  <View style={styles.femaleMain}>
                    <MaterialCommunityIcons name="cow" size={24} color="#2E7D32" />
                    <View style={styles.femaleInfo}>
                      <AppText style={styles.femaleName}>{female.nom || 'Sans nom'}</AppText>
                      <AppText style={styles.femaleMeta}>{female.numero_identification || 'Sans identification'}</AppText>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      <Modalize
        ref={bottomSheetRef}
        adjustToContentHeight
        modalStyle={styles.bottomSheetModal}
        handleStyle={styles.bottomSheetHandle}
        onClose={handleBottomSheetClose}
      >
        <View style={styles.bottomSheetContent}>
          {!showForm ? (
            <>
              <AppText style={styles.bottomSheetTitle}>Type d'événement pour {selectedFemale?.nom}</AppText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeScrollContent}
              >
                {eventTypes.map((type) => {
                  const config = TYPE_CONFIG[type.nom_type] || { icon: 'information', color: '#757575' };
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={styles.typeChip}
                      onPress={() => handleTypePress(type)}
                    >
                      <View style={[styles.typeChipIcon, { backgroundColor: config.color + '20' }]}>
                        <MaterialCommunityIcons name={config.icon} size={24} color={config.color} />
                      </View>
                      <AppText style={styles.typeChipText}>{type.nom_type}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              <AppText style={styles.bottomSheetTitle}>Détails de l'événement</AppText>
              
              <View style={styles.selectedInfo}>
                <AppText style={styles.selectedLabel}>Femelle</AppText>
                <AppText style={styles.selectedValue}>{selectedFemale?.nom}</AppText>
                
                <AppText style={styles.selectedLabel}>Type</AppText>
                <View style={styles.selectedType}>
                  <MaterialCommunityIcons 
                    name={TYPE_CONFIG[selectedType?.nom_type || '']?.icon || 'information'} 
                    size={20} 
                    color={TYPE_CONFIG[selectedType?.nom_type || '']?.color || '#757575'} 
                  />
                  <AppText style={styles.selectedTypeText}>{selectedType?.nom_type}</AppText>
                </View>
              </View>

              <AppText style={styles.label}>Date *</AppText>
              <AppDateTimePicker 
                value={dateEvent} 
                onChange={(_: any, formatted: string) => setDateEvent(new Date(formatted.split('/').reverse().join('-')))} 
                placeholder="Sélectionner une date" 
              />
              
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
                  title="Retour" 
                  onPress={() => setShowForm(false)} 
                  style={styles.cancelButton} 
                />
                <AppButton 
                  title={submitting ? 'Enregistrement...' : 'Enregistrer'} 
                  onPress={handleSubmit} 
                  disabled={submitting} 
                  style={styles.submitButton} 
                />
              </View>
            </>
          )}
        </View>
      </Modalize>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { flex: 1, padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, borderRadius: 12, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, paddingVertical: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 16, fontSize: 16 },
  femaleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  femaleMain: { flexDirection: 'row', alignItems: 'center' },
  femaleInfo: { marginLeft: 10, flex: 1 },
  femaleName: { fontWeight: '700', fontSize: 16 },
  femaleMeta: { color: '#757575', fontSize: 14, marginTop: 2 },
  errorBanner: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 10 },
  errorText: { color: '#C62828' },
  bottomSheetModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF' },
  bottomSheetHandle: { backgroundColor: '#E0E0E0', width: 40, height: 4 },
  bottomSheetContent: { paddingHorizontal: 16, paddingVertical: 20 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  typeScrollContent: { paddingVertical: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  typeChipIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  typeChipText: { fontSize: 16, fontWeight: '600' },
  selectedInfo: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 16 },
  selectedLabel: { fontSize: 12, color: '#757575', marginBottom: 4 },
  selectedValue: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  selectedType: { flexDirection: 'row', alignItems: 'center' },
  selectedTypeText: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', marginTop: 16, gap: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5' },
  submitButton: { flex: 1 },
});

export default AddReproductionEventScreen;

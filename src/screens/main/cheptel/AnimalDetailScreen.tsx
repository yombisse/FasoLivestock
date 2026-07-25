import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import AppBottomSheet, { BottomSheetOption, AppBottomSheetRef } from '../../../components/AppBottomSheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';
import database from '../../../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { useTypeEvenements } from '../../../hooks/useTypeEvenements';
import { getRappels, calculateJoursRestants, getUrgenceColor } from '../../../database/repositories/rappelRepository';

type AnimalDetailRouteProp = RouteProp<CheptelStackParamList, 'AnimalDetail'>;
type AnimalDetailNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalDetail'>;

const AnimalDetailScreen = ({navigation,route}) => {
  
  const { animalId } = route.params;
  const insets = useSafeAreaInsets();

  const [animal, setAnimal] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFullScreenImage, setShowFullScreenImage] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [rappels, setRappels] = useState<any[]>([]);
  const actionSheetRef = useRef<AppBottomSheetRef>(null);

  // WatermelonDB hook for type evenements
  const { typeEvenements, loading: loadingTypes } = useTypeEvenements();

  const loadAnimal = async () => {
    try {
      setLoading(true);
      const animalRecord = await database.get('animals').find(animalId);
      console.log('[AnimalDetail] Animal loaded:', animalRecord.id);
      console.log('[AnimalDetail] _status:', (animalRecord as any)._status);
      console.log('[AnimalDetail] All fields:', {
        id: animalRecord.id,
        nom: animalRecord.nom,
        statut: animalRecord.statut,
        _status: (animalRecord as any)._status,
      });

      // Load relations using fetch() for WatermelonDB
      let espece = null;
      let farm = null;
      let mother = null;
      let lot = null;

      try {
        if (animalRecord.espece) {
          espece = await animalRecord.espece.fetch();
        }
      } catch (e) {
        console.warn('[AnimalDetail] Failed to load espece:', e);
      }

      // Load farm manually using farm_id since there's no relation in the model
      try {
        const farmId = animalRecord.farm_id;
        if (farmId) {
          const farms = await database.get('farms').query(Q.where('id', farmId)).fetch();
          if (farms.length > 0) {
            farm = farms[0];
          }
        }
      } catch (e) {
        console.warn('[AnimalDetail] Failed to load farm:', e);
      }

      // Load mother if mother_id exists
      try {
        const motherId = animalRecord.mother_id;
        if (motherId) {
          const mothers = await database.get('animals').query(Q.where('id', motherId)).fetch();
          if (mothers.length > 0) {
            mother = mothers[0];
          }
        }
      } catch (e) {
        console.warn('[AnimalDetail] Failed to load mother:', e);
      }

      // Load lot if lot_id exists
      try {
        const lotId = animalRecord.lot_id;
        if (lotId) {
          const lots = await database.get('lots').query(Q.where('id', lotId)).fetch();
          if (lots.length > 0) {
            lot = lots[0];
          }
        }
      } catch (e) {
        console.warn('[AnimalDetail] Failed to load lot:', e);
      }

      console.log('[AnimalDetail] Relations loaded:', {
        espece: espece?._raw || espece,
        farm: farm?._raw || farm,
        mother: mother?._raw || mother,
        lot: lot?._raw || lot,
      });

      // Create animal object with loaded relations
      const animalWithRelations = {
        ...animalRecord._raw,
        espece: espece?._raw ? { id: espece._raw.id, nom: espece._raw.nom } : null,
        farm: farm?._raw ? { id: farm._raw.id, name: farm._raw.name } : null,
        mother: mother?._raw ? { id: mother._raw.id, nom: mother._raw.nom } : null,
        lot: lot?._raw ? { id: lot._raw.id, nom_lot: lot._raw.nom_lot } : null,
      };

      setAnimal(animalWithRelations);

      // Load rappels for this animal
      const farmId = (animalRecord as any).farm_id;
      if (farmId) {
        const animalRappels = await getRappels(farmId, animalId);
        setRappels(animalRappels);
      }
    } catch (err: any) {
      console.error('Error loading animal:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter type evenements to only show MOUVEMENT type
  const movementTypeEvenements = typeEvenements.filter(
    (type: any) => type.categorie === 'MOUVEMENT'
  );

  const handleEdit = () => {
    navigation.navigate('AnimalForm', { animalId });
  };

  const handleActions = () => {
    actionSheetRef.current?.present();
  };

  const handleTypeEvenementSelection = (typeEvenement: any) => {
    actionSheetRef.current?.dismiss();
    
    // Navigate based on type evenement name
    const nomType = typeEvenement.nom_type.toLowerCase();
    
    if (nomType.includes('transfert')) {
      navigation.navigate('AnimalTransfert', { animalId, typeEvenementId: typeEvenement.id });
    } else if (nomType.includes('vente')) {
      navigation.navigate('AnimalVente', { animalId, typeEvenementId: typeEvenement.id });
    } else if (nomType.includes('deces') || nomType.includes('décès')) {
      navigation.navigate('AnimalDeces', { animalId, typeEvenementId: typeEvenement.id });
    } else if (nomType.includes('perte')) {
      navigation.navigate('AnimalPerte', { animalId, typeEvenementId: typeEvenement.id });
    } else if (nomType.includes('abattage')) {
      navigation.navigate('AnimalAbattage', { animalId, typeEvenementId: typeEvenement.id });
    } else {
      // Default: create event directly for other movement types
      Alert.alert('Info', `Type d'événement ${typeEvenement.nom_type} non encore implémenté`);
    }
  };

  const handleHistorique = () => {
    actionSheetRef.current?.dismiss();
    navigation.navigate('AnimalHistorique', { animalId });
  };

  const actionSheetOptions: BottomSheetOption[] = [
    // Dynamic movement type evenements
    ...movementTypeEvenements.map((type) => ({
      id: type.id,
      label: type.nom_type,
      icon: 'swap-horizontal',
      iconColor: '#30A15E',
      onPress: () => handleTypeEvenementSelection(type),
    })),
    // Static options
    { id: 'historique', label: 'Voir l\'historique', icon: 'history', iconColor: '#1976D2', onPress: handleHistorique },
  ];

  // Load animal on mount
  React.useEffect(() => {
    loadAnimal();
  }, [animalId]);

  // Couleurs avatar par espèce
  const getAvatarColor = (especeNom?: string) => {
    if (!especeNom) return '#BDBDBD';
    const espece = especeNom.toLowerCase();
    if (espece.includes('bovin')) return '#795548';
    if (espece.includes('ovin')) return '#90A4AE';
    if (espece.includes('caprin')) return '#FF8F00';
    if (espece.includes('porcin')) return '#F48FB1';
    if (espece.includes('volaille')) return '#FDD835';
    return '#BDBDBD';
  };

  // Badge statut
  const getStatusBadge = (statut?: string) => {
    if (!statut) return null;
    const status = statut.toUpperCase();
    let backgroundColor = '#F5F5F5';
    let textColor = '#757575';

    if (status === 'SAIN') {
      backgroundColor = '#E8F5E9';
      textColor = '#2E7D32';
    } else if (status === 'VENDU') {
      backgroundColor = '#E3F2FD';
      textColor = '#1565C0';
    } else if (status === 'DÉCÉDÉ' || status === 'DECÉDÉ') {
      backgroundColor = '#FFEBEE';
      textColor = '#C62828';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <AppText style={styles.statusText} color={textColor} fontSize={12} fontWeight="600">
          {status}
        </AppText>
      </View>
    );
  };
  const getSyncIndicator = (syncStatus?: string) => {
      console.log('[AnimalDetail] getSyncIndicator called with:', syncStatus);
      // WatermelonDB uses _status internally: 'created', 'updated', 'deleted', or undefined/null for synced
      if (!syncStatus) {
        // No status means synced with server
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#2E7D32" />
            <AppText style={styles.syncText} color="#2E7D32" fontSize={12}>
              Synchronisé
            </AppText>
          </View>
        );
      }
      switch (syncStatus) {
        case 'created':
        case 'updated':
          return (
            <View style={styles.syncIndicator}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#F57C00" />
              <AppText style={styles.syncText} color="#F57C00" fontSize={12}>
                En attente
              </AppText>
            </View>
          );
        case 'deleted':
          return (
            <View style={styles.syncIndicator}>
              <MaterialCommunityIcons name="delete-outline" size={16} color="#757575" />
              <AppText style={styles.syncText} color="#757575" fontSize={12}>
                Supprimé
              </AppText>
            </View>
          );
        default:
          return null;
      }
    };

  // Styles dynamiques
  const imageSectionStyle = {
    height: 300,
    marginTop: -insets.top,
  };

  // Calculer l'âge
  const calculateAge = (dateNaissance?: string) => {
    if (!dateNaissance) return 'Inconnu';
    const birth = new Date(dateNaissance);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mois`;
    return `${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Détail animal"
          showBackground={true}
          showMenuButton={true}
          onMenuPress={() => (navigation as any).openDrawer()}
        />
        <View style={styles.loadingContainer}>
          <AppText color="#757575">Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !animal) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Détail animal"
          showBackground={true}
          showMenuButton={true}
          onMenuPress={() => (navigation as any).openDrawer()}
        />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#D32F2F" />
          <AppText style={styles.errorTitle} fontWeight="bold">
            Erreur
          </AppText>
          <AppText style={styles.errorText} color="#757575">
            {error?.message || error?.toString() || 'Animal non trouvé'}
          </AppText>
          <AppButton
            title="Réessayer"
            onPress={loadAnimal}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header réduit transparent */}
      <View style={[styles.miniHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleEdit}>
          <MaterialCommunityIcons name="pencil" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Image en grand */}
        <View style={imageSectionStyle}>
          {animal.photo ? (
            <TouchableOpacity onPress={() => setShowFullScreenImage(true)} activeOpacity={0.8}>
              <Image source={{ uri: animal.photo }} style={styles.largeImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.largeImage,
                styles.largeImagePlaceholder,
                { backgroundColor: getAvatarColor(animal.espece?.nom) },
              ]}
            >
              <AppText style={styles.avatarLargeText}>
                {animal.espece?.nom?.charAt(0) || '?'}
              </AppText>
            </View>
          )}
        </View>

        {/* Infos en bas */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <AppText style={styles.animalName} fontWeight="bold">
              {animal.nom}
            </AppText>
            {animal.numero_identification && (
              <AppText style={styles.animalId} color="#757575">
                #{animal.numero_identification}
              </AppText>
            )}
            <View style={styles.headerBadges}>
              {getStatusBadge(animal.statut)}
              {getSyncIndicator((animal as any)._status)}
            </View>
          </View>

          {/* Identification */}
          <View style={styles.section}>
          <AppText style={styles.sectionTitle} fontWeight="bold">
            Identification
          </AppText>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Espèce
            </AppText>
            <AppText style={styles.value}>{animal.espece?.nom || 'Non renseigné'}</AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Race
            </AppText>
            <AppText style={styles.value}>{animal.race || 'Non renseigné'}</AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Numéro
            </AppText>
            <AppText style={styles.value}>
              {animal.numero_identification || 'Non renseigné'}
            </AppText>
          </View>
        </View>

        {/* Caractéristiques */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle} fontWeight="bold">
            Caractéristiques
          </AppText>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Sexe
            </AppText>
            <AppText style={styles.value}>
              {animal.sexe === 'male' ? 'Mâle' : 'Femelle'}
            </AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Poids
            </AppText>
            <AppText style={styles.value}>
              {animal.poids ? `${animal.poids} kg` : 'Non renseigné'}
            </AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Date de naissance
            </AppText>
            <AppText style={styles.value}>
              {animal.date_naissance || 'Non renseigné'}
            </AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Âge
            </AppText>
            <AppText style={styles.value}>{calculateAge(animal.date_naissance)}</AppText>
          </View>
        </View>

        {/* Origine */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle} fontWeight="bold">
            Origine
          </AppText>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Type
            </AppText>
            <AppText style={styles.value}>
              {animal.origine === 'naissance' ? 'Né sur place' : animal.origine === 'achat' ? 'Acheté' : 'Enregistrement'}
            </AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Ferme actuelle
            </AppText>
            <AppText style={styles.value}>{animal.farm?.name || 'Non renseigné'}</AppText>
          </View>
          {animal.origine === 'achat' && animal.farm_source_id && (
            <View style={styles.sectionRow}>
              <AppText style={styles.label} color="#757575">
                Ferme d'origine
              </AppText>
              <AppText style={styles.value}>ID: {animal.farm_source_id}</AppText>
            </View>
          )}
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Mère
            </AppText>
            <AppText style={styles.value}>
              {animal.mother?.nom || 'Non renseigné'}
            </AppText>
          </View>
          <View style={styles.sectionRow}>
            <AppText style={styles.label} color="#757575">
              Lot
            </AppText>
            <AppText style={styles.value}>{animal.lot?.nom_lot || 'Non renseigné'}</AppText>
          </View>
        </View>

        {/* Liens placeholder */}

        <TouchableOpacity style={styles.linkItem} onPress={handleHistorique} activeOpacity={0.8}>
          <View style={styles.linkIconActive}>
            <MaterialCommunityIcons name="swap-horizontal" size={24} color="#1976D2" />
          </View>
          <View style={styles.linkContent}>
            <AppText style={styles.linkTitle} fontWeight="bold">
              Mouvements
            </AppText>
            <AppText style={styles.linkSubtitle} color="#757575" fontSize={12}>
              Voir l'historique des mouvements
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#1976D2" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => navigation.navigate('AnimalSanteHistorique', { animalId })} 
          activeOpacity={0.8}
        >
          <View style={[styles.linkIconActive, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#2E7D32" />
          </View>
          <View style={styles.linkContent}>
            <AppText style={styles.linkTitle} fontWeight="bold">
              Santé
            </AppText>
            <AppText style={styles.linkSubtitle} color="#757575" fontSize={12}>
              Voir l'historique sanitaire
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#2E7D32" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => navigation.navigate('AnimalReproductionHistorique', { animalId })} 
          activeOpacity={0.8}
        >
          <View style={[styles.linkIconActive, { backgroundColor: '#F3E5F5' }]}>
            <MaterialCommunityIcons name="reproduction" size={24} color="#7B1FA2" />
          </View>
          <View style={styles.linkContent}>
            <AppText style={styles.linkTitle} fontWeight="bold">
              Reproduction
            </AppText>
            <AppText style={styles.linkSubtitle} color="#757575" fontSize={12}>
              Voir l'historique reproductif
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#7B1FA2" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => navigation.navigate('AnimalTransactionHistorique', { animalId })} 
          activeOpacity={0.8}
        >
          <View style={[styles.linkIconActive, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="cash" size={24} color="#F57C00" />
          </View>
          <View style={styles.linkContent}>
            <AppText style={styles.linkTitle} fontWeight="bold">
              Transactions
            </AppText>
            <AppText style={styles.linkSubtitle} color="#757575" fontSize={12}>
              Voir l'historique transactionnel
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#F57C00" />
        </TouchableOpacity>

        {/* Section Rappels */}
        {rappels.length > 0 && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle} fontWeight="bold">
              Rappels
            </AppText>
            {rappels.map((rappel, index) => {
              const jours = calculateJoursRestants(rappel.date_prevue);
              const color = getUrgenceColor(rappel);
              return (
                <View key={index} style={[styles.rappelCard, { borderLeftColor: color }]}>
                  <View style={[styles.rappelIconCircle, { backgroundColor: color + '20' }]}>
                    <MaterialCommunityIcons name="bell" size={20} color={color} />
                  </View>
                  <View style={styles.rappelContent}>
                    <AppText style={styles.rappelTitle}>{rappel.type_rappel}</AppText>
                    <AppText style={styles.rappelDetail}>
                      {rappel.statut === 'EN_RETARD' ? `En retard depuis ${Math.abs(jours)} jour${Math.abs(jours) > 1 ? 's' : ''}` : jours === 0 ? "Aujourd'hui" : `Dans ${jours} jour${jours > 1 ? 's' : ''}`} — {rappel.date_prevue}
                    </AppText>
                    {rappel.note && (
                      <AppText style={styles.rappelNote} color="#757575" fontSize={11}>
                        {rappel.note}
                      </AppText>
                    )}
                  </View>
                  <View style={[styles.rappelStatusBadge, { backgroundColor: color + '20' }]}>
                    <AppText style={[styles.rappelStatusText, { color }]} fontSize={11} fontWeight="600">
                      {rappel.statut === 'EN_RETARD' ? 'Retard' : rappel.statut === 'REALISE' ? 'Réalisé' : 'En attente'}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <AppButton
            title="Modifier"
            onPress={handleEdit}
            style={styles.actionButton}
          />
          {animal?.statut?.toUpperCase() === 'SAIN' && (
            <AppButton
              title="Actions"
              onPress={handleActions}
              style={styles.actionButton}
            />
          )}
        </View>
        </View>
      </ScrollView>

      {/* Modal image plein écran */}
      <Modal
        visible={showFullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullScreenImage(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowFullScreenImage(false)}
          >
            <MaterialCommunityIcons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: animal?.photo }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* AppBottomSheet Actions */}
      <AppBottomSheet
        ref={actionSheetRef}
        options={actionSheetOptions}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    height: 300,
  },
  largeImage: {
    width: '100%',
    height: '100%',
  },
  largeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
    minHeight: 400,
  },
  infoHeader: {
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: 32,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 20,
    color: '#212121',
    marginBottom: 4,
  },
  animalId: {
    fontSize: 14,
    marginBottom: 8,
  },
  headerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontWeight: '600',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  syncText: {
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  linkItemDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    marginBottom: 12,
    opacity: 0.7,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkIconActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
  },
  rappelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rappelIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rappelContent: {
    flex: 1,
  },
  rappelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  rappelDetail: {
    fontSize: 12,
    color: '#757575',
  },
  rappelNote: {
    marginTop: 2,
  },
  rappelStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rappelStatusText: {
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  archiveButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});

export default AnimalDetailScreen;

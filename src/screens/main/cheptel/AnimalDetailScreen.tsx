import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AppHeader from '../../../components/AppHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import animalService from '../../../services/animal.service';
import { Animal } from '../../../types/animal.types';
import { CheptelStackParamList } from '../../../navigation/stack/CheptelStack';

type AnimalDetailRouteProp = RouteProp<CheptelStackParamList, 'AnimalDetail'>;
type AnimalDetailNavigationProp = StackNavigationProp<CheptelStackParamList, 'AnimalDetail'>;

const AnimalDetailScreen = () => {
  const navigation = useNavigation<AnimalDetailNavigationProp>();
  const route = useRoute<AnimalDetailRouteProp>();
  const { animalId } = route.params;

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnimal = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await animalService.getAnimal(animalId);
      setAnimal(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'animal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnimal();
  }, [animalId]);

  const handleEdit = () => {
    navigation.navigate('AnimalForm', { animalId });
  };

  const handleArchive = () => {
    Alert.alert(
      'Archiver l\'animal',
      'Êtes-vous sûr de vouloir archiver cet animal ? Cette action est réversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: async () => {
            try {
              await animalService.archiveAnimal(animalId);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Erreur lors de l\'archivage');
            }
          },
        },
      ]
    );
  };

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

    if (status === 'ACTIF') {
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

  // Indicateur sync
  const getSyncIndicator = (syncStatus?: string) => {
    if (!syncStatus) return null;
    switch (syncStatus) {
      case 'synced':
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#2E7D32" />
            <AppText style={styles.syncText} color="#2E7D32" fontSize={12}>
              Synchronisé
            </AppText>
          </View>
        );
      case 'pending':
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#F57C00" />
            <AppText style={styles.syncText} color="#F57C00" fontSize={12}>
              En attente
            </AppText>
          </View>
        );
      case 'conflict':
        return (
          <View style={styles.syncIndicator}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#D32F2F" />
            <AppText style={styles.syncText} color="#D32F2F" fontSize={12}>
              Conflit
            </AppText>
          </View>
        );
      default:
        return null;
    }
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
            {error || 'Animal non trouvé'}
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
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Détail animal"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />

      <ScrollView style={styles.content}>
        {/* En-tête */}
        <View style={styles.headerSection}>
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: getAvatarColor(animal.espece?.nom) },
            ]}
          >
            <AppText style={styles.avatarLargeText}>
              {animal.espece?.nom?.charAt(0) || '?'}
            </AppText>
          </View>
          <View style={styles.headerInfo}>
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
              {getSyncIndicator(animal.sync_status)}
            </View>
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
              Ferme
            </AppText>
            <AppText style={styles.value}>{animal.farm?.name || 'Non renseigné'}</AppText>
          </View>
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
            <AppText style={styles.value}>{animal.lot?.nom || 'Non renseigné'}</AppText>
          </View>
        </View>

        {/* Liens placeholder */}
        <TouchableOpacity style={styles.linkItem} disabled>
          <View style={styles.linkIcon}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#BDBDBD" />
          </View>
          <View style={styles.linkContent}>
            <AppText style={styles.linkTitle} color="#BDBDBD" fontWeight="bold">
              Santé
            </AppText>
            <AppText style={styles.linkSubtitle} color="#BDBDBD" fontSize={12}>
              Disponible prochainement
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} disabled>
          <View style={styles.linkIcon}>
            <MaterialCommunityIcons name="swap-horizontal" size={24} color="#BDBDBD" />
          </View>
          <View style={styles.linkContent}>
            <AppText style={styles.linkTitle} color="#BDBDBD" fontWeight="bold">
              Mouvements
            </AppText>
            <AppText style={styles.linkSubtitle} color="#BDBDBD" fontSize={12}>
              Disponible prochainement
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          <AppButton
            title="Modifier"
            onPress={handleEdit}
            style={styles.actionButton}
          />
          <AppButton
            title="Archiver"
            onPress={handleArchive}
            style={styles.archiveButton}
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
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
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
});

export default AnimalDetailScreen;

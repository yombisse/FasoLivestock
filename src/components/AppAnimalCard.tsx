import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import AppStatutBadge from './AppStatutBadge';
import { Animal } from '../types/animal.types';

interface AppAnimalCardProps {
  animal: Animal;
  onPress: (animal: Animal) => void;
}

const AppAnimalCard = ({ animal, onPress }: AppAnimalCardProps) => {
  const getAvatarColor = (especeNom?: string) => {
    if (!especeNom) return '#BDBDBD';
    const espece = especeNom.toLowerCase();
    if (espece.includes('bovin') || espece.includes('vache')) return '#FF7043';
    if (espece.includes('ovin') || espece.includes('mouton')) return '#7986CB';
    if (espece.includes('caprin') || espece.includes('chèvre')) return '#4DB6AC';
    if (espece.includes('porcin') || espece.includes('cochon')) return '#F06292';
    if (espece.includes('volaille') || espece.includes('poule')) return '#FDD835';
    return '#BDBDBD';
  };

  return (
    <TouchableOpacity
      style={styles.animalCard}
      onPress={() => onPress(animal)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {animal.photo ? (
          <Image source={{ uri: animal.photo }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: getAvatarColor(animal.espece?.nom) },
            ]}
          >
            <AppText style={styles.avatarText}>{animal.espece?.nom?.charAt(0) || '?'}</AppText>
          </View>
        )}
      </View>
      <View style={styles.animalInfo}>
        <View style={styles.animalHeader}>
          <AppText style={styles.animalName} fontWeight="bold">
            {animal.nom}
          </AppText>
          <AppStatutBadge statut={animal.statut} />
        </View>
        {animal.numero_identification && (
          <AppText style={styles.animalId} color="#757575">
            #{animal.numero_identification}
          </AppText>
        )}
        <View style={styles.animalDetails}>
          <AppText style={styles.animalDetail} color="#757575">
            {animal.espece?.nom || 'Espèce inconnue'}
          </AppText>
          <AppText style={styles.animalDetail} color="#757575">
            • {animal.sexe === 'male' ? 'Mâle' : 'Femelle'}
          </AppText>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  animalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  animalInfo: {
    flex: 1,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  animalName: {
    fontSize: 16,
    color: '#333333',
  },
  animalId: {
    fontSize: 12,
    marginBottom: 4,
  },
  animalDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  animalDetail: {
    fontSize: 13,
  },
});

export default AppAnimalCard;

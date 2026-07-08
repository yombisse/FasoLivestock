import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ListItemCard, { ListItemCardProps } from './ListItemCard';
import { getAnimalStatusColor } from '../../config/colors';
import { Animal } from '../../types/animal.types';

export interface AnimalListItemProps {
  animal: Animal;
  onPress?: (animal: Animal) => void;
  isActive?: boolean;
}

const AnimalListItem: React.FC<AnimalListItemProps> = ({ animal, onPress, ...props }) => {
  // Get species icon
  const getSpeciesIcon = (especeNom?: string) => {
    if (!especeNom) return 'cow';
    const espece = especeNom.toLowerCase();
    if (espece.includes('bovin')) return 'cow';
    if (espece.includes('ovin')) return 'sheep';
    if (espece.includes('caprin')) return 'goat';
    if (espece.includes('porcin')) return 'pig';
    if (espece.includes('volaille')) return 'chicken';
    return 'cow';
  };

  // Get species color for avatar background
  const getSpeciesColor = (especeNom?: string) => {
    if (!especeNom) return '#BDBDBD';
    const espece = especeNom.toLowerCase();
    if (espece.includes('bovin')) return '#795548';
    if (espece.includes('ovin')) return '#90A4AE';
    if (espece.includes('caprin')) return '#FF8F00';
    if (espece.includes('porcin')) return '#F48FB1';
    if (espece.includes('volaille')) return '#FDD835';
    return '#BDBDBD';
  };

  const statusColors = getAnimalStatusColor(animal.statut);
  const speciesIcon = getSpeciesIcon(animal.espece?.nom);
  const speciesColor = getSpeciesColor(animal.espece?.nom);

  const footer = animal.poids ? (
    <View style={styles.footerContent}>
      <AppText style={styles.footerLabel} color="#757575" fontSize={12}>
        Poids
      </AppText>
      <AppText style={styles.footerValue} fontWeight="600" fontSize={12}>
        {animal.poids} kg
      </AppText>
    </View>
  ) : null;

  const rightContent = <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />;

  return (
    <ListItemCard
      icon={speciesIcon}
      iconColor="#fff"
      iconBackgroundColor={speciesColor}
      title={animal.nom}
      subtitle={animal.numero_identification ? `#${animal.numero_identification}` : animal.espece?.nom}
      badge={
        animal.statut
          ? {
              label: animal.statut.toUpperCase(),
              color: statusColors.text,
              backgroundColor: statusColors.background,
            }
          : undefined
      }
      imageUri={animal.photo || undefined}
      footer={footer}
      rightContent={rightContent}
      onPress={() => onPress?.(animal)}
      accessibilityLabel={`Animal ${animal.nom}, statut ${animal.statut}`}
      isActive={props.isActive}
    />
  );
};

const styles = StyleSheet.create({
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLabel: {
    marginRight: 8,
  },
  footerValue: {
    color: '#212121',
  },
});

export default AnimalListItem;

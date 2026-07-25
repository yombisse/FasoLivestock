import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '../AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ListItemCard, { ListItemCardProps } from './ListItemCard';
import { getAnimalStatusColor } from '../../config/colors';
import { Animal } from '../../types/animal.types';

export interface AnimalListItemProps {
  animal: Animal;
  onPress?: (animal: Animal) => void;
  onEdit?: (animal: Animal) => void;
  isActive?: boolean;
  healthStatus?: string;
}

const AnimalListItem: React.FC<AnimalListItemProps> = ({ animal, onPress, onEdit, healthStatus, ...props }) => {
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

  // Use healthStatus if provided, otherwise use animal.statut
  const badgeStatus = healthStatus || animal.statut;
  const statusColors = getAnimalStatusColor(badgeStatus);
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

  const rightContent = (
    <View style={styles.actionButtons}>
      {onEdit && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={(e) => {
            e.stopPropagation();
            onEdit(animal);
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#1976D2" />
        </TouchableOpacity>
      )}
      <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
    </View>
  );

  const subtitle = animal.espece?.nom || animal.numero_identification
    ? `${animal.espece?.nom || ''} ${animal.numero_identification ? '#' + animal.numero_identification : ''}`.trim()
    : undefined;

  return (
    <ListItemCard
      icon={speciesIcon}
      iconColor="#fff"
      iconBackgroundColor={speciesColor}
      title={animal.nom}
      subtitle={subtitle}
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
  },
});

export default AnimalListItem;

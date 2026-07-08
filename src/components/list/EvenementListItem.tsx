import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ListItemCard from './ListItemCard';
import { getHealthEventColor, getReproductionEventColor } from '../../config/colors';

export interface EvenementListItemProps {
  event: any;
  eventType: 'SANTE' | 'REPRODUCTION' | 'MOUVEMENT';
  onPress?: (event: any) => void;
}

const EvenementListItem: React.FC<EvenementListItemProps> = ({ event, eventType, onPress }) => {
  const getEventIcon = (type: string, category: string) => {
    if (category === 'SANTE') {
      switch (type) {
        case 'VACCINATION':
          return 'syringe';
        case 'TRAITEMENT':
          return 'pill';
        case 'MALADIE':
          return 'alert-circle';
        case 'CONTROLE':
          return 'stethoscope';
        default:
          return 'medical-bag';
      }
    } else if (category === 'REPRODUCTION') {
      switch (type) {
        case 'SAILLIE':
          return 'gender-male-female';
        case 'GESTATION':
          return 'baby-carriage';
        case 'MISE_BAS':
          return 'baby-face';
        case 'CHALEUR':
          return 'fire';
        case 'INSPEMINATION':
          return 'test-tube';
        default:
          return 'reproduction';
      }
    } else {
      // MOUVEMENT
      switch (type) {
        case 'ACHAT':
          return 'cart';
        case 'VENTE':
          return 'tag';
        case 'TRANSFERT':
          return 'swap-horizontal';
        case 'NAISSANCE':
          return 'baby-face';
        case 'DECES':
          return 'skull-crossbones';
        case 'PERTE':
          return 'help-circle';
        default:
          return 'swap-horizontal';
      }
    }
  };

  const getEventColor = (type: string, category: string) => {
    if (category === 'SANTE') {
      return getHealthEventColor(type);
    } else if (category === 'REPRODUCTION') {
      return getReproductionEventColor(type);
    }
    // Default for MOUVEMENT
    return { background: '#E3F2FD', text: '#1976D2' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const eventIcon = getEventIcon(event.type_evenement || event.type, eventType);
  const colors = getEventColor(event.type_evenement || event.type, eventType);
  const eventLabel = event.type_nom || event.description || 'Événement';

  const footer = (
    <View style={styles.footerContent}>
      <AppText style={styles.footerDate} color="#757575" fontSize={12}>
        {formatDate(event.date_evenement || event.date)}
      </AppText>
      {event.cout && (
        <>
          <AppText style={styles.footerSeparator} color="#9E9E9E" fontSize={12}>
            •
          </AppText>
          <AppText style={styles.footerCost} color="#757575" fontSize={12}>
            Coût: {formatAmount(event.cout)}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <ListItemCard
      icon={eventIcon}
      iconColor={colors.text}
      iconBackgroundColor={`${colors.text}20`}
      title={eventLabel}
      footer={footer}
      onPress={() => onPress?.(event)}
      accessibilityLabel={`Événement ${eventLabel} du ${formatDate(event.date_evenement || event.date)}`}
    />
  );
};

const styles = StyleSheet.create({
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDate: {
    fontSize: 12,
  },
  footerSeparator: {
    marginHorizontal: 4,
  },
  footerCost: {
    fontSize: 12,
  },
});

export default EvenementListItem;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';

interface AppStatutBadgeProps {
  statut?: string;
}

const AppStatutBadge = ({ statut }: AppStatutBadgeProps) => {
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
  } else if (status === 'DÉCÉDÉ' || status === 'DECÉDÉ' || status === 'MORT') {
    backgroundColor = '#FFEBEE';
    textColor = '#C62828';
  } else if (status === 'PERDU') {
    backgroundColor = '#FFF3E0';
    textColor = '#E65100';
  } else if (status === 'ABATTU') {
    backgroundColor = '#F3E5F5';
    textColor = '#7B1FA2';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <AppText style={styles.statusText} color={textColor} fontSize={12} fontWeight="600">
        {status}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    textTransform: 'uppercase',
  },
});

export default AppStatutBadge;

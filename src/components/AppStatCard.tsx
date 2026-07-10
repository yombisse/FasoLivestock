import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

interface AppStatCardProps {
  icon: string;
  iconColor: string;
  value: number;
  label: string;
}

const AppStatCard = ({ icon, iconColor, value, label }: AppStatCardProps) => {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <AppText style={styles.statNumber}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
});

export default AppStatCard;

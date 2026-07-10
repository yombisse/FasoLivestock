import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

interface AppActionButtonProps {
  icon: string;
  iconColor: string;
  label: string;
  onPress: () => void;
}

const AppActionButton = ({ icon, iconColor, label, onPress }: AppActionButtonProps) => {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: iconColor + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <AppText style={styles.actionLabel}>{label}</AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#212121',
    textAlign: 'center',
  },
});

export default AppActionButton;

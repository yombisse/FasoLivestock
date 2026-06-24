import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';

const HomeScreen = () => {
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      setActiveFarm(farm);
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Tableau de bord"
        showBackground={true}
        showMenuButton={true}
      />
      <View style={styles.content}>
        <AppText style={styles.title} fontWeight="bold">
          Tableau de bord
        </AppText>
        {activeFarm && (
          <AppText style={styles.farmName} color="#757575">
            Ferme active: {activeFarm.name}
          </AppText>
        )}
      </View>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#212121',
    marginBottom: 8,
  },
  farmName: {
    fontSize: 16,
  },
});

export default HomeScreen;

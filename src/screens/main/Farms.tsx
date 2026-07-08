import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppImage from '../../components/AppImage';
import { authStorage } from '../../storage/authStorage';
import farmService from '../../services/farm.service';

interface FarmsProps {
  navigation: NavigationProp<any>;
}

const Farms: React.FC<FarmsProps> = ({ navigation }) => {
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await authStorage.clearAuth();
    navigation.reset({
      index: 0,
      routes: [{ name: 'AuthStack' }],
    });
  };

  const loadFarms = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getFarms } = await import('../../database/repositories/farmRepository');
      const data = await getFarms();
      setFarms(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des fermes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, []);


  const renderFarm = ({item}: any) => (
    <TouchableOpacity 
      style={styles.farmCard}
      onPress={() => navigation.navigate('FarmDetail', { farmId: item.id })}
      activeOpacity={0.8}
    >
      <Image 
        source={item.image ? { uri: item.image } : require('../../assets/images/farm-placeholder.png')}
        style={styles.farmImage}
        resizeMode="cover"
      />
      <View style={styles.farmOverlay}>
        <View style={styles.farmInfo}>
          <AppText style={styles.farmName}>{item.name}</AppText>
          <AppText style={styles.farmLocation}>{item.location || 'Non renseigné'}</AppText>
          <AppText style={styles.farmAnimals}>{item.animals_count || 0} animaux</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader 
          title="Mes élevages"
          subtitle="Gérez vos fermes"
          showBackground={true}
          showMenuButton={true}
          onMenuPress={() => (navigation as any).openDrawer()}
          showLogoutButton={true}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <AppText color="#757575">Chargement...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader 
          title="Mes élevages"
          subtitle="Gérez vos fermes"
          showBackground={true}
          showMenuButton={true}
          onMenuPress={() => (navigation as any).openDrawer()}
          showLogoutButton={true}
          onLogoutPress={handleLogout}
        />
        <View style={styles.errorContainer}>
          <AppText style={styles.errorText} color="#D32F2F">{error}</AppText>
          <AppButton 
            title="Réessayer"
            onPress={loadFarms}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Mes élevages"
        subtitle="Gérez vos fermes"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
        showLogoutButton={true}
        onLogoutPress={handleLogout}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <AppButton 
            title="+ Ajouter un élevage"
            onPress={() => navigation.navigate('AddFarm')}
            style={styles.addButton}
          />
          <FlatList
            data={farms}
            renderItem={renderFarm}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  addButton: {
    marginBottom: 20,
  },
  farmCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
    height: 180,
    overflow: 'hidden',
  },
  farmImage: {
    width: '100%',
    height: '100%',
  },
  farmOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  farmLocation: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  farmAnimals: {
    fontSize: 12,
    color: '#fff',
  },
});

export default Farms;

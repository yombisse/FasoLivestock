import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import farmService from '../../services/farm.service';
import { farmStorage } from '../../storage/farmStorage';
import { authStorage } from '../../storage/authStorage';
import { Farm } from '../../types/farm.types';

const FarmPickerScreen = () => {
  const navigation = useNavigation();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string>('');

  const loadFarms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmService.getFarms();
      setFarms(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des fermes');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const user = await authStorage.getUser();
      if (user) {
        setUserFullName(user.fullName || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadActiveFarm = async () => {
    try {
      const activeFarm = await farmStorage.getActiveFarm();
      if (activeFarm) {
        setActiveFarmId(activeFarm.id);
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  const handleFarmSelect = async (farm: Farm) => {
    try {
      await farmStorage.setActiveFarm(farm);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainDrawer' }],
        })
      );
    } catch (error) {
      console.error('Error selecting farm:', error);
      setError('Erreur lors de la sélection de la ferme');
    }
  };

  const handleLogout = async () => {
    try {
      // Ignorer les erreurs réseau lors de la déconnexion
      await authStorage.clearAuth();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        })
      );
    } catch (error) {
      console.error('Error during logout:', error);
      // Forcer la déconnexion même en cas d'erreur
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        })
      );
    }
  };

  useEffect(() => {
    loadUserData();
    loadActiveFarm();
    loadFarms();
  }, []);

  const renderFarmCard = (farm: Farm) => {
    const isActive = farm.id === activeFarmId;
    return (
      <TouchableOpacity
        key={farm.id}
        style={[styles.farmCard, isActive && styles.farmCardActive]}
        onPress={() => handleFarmSelect(farm)}
        activeOpacity={0.7}
      >
        <View style={styles.farmCardHeader}>
          <View style={styles.farmIconContainer}>
            <MaterialCommunityIcons name="barn" size={32} color="#2E7D32" />
          </View>
          <View style={styles.farmInfo}>
            <AppText style={styles.farmName} fontWeight="bold">
              {farm.name}
            </AppText>
            {farm.location && (
              <AppText style={styles.farmLocation} color="#757575">
                {farm.location}
              </AppText>
            )}
          </View>
          {isActive && (
            <MaterialCommunityIcons name="check-circle" size={24} color="#2E7D32" />
          )}
        </View>
        {farm.description && (
          <AppText style={styles.farmDescription} color="#757575">
            {farm.description}
          </AppText>
        )}
        <View style={styles.farmFooter}>
          <View
            style={[
              styles.statusBadge,
              farm.status === 'active' && styles.statusBadgeActive,
            ]}
          >
            <AppText
              style={[
                styles.statusText,
                farm.status === 'active' && styles.statusTextActive,
              ]}
              fontSize={12}
            >
              {farm.status}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Sélectionnez votre ferme"
          showBackground={true}
          showLogoutButton={true}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <AppText style={styles.loadingText} color="#757575">
            Chargement des fermes...
          </AppText>
          <AppButton
            title="Annuler et se déconnecter"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Sélectionnez votre ferme"
          showBackground={true}
          showLogoutButton={true}
          onLogoutPress={handleLogout}
        />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#D32F2F" />
          <AppText style={styles.errorTitle} fontWeight="bold">
            Erreur
          </AppText>
          <AppText style={styles.errorText} color="#757575">
            {error}
          </AppText>
          <AppButton
            title="Réessayer"
            onPress={loadFarms}
            style={styles.errorButton}
          />
          <AppButton
            title="Se déconnecter"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (farms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Sélectionnez votre ferme"
          showBackground={true}
          showLogoutButton={true}
          onLogoutPress={handleLogout}
        />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="barn" size={64} color="#BDBDBD" />
          <AppText style={styles.emptyTitle} fontWeight="bold">
            Aucune ferme assignée
          </AppText>
          <AppText style={styles.emptyText} color="#757575">
            Contactez votre administrateur pour obtenir l'accès à une ferme.
          </AppText>
          <AppButton
            title="Réessayer"
            onPress={loadFarms}
            style={styles.emptyButton}
          />
          <AppButton
            title="Se déconnecter"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Sélectionnez votre ferme"
        subtitle={userFullName ? `Bonjour ${userFullName}` : undefined}
        showBackground={true}
        showLogoutButton={true}
        onLogoutPress={handleLogout}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <AppText style={styles.subtitle} color="#757575">
          Sélectionnez la ferme que vous souhaitez gérer
        </AppText>

        {farms.map(renderFarmCard)}

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#D32F2F" />
            <AppText style={styles.logoutText} color="#D32F2F">
              Déconnexion
            </AppText>
          </TouchableOpacity>
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  farmCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  farmCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  farmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 2,
  },
  farmLocation: {
    fontSize: 14,
  },
  farmDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  farmFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    color: '#757575',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#2E7D32',
  },
  logoutContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FarmPickerScreen;

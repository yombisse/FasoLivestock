import React, { useState, useEffect, useRef } from 'react';
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
import AppImage from '../../components/AppImage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import farmService from '../../services/farm.service';
import { farmStorage } from '../../storage/farmStorage';
import { authStorage } from '../../storage/authStorage';
import { Farm } from '../../types/farm.types';
import { fullSync, initialSync } from '../../sync/syncService';
import { getFarms } from '../../database/repositories/farmRepository';
import { syncEvents } from '../../sync/syncEvents';
import NetInfo from '@react-native-community/netinfo';

const FarmPickerScreen = () => {
  const navigation = useNavigation();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const loadFarmsInProgress = useRef(false);

  const loadFarms = async () => {
    // Prevent concurrent loadFarms calls
    if (loadFarmsInProgress.current) {
      console.log('[FarmPickerScreen] loadFarms already in progress, skipping');
      return;
    }
    
    loadFarmsInProgress.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      const user = await authStorage.getUser();
      if (!user) {
        throw new Error('User not found');
      }

      // Check connection status
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected ?? false);

      // Try local storage first (offline-first)
      const localFarms = await getFarms();
      console.log(`[FarmPickerScreen] DEBUG: Local storage returned ${localFarms.length} farms`);

      if (localFarms.length > 0) {
        // Use local data immediately
        setFarms(localFarms);
        console.log(`[FarmPickerScreen] DEBUG: Using local data - setFarms called with ${localFarms.length} farms`);
        
        // Trigger initialSync in background if online (non-blocking)
        if (netInfo.isConnected) {
          console.log('[FarmPickerScreen] DEBUG: Triggering background initial sync');
          initialSync().catch(err => {
            console.warn('[FarmPickerScreen] Background initial sync failed:', err);
          });
        }
      } else if (netInfo.isConnected) {
        // No local data and online: trigger initial sync
        console.log('[FarmPickerScreen] DEBUG: No local data, triggering initial sync');
        try {
          await initialSync();
          
          // After initial sync, try loading farms again
          const syncedFarms = await getFarms();
          setFarms(syncedFarms);
          console.log(`[FarmPickerScreen] DEBUG: After initial sync - setFarms called with ${syncedFarms.length} farms`);
          
          if (syncedFarms.length === 0) {
            setError('Aucune ferme disponible après synchronisation. Contactez votre administrateur.');
          }
        } catch (syncError: any) {
          console.error('[FarmPickerScreen] Initial sync failed:', syncError);
          setError('Échec de la synchronisation initiale. Vérifiez votre connexion et réessayez.');
        }
      } else {
        // No local data and offline
        setError('Aucune ferme stockée localement. Connexion requise pour la première synchronisation.');
      }
    } catch (err: any) {
      console.error('Error loading farms:', err);
      setError(err.message || 'Erreur lors du chargement des fermes');
    } finally {
      setLoading(false);
      loadFarmsInProgress.current = false;
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
      // Set active farm locally
      await farmStorage.setActiveFarm(farm);

      // Navigate to main screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainDrawer' }],
        })
      );

      // Trigger sync in background after navigation
      setSyncing(true);
      setError(null);

      try {
        console.log('[FarmPicker] Starting background sync for farm:', farm.id);
        await fullSync(farm.id, true);
        console.log('[FarmPicker] Background sync completed successfully');
      } catch (syncError: any) {
        console.error('[FarmPicker] Background sync failed:', syncError);
        setError('Synchronisation en arrière-plan échouée. Les données seront synchronisées ultérieurement.');
      } finally {
        setSyncing(false);
      }
    } catch (error) {
      console.error('Error selecting farm:', error);
      setError('Erreur lors de la sélection de la ferme');
      setSyncing(false);
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

  // Subscribe to sync events to refresh data when sync completes
  // Only subscribe to full sync events (background syncs), not initial sync
  useEffect(() => {
    const unsubscribeFull = syncEvents.subscribe('sync:full:completed', () => {
      console.log('[FarmPickerScreen] Sync full completed event received, reloading farms');
      loadFarms();
    });

    return () => {
      unsubscribeFull();
    };
  }, []);

  const renderFarmCard = (farm: Farm) => {
    const isActive = farm.id === activeFarmId;
    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Jamais synchronisé';
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    
    return (
      <TouchableOpacity
        key={farm.id}
        style={[styles.farmCard, isActive && styles.farmCardActive]}
        onPress={() => handleFarmSelect(farm)}
        activeOpacity={0.7}
      >
        {/* Farm Image or Icon */}
        <View style={styles.farmImageContainer}>
          {farm.photo ? (
            <AppImage 
              source={{ uri: farm.photo }} 
              style={styles.farmImage}
            />
          ) : (
            <View style={styles.farmIconPlaceholder}>
              <MaterialCommunityIcons name="barn" size={48} color="#2E7D32" />
            </View>
          )}
          {isActive && (
            <View style={styles.activeBadge}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            </View>
          )}
        </View>

        {/* Farm Info */}
        <View style={styles.farmInfoContainer}>
          <AppText style={styles.farmName} fontWeight="bold" numberOfLines={1}>
            {farm.name}
          </AppText>
          {farm.location && (
            <AppText style={styles.farmLocation} color="#757575" numberOfLines={1}>
              {farm.location}
            </AppText>
          )}
          <View style={styles.syncBadge}>
            <MaterialCommunityIcons 
              name={isOnline ? 'cloud-check' : 'cloud-off-outline'} 
              size={12} 
              color={isOnline ? '#4CAF50' : '#FF9800'} 
            />
            <AppText style={styles.syncText} fontSize={10} color="#757575">
              {formatDate(farm.last_sync_at)}
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

  if (syncing) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Synchronisation"
          subtitle="Récupération des données..."
          showBackground={true}
          showLogoutButton={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <AppText style={styles.loadingText} color="#757575">
            Synchronisation en cours...
          </AppText>
          <AppText style={styles.syncSubText} color="#9E9E9E" fontSize={12}>
            Première synchronisation pour charger vos données
          </AppText>
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
  syncSubText: {
    marginTop: 8,
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
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  farmCardActive: {
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  farmImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E8F5E9',
    position: 'relative',
  },
  farmImage: {
    width: '100%',
    height: '100%',
  },
  farmIconPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 4,
  },
  farmInfoContainer: {
    padding: 12,
  },
  farmName: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 4,
  },
  farmLocation: {
    fontSize: 14,
    marginBottom: 8,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    marginLeft: 4,
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

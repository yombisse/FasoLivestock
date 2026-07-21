import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../../../storage/authStorage';
import { farmStorage } from '../../../storage/farmStorage';
import { Farm } from '../../../types/farm.types';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { syncWatermelon } from '../../../sync/watermelonSync';
import { useSyncStatus } from '../../../hooks/useSyncStatus';
import { Theme } from '../../../config/colors';

const { width } = Dimensions.get('window');

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const [user, setUser] = useState<any>(null);
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const isConnected = useNetworkStatus();
  const { pendingCount, failedCount } = useSyncStatus(activeFarm?.id || '');

  const loadUserData = async () => {
    try {
      const userData = await authStorage.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      setActiveFarm(farm);
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  const handleManualSync = async () => {
    if (!activeFarm || syncing) return;

    try {
      setSyncing(true);
      const result = await syncWatermelon(activeFarm.id);
      if (result.success) {
        console.log('[CustomDrawerContent] Manual sync completed');
      } else {
        console.error('[CustomDrawerContent] Manual sync failed:', result.error);
      }
    } catch (error) {
      console.error('[CustomDrawerContent] Manual sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authStorage.clearAuth();
      props.navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        })
      );
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleChangeFarm = () => {
    props.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'FarmPicker' }],
      })
    );
  };

  const navigateToScreen = (screenName: string) => {
    try {
      props.navigation.closeDrawer();
      // Navigate to specific tab in MainTabs
      if (screenName === 'Home') {
        props.navigation.navigate('MainTabs', { screen: 'Home' });
      } else if (screenName === 'Cheptel') {
        props.navigation.navigate('MainTabs', { screen: 'Cheptel' });
      } else if (screenName === 'Reproduction') {
        props.navigation.navigate('MainTabs', { screen: 'Reproduction' });
      } else if (screenName === 'Sante') {
        props.navigation.navigate('MainTabs', { screen: 'Sante' });
      } else if (screenName === 'Finance') {
        props.navigation.navigate('MainTabs', { screen: 'Finance' });
      } else if (screenName === 'SyncConflicts') {
        props.navigation.navigate('SyncConflicts');
      } else {
        props.navigation.navigate('MainTabs');
      }
    } catch (error) {
      console.error('Error navigating:', error);
    }
  };

  useEffect(() => {
    loadUserData();
    loadActiveFarm();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderNavItem = (
    label: string,
    icon: string,
    screenName: string,
    isActive: boolean,
    uniqueKey: string
  ) => (
    <TouchableOpacity
      key={uniqueKey}
      style={[styles.navItem, isActive && styles.navItemActive]}
      onPress={() => navigateToScreen(screenName)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={isActive ? '#2E7D32' : '#757575'}
      />
      <AppText
        style={[styles.navItemText, isActive && styles.navItemTextActive]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );

  const renderSecondaryItem = (label: string, icon: string, onPress: () => void) => (
    <TouchableOpacity
      style={styles.secondaryItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={24} color="#757575" />
      <AppText style={styles.secondaryItemText}>{label}</AppText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <AppText style={styles.avatarText}>
            {user ? getInitials(user.fullName) : 'U'}
          </AppText>
        </View>
        <View style={styles.userInfo}>
          <AppText style={styles.userName} fontWeight="bold">
            {user?.fullName || 'Utilisateur'}
          </AppText>
          <AppText style={styles.userEmail} color="#FFFFFF">
            {user?.email || ''}
          </AppText>
          {activeFarm && (
            <View style={styles.farmInfo}>
              <MaterialCommunityIcons name="barn" size={16} color="#66BB6A" />
              <AppText style={styles.farmName} color="#66BB6A">
                {activeFarm.name}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Navigation principale */}
        <View style={styles.navSection}>
          {renderNavItem('Accueil', 'home', 'Home', props.state.index === 0, 'home')}
          {renderNavItem('Cheptel', 'cow', 'Cheptel', props.state.index === 1, 'cheptel')}
          {renderNavItem('Reproduction', 'gender-male-female', 'Reproduction', props.state.index === 2, 'reproduction')}
          {renderNavItem('Santé', 'medical-bag', 'Sante', props.state.index === 3, 'sante')}
          {renderNavItem('Finance', 'cash', 'Finance', props.state.index === 4, 'finance')}
        </View>

        {/* Section secondaire */}
        <View style={styles.divider} />

        {/* Sync status and manual sync button */}
        <View style={styles.syncSection}>
          <View style={styles.syncStatusRow}>
            <MaterialCommunityIcons
              name={isConnected ? 'cloud-check' : 'cloud-off-outline'}
              size={20}
              color={isConnected ? '#4CAF50' : '#FF9800'}
            />
            <AppText style={styles.syncStatusText}>
              {isConnected ? 'En ligne' : 'Hors ligne'}
            </AppText>
          </View>

          {(pendingCount > 0 || failedCount > 0) && (
            <View style={styles.syncCountsRow}>
              {pendingCount > 0 && (
                <View style={styles.syncCountBadge}>
                  <AppText style={styles.syncCountText}>{pendingCount} en attente</AppText>
                </View>
              )}
              {failedCount > 0 && (
                <View style={[styles.syncCountBadge, styles.syncCountBadgeError]}>
                  <AppText style={styles.syncCountText}>{failedCount} échoué(s)</AppText>
                </View>
              )}
            </View>
          )}

          {isConnected && (pendingCount > 0 || failedCount > 0) && (
            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleManualSync}
              disabled={syncing}
              activeOpacity={0.7}
            >
              {syncing ? (
                <ActivityIndicator size={20} color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="sync" size={20} color="#FFFFFF" />
                  <AppText style={styles.syncButtonText}>Synchroniser</AppText>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />
        <View style={styles.secondarySection}>
          {renderSecondaryItem('Changer de ferme', 'swap-horizontal', handleChangeFarm)}
          {renderSecondaryItem('Conflits de sync', 'alert-circle', () => navigateToScreen('SyncConflicts'))}
          {renderSecondaryItem('Aide', 'help-circle', () => {})}
        </View>
      </ScrollView>

      {/* Bouton déconnexion */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#D32F2F" />
          <AppText style={styles.logoutText} color="#D32F2F">
            Déconnexion
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.white,
  },
  header: {
    backgroundColor: Theme.primary,
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 8,
  },
  userName: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  farmInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  farmName: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  navSection: {
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navItemActive: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  navItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#757575',
  },
  navItemTextActive: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  secondarySection: {
    paddingVertical: 8,
  },
  secondaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  secondaryItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#757575',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  syncSection: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  syncCountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  syncCountBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  syncCountBadgeError: {
    backgroundColor: '#FFEBEE',
  },
  syncCountText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  syncButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CustomDrawerContent;

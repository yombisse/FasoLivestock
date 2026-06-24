import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import AppText from '../../../components/AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../../../storage/authStorage';
import { farmStorage } from '../../../storage/farmStorage';
import { Farm } from '../../../types/farm.types';

const { width } = Dimensions.get('window');

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const [user, setUser] = useState<any>(null);
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);

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
    props.navigation.navigate(screenName);
    props.navigation.closeDrawer();
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
    isActive: boolean
  ) => (
    <TouchableOpacity
      key={screenName}
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
          {renderNavItem('Accueil', 'home', 'Home', props.state.index === 0)}
          {renderNavItem('Cheptel', 'cow', 'Cheptel', props.state.index === 1)}
          {renderNavItem('Alimentation', 'leaf', 'Alimentation', props.state.index === 2)}
          {renderNavItem('Santé', 'medical-bag', 'Sante', props.state.index === 3)}
        </View>

        {/* Section secondaire */}
        <View style={styles.divider} />
        <View style={styles.secondarySection}>
          {renderSecondaryItem('Changer de ferme', 'swap-horizontal', handleChangeFarm)}
          {renderSecondaryItem('Paramètres', 'cog', () => {})}
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
    backgroundColor: '#FFFFFF',
    width: width * 0.8,
  },
  header: {
    backgroundColor: '#2E7D32',
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
});

export default CustomDrawerContent;

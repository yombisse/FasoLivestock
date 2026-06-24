import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import AppText from './AppText';
import AppButton from './AppButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../storage/authStorage';

const CustomDrawer = (props: DrawerContentComponentProps) => {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await authStorage.getUser();
    setUser(userData);
  };

  const menuItems = [
    { id: 1, title: 'Tableau de bord', icon: 'home', screen: 'Dashboard' },
    { id: 2, title: 'Mes élevages', icon: 'barn', screen: 'Farms' },
    { id: 3, title: 'Mes animaux', icon: 'cow', screen: 'Animals' },
    { id: 4, title: 'Rapports', icon: 'chart-bar', screen: 'Reports' },
    { id: 5, title: 'Paramètres', icon: 'cog', screen: 'Settings' },
    { id: 6, title: 'Aide', icon: 'help-circle', screen: 'Help' },
  ];

  const handleMenuPress = (screen: string) => {
    props.navigation.navigate(screen);
    props.navigation.closeDrawer();
  };

  const handleLogout = async () => {
    await authStorage.clearAuth();
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  const currentRoute = props.state.routeNames[props.state.index];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { backgroundColor: '#2E7D32' }]}>
          <View style={styles.avatarContainer}>
            <AppText style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AppText>
          </View>
          <AppText style={styles.userName}>{user?.name || 'Utilisateur'}</AppText>
          <AppText style={styles.userEmail}>{user?.email || ''}</AppText>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => {
            const isActive = currentRoute === item.screen;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleMenuPress(item.screen)}
              >
                <MaterialCommunityIcons 
                  name={item.icon} 
                  size={24} 
                  color={isActive ? '#2E7D32' : '#757575'} 
                  style={styles.menuIcon} 
                />
                <AppText 
                  style={styles.menuTitle}
                  color={isActive ? '#2E7D32' : '#212121'}
                  fontWeight={isActive ? '600' : '500'}
                >
                  {item.title}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color="#fff" style={styles.logoutIcon} />
          <AppText style={styles.logoutText}>Se déconnecter</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  menuItemActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
  },
  logoutIcon: {
    marginRight: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default CustomDrawer;

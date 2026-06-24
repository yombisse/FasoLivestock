import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppImage from '../../components/AppImage';
import { authStorage } from '../../storage/authStorage';

const Profile = () => {
  const navigation = useNavigation();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await authStorage.getUser();
    setUser(userData);
  };

  const handleLogout = async () => {
    await authStorage.clearAuth();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Mon profil"
        subtitle="Gérez vos informations"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <AppText style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AppText>
            </View>
            <AppText style={styles.userName}>{user?.name || 'Utilisateur'}</AppText>
            <AppText style={styles.userEmail}>{user?.email || ''}</AppText>
          </View>

          <View style={styles.menuContainer}>
            <View style={styles.menuItem}>
              <AppText style={styles.menuItemText}>Informations personnelles</AppText>
            </View>
            <View style={styles.menuItem}>
              <AppText style={styles.menuItemText}>Paramètres</AppText>
            </View>
            <View style={styles.menuItem}>
              <AppText style={styles.menuItemText}>Notifications</AppText>
            </View>
            <View style={styles.menuItem}>
              <AppText style={styles.menuItemText}>Aide</AppText>
            </View>
          </View>

          <AppButton 
            title="Se déconnecter"
            onPress={handleLogout}
            style={styles.logoutButton}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
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
    color: '#212121',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#757575',
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
  },
});

export default Profile;

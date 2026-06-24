import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppImage from '../../components/AppImage';

const Dashboard = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Tableau de bord"
        subtitle="Bienvenue sur FasoLivestock"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <AppText style={styles.statNumber}>12</AppText>
              <AppText style={styles.statLabel}>Animaux</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText style={styles.statNumber}>5</AppText>
              <AppText style={styles.statLabel}>Élevages</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText style={styles.statNumber}>3</AppText>
              <AppText style={styles.statLabel}>Rapports</AppText>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <AppButton 
              title="Ajouter un animal"
              onPress={() => navigation.navigate('AddAnimal')}
              style={styles.actionButton}
            />
            <AppButton 
              title="Voir mes élevages"
              onPress={() => navigation.navigate('Farms')}
              style={styles.actionButton}
            />
            <AppButton 
              title="Rapports"
              onPress={() => navigation.navigate('Reports')}
              style={styles.actionButton}
            />
          </View>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});

export default Dashboard;

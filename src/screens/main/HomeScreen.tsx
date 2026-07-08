import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';
import { getDashboard } from '../../services/dashboard.service';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      setActiveFarm(farm);
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        setError('Aucune ferme active sélectionnée');
        return;
      }

      // Use local repositories for offline-first pattern
      const { getLocalAnimals } = await import('../../database/repositories/animalRepository');
      const { getDatabase } = await import('../../database/connection');
      
      const animals = await getLocalAnimals(farm.id);
      const db = await getDatabase();
      
      // Get stats from local database
      const totalAnimals = animals.length;
      const activeAnimals = animals.filter((a: any) => a.statut === 'ACTIF').length;
      
      const result = await db.execute(
        `SELECT COUNT(*) as count FROM evenements WHERE farm_id = ? AND deleted_at IS NULL`,
        [farm.id]
      );
      const totalEvents = result?.rows?.item(0)?.count || 0;
      
      setDashboardData({
        total_animaux: totalAnimals,
        animaux_actifs: activeAnimals,
        total_evenements: totalEvents,
        animaux_males: animals.filter((a: any) => a.sexe === 'male').length,
        animaux_femelles: animals.filter((a: any) => a.sexe === 'femelle').length,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveFarm();
    loadDashboard();
  }, []);

  const formatCachedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Tableau de bord"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
        source={require('../../assets/images/home.png')}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {activeFarm && (
            <AppText style={styles.farmName} color="#757575">
              Ferme active: {activeFarm.name}
            </AppText>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <AppText color="#757575">Chargement...</AppText>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AppText style={styles.errorText} color="#D32F2F">{error}</AppText>
              <AppButton title="Réessayer" onPress={loadDashboard} style={styles.retryButton} />
            </View>
          ) : dashboardData ? (
            <>
              {fromCache && cachedAt && (
                <View style={styles.cacheBadge}>
                  <AppText style={styles.cacheBadgeText} fontSize={12} color="#757575">
                    Données du {formatCachedDate(cachedAt)}
                  </AppText>
                </View>
              )}

              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <AppText style={styles.statNumber}>{dashboardData.cheptel?.total || 0}</AppText>
                  <AppText style={styles.statLabel}>Animaux</AppText>
                </View>
                <View style={styles.statCard}>
                  <AppText style={styles.statNumber}>{dashboardData.global?.active_farms || 0}</AppText>
                  <AppText style={styles.statLabel}>Élevages</AppText>
                </View>
                <View style={styles.statCard}>
                  <AppText style={styles.statNumber}>{dashboardData.alertes?.count || 0}</AppText>
                  <AppText style={styles.statLabel}>Alertes</AppText>
                </View>
              </View>
            </>
          ) : null}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#212121',
    marginBottom: 8,
  },
  farmName: {
    fontSize: 16,
    marginBottom: 16,
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  cacheBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cacheBadgeText: {
    textAlign: 'center',
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
});

export default HomeScreen;

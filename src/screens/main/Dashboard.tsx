import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppImage from '../../components/AppImage';
import { getDashboard } from '../../services/dashboard.service';
import { farmStorage } from '../../storage/farmStorage';

const Dashboard = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

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
      
      const db = await getDatabase();
      
      // Get active animals count directly from database (statut = 'ACTIF' AND deleted_at IS NULL)
      const activeAnimalsResult = await db.execute(
        `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND statut = 'ACTIF' AND deleted_at IS NULL`,
        [farm.id]
      );
      const activeAnimals = activeAnimalsResult?.rows?.[0]?.count || 0;
      
      // Get total animals count
      const totalAnimalsResult = await db.execute(
        `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND deleted_at IS NULL`,
        [farm.id]
      );
      const totalAnimals = totalAnimalsResult?.rows?.[0]?.count || 0;
      
      // Get events count
      const eventsResult = await db.execute(
        `SELECT COUNT(*) as count FROM evenements WHERE farm_id = ? AND deleted_at IS NULL`,
        [farm.id]
      );
      const totalEvents = eventsResult?.rows?.[0]?.count || 0;
      
      // Get gender breakdown
      const malesResult = await db.execute(
        `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND sexe = 'male' AND deleted_at IS NULL`,
        [farm.id]
      );
      const malesCount = malesResult?.rows?.[0]?.count || 0;
      
      const femalesResult = await db.execute(
        `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND sexe = 'femelle' AND deleted_at IS NULL`,
        [farm.id]
      );
      const femalesCount = femalesResult?.rows?.[0]?.count || 0;
      
      setDashboardData({
        total_animaux: totalAnimals,
        animaux_actifs: activeAnimals,
        total_evenements: totalEvents,
        animaux_males: malesCount,
        animaux_femelles: femalesCount,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

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
        subtitle="Bienvenue sur FasoLivestock"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
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
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
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
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});

export default Dashboard;

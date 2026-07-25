import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppImage from '../../components/AppImage';
import { useDashboard } from '../../hooks/useDashboard';
import { farmStorage } from '../../storage/farmStorage';
import database from '../../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

const Dashboard = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  const loadActiveFarm = async () => {
    try {
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        setFarmId(farm.id);
      } else {
        setError('Aucune ferme active sélectionnée');
      }
    } catch (error) {
      console.error('Error loading active farm:', error);
    }
  };

  useEffect(() => {
    loadActiveFarm();
  }, []);

  // Use reactive hook for dashboard data
  const { dashboardData: dbDashboardData, loading: dashboardLoading } = useDashboard(farmId || '');

  useEffect(() => {
    if (dbDashboardData) {
      setDashboardData(dbDashboardData);
    }
  }, [dbDashboardData]);

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

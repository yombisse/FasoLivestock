import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import AppStatCard from '../../components/AppStatCard';
import AppActionButton from '../../components/AppActionButton';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';
import { getDashboardStats } from '../../database/repositories/dashboardRepository';

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
      console.log('[HomeScreen] Active farm:', farm);
      if (!farm) {
        setError('Aucune ferme active sélectionnée');
        return;
      }

      // Use dashboard repository for stats
      const dashboardStats = await getDashboardStats(farm.id);
      console.log('[HomeScreen] Dashboard stats:', dashboardStats);
      setDashboardData(dashboardStats);
    } catch (err: any) {
      console.error('[HomeScreen] Error loading dashboard:', err);
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
                <AppStatCard
                  icon="cow"
                  iconColor="#2E7D32"
                  value={dashboardData.total_animaux || 0}
                  label="Animaux"
                />
                <AppStatCard
                  icon="check-circle"
                  iconColor="#1976D2"
                  value={dashboardData.animaux_actifs || 0}
                  label="Actifs"
                />
                <AppStatCard
                  icon="calendar-clock"
                  iconColor="#F57C00"
                  value={dashboardData.total_evenements || 0}
                  label="Événements"
                />
              </View>
              
              <View style={styles.statsContainer}>
                <AppStatCard
                  icon="gender-male"
                  iconColor="#1976D2"
                  value={dashboardData.animaux_males || 0}
                  label="Mâles"
                />
                <AppStatCard
                  icon="gender-female"
                  iconColor="#E91E63"
                  value={dashboardData.animaux_femelles || 0}
                  label="Femelles"
                />
              </View>

              <AppText style={styles.sectionTitle} fontWeight="bold">Actions rapides</AppText>
              <View style={styles.actionsContainer}>
                <AppActionButton
                  icon="cow"
                  iconColor="#2E7D32"
                  label="Cheptel"
                  onPress={() => (navigation as any).reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never, params: { screen: 'Cheptel' as never } as never }],
                  })}
                />
                <AppActionButton
                  icon="plus-circle"
                  iconColor="#1976D2"
                  label="Ajouter"
                  onPress={() => (navigation as any).reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never, params: { screen: 'Cheptel' as never, params: { screen: 'AnimalForm' as never } as never } as never }],
                  })}
                />
                <AppActionButton
                  icon="medical-bag"
                  iconColor="#F57C00"
                  label="Santé"
                  onPress={() => (navigation as any).reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never, params: { screen: 'Sante' as never } as never }],
                  })}
                />
                <AppActionButton
                  icon="heart-pulse"
                  iconColor="#E91E63"
                  label="Reproduction"
                  onPress={() => (navigation as any).reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never, params: { screen: 'Reproduction' as never } as never }],
                  })}
                />
                <AppActionButton
                  icon="cash"
                  iconColor="#9C27B0"
                  label="Transactions"
                  onPress={() => (navigation as any).reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never, params: { screen: 'Finance' as never } as never }],
                  })}
                />
                <AppActionButton
                  icon="cog"
                  iconColor="#757575"
                  label="Paramètres"
                  onPress={() => (navigation as any).openDrawer()}
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#212121',
    marginTop: 24,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
});

export default HomeScreen;

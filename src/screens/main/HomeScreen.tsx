import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import AppStatCard from '../../components/AppStatCard';
import AppActionButton from '../../components/AppActionButton';
import { farmStorage } from '../../storage/farmStorage';
import { authStorage } from '../../storage/authStorage';
import { Farm } from '../../types/farm.types';
import { getAnimalsBySpecies } from '../../database/repositories/dashboardRepository';
import { getActiveHealthAlerts } from '../../database/repositories/santeEvenementsRepository';
import { getTransactionSummary } from '../../database/repositories/transactionRepository';
import { getActiveGestations } from '../../database/repositories/reproductionRepository';
import { getRappelsEnRetard, getRappelsAVenir, calculateJoursRestants, getUrgenceColor } from '../../database/repositories/rappelRepository';
import { Theme } from '../../config/colors';
import database from '../../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>({
    total_animaux: 0,
    animaux_actifs: 0,
    total_evenements: 0,
    males: 0,
    femelles: 0,
  });
  const [speciesCounts, setSpeciesCounts] = useState<Record<string, number>>({});
  const [healthAlerts, setHealthAlerts] = useState<any[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<{ventes: number, achats: number, ventes_count: number, achats_count: number}>({ventes: 0, achats: 0, ventes_count: 0, achats_count: 0});
  const [gestations, setGestations] = useState<any[]>([]);
  const [rappelsEnRetard, setRappelsEnRetard] = useState<any[]>([]);
  const [rappelsAVenir, setRappelsAVenir] = useState<any[]>([]);
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

  const loadUserName = async () => {
    try {
      const user = await authStorage.getUser();
      if (user) {
        setUserName(user.nom || user.email || '');
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const loadDashboard = async () => {
    console.log('[AUDIT] Dashboard - loadDashboard called');
    try {
      setLoading(true);
      setError(null);

      const farm = await farmStorage.getActiveFarm();
      console.log('[HomeScreen] Active farm:', farm);
      if (!farm) {
        setError('Aucune ferme active sélectionnée');
        return;
      }

      const speciesData = await getAnimalsBySpecies(farm.id);
      setSpeciesCounts(speciesData);

      const healthData = await getActiveHealthAlerts(farm.id);
      setHealthAlerts(healthData);

      const transactionData = await getTransactionSummary(farm.id);
      setTransactionSummary(transactionData);

      const gestationData = await getActiveGestations(farm.id);
      setGestations(gestationData);

      const rappelsRetardData = await getRappelsEnRetard(farm.id);
      setRappelsEnRetard(rappelsRetardData);

      const rappelsAVenirData = await getRappelsAVenir(farm.id, 7);
      setRappelsAVenir(rappelsAVenirData);
      
      console.log('[AUDIT] Dashboard - loadDashboard completed successfully');
    } catch (err: any) {
      console.error('[HomeScreen] Error loading dashboard:', err);
      setError(err.message || 'Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const observeDashboardStats = (farmId: string) => {
    // Observe animals collection for real-time updates
    const animalsCollection = database.get('animals');
    const evenementsCollection = database.get('evenements');
    
    const animalsQuery = animalsCollection.query(Q.where('farm_id', farmId));
    const evenementsQuery = evenementsCollection.query(Q.where('farm_id', farmId));

    const animalsSubscription = animalsQuery.observe().subscribe((animals) => {
      const totalAnimals = animals.length;
      const activeAnimals = animals.filter((animal: any) => {
        const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
        return !excludedStatuses.includes(animal._raw.statut || '');
      });
      const males = animals.filter((animal: any) => animal._raw.sexe === 'male');
      const females = animals.filter((animal: any) => animal._raw.sexe === 'femelle');

      setDashboardData({
        total_animaux: totalAnimals,
        animaux_actifs: activeAnimals.length,
        total_evenements: dashboardData.total_evenements,
        animaux_males: males.length,
        animaux_femelles: females.length,
      });

      // Also update species counts
      getAnimalsBySpecies(farmId).then(setSpeciesCounts);
    });

    const evenementsSubscription = evenementsQuery.observe().subscribe((evenements) => {
      setDashboardData((prev: any) => ({
        ...prev,
        total_evenements: evenements.length,
      }));
    });

    // Return cleanup function
    return () => {
      animalsSubscription.unsubscribe();
      evenementsSubscription.unsubscribe();
    };
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const setupObservation = async () => {
      await loadActiveFarm();
      await loadUserName();
      await loadDashboard();
      
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        cleanup = observeDashboardStats(farm.id);
      }
    };
    
    setupObservation();
    
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      console.error('[HomeScreen] Invalid date string:', dateString);
      return 'Date invalide';
    }
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'fièvre aphteuse': return 'thermometer';
      case 'perte d\'appétit': return 'clock-alert';
      default: return 'medical-bag';
    }
  };

  const getAlertIconColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'fièvre aphteuse': return '#DC3545';
      case 'perte d\'appétit': return '#F4A261';
      default: return Theme.primary;
    }
  };

  const getAlertIconBg = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'fièvre aphteuse': return '#FFE5E5';
      case 'perte d\'appétit': return '#FFF8E5';
      default: return '#D1F2E1';
    }
  };

  const getAlertStatus = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'fièvre aphteuse': return { label: 'En cours', color: '#DC3545', bg: '#FFE5E5' };
      case 'perte d\'appétit': return { label: 'Surveillance', color: '#F4A261', bg: '#FFF8E5' };
      default: return { label: 'En cours', color: '#DC3545', bg: '#FFE5E5' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header vert forêt */}
      <AppHeader
        showBackground={false}
        showMenuButton
        onMenuPress={() => (navigation as any).openDrawer()}
        showRightButton
        rightButtonIcon="bell-outline"
        onRightButtonPress={() => (navigation as any).openDrawer()}
        showNotificationBadge={healthAlerts.length > 0}
        notificationCount={healthAlerts.length}
        style={styles.headerPrimary}
      >
        <View style={styles.userInfo}>
          <AppText style={styles.greetingLabel}>Bonjour,</AppText>
          <AppText style={styles.greetingName}>{userName}</AppText>
          <AppText style={styles.farmInfo}>
            © {activeFarm?.name || 'Ferme active'} · {activeFarm?.location || 'Localisation'}
          </AppText>
        </View>
      </AppHeader>

      {/* Carte stats globales chevauchant le header */}
      <View style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="cow" size={20} color="#2D6A4F" />
            </View>
            <AppText style={styles.statValue}>{dashboardData.total_animaux || 0}</AppText>
            <AppText style={styles.statLabel}>Total</AppText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#1976D2" />
            </View>
            <AppText style={styles.statValue}>{dashboardData.animaux_actifs || 0}</AppText>
            <AppText style={styles.statLabel}>Actifs</AppText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#F57C00" />
            </View>
            <AppText style={styles.statValue}>{dashboardData.total_evenements || 0}</AppText>
            <AppText style={styles.statLabel}>Événements</AppText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="gender-male" size={20} color="#1976D2" />
            </View>
            <AppText style={styles.statValue}>{dashboardData.animaux_males || 0}</AppText>
            <AppText style={styles.statLabel}>Mâles</AppText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FCE4EC' }]}>
              <MaterialCommunityIcons name="gender-female" size={20} color="#E91E63" />
            </View>
            <AppText style={styles.statValue}>{dashboardData.animaux_femelles || 0}</AppText>
            <AppText style={styles.statLabel}>Femelles</AppText>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

             
              {/* Section Alertes Santé */}
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Alertes santé</AppText>
                <TouchableOpacity>
                  <AppText style={styles.seeAll}>Voir tout</AppText>
                </TouchableOpacity>
              </View>

              {healthAlerts.length > 0 ? (
                healthAlerts.map((alert, index) => {
                  const status = getAlertStatus(alert.type_evenement);
                  return (
                    <View key={index} style={styles.alertCard}>
                      <View style={[styles.alertIconCircle, { backgroundColor: getAlertIconBg(alert.type_evenement) }]}>
                        <MaterialCommunityIcons 
                          name={getAlertIcon(alert.type_evenement)} 
                          size={20} 
                          color={getAlertIconColor(alert.type_evenement)} 
                        />
                      </View>
                      <View style={styles.alertContent}>
                        <AppText style={styles.alertTitle}>{alert.animal_nom || 'Animal inconnu'}</AppText>
                        <AppText style={styles.alertDetail}>
                          {alert.type_nom || alert.type} — {formatDate(alert.date_evenement)}
                        </AppText>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <AppText style={[styles.statusBadgeText, { color: status.color }]}>
                          {status.label}
                        </AppText>
                      </View>
                    </View>
                  );
                })
              ) : (
                <AppText style={styles.emptyText}>Aucune alerte santé récente</AppText>
              )}

              {/* Section Bilan Transactions */}
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Bilan transactions</AppText>
                <TouchableOpacity>
                  <AppText style={styles.seeAll}>Voir tout</AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.transactionRow}>
                <View style={[styles.transactionCard, styles.transactionCardGreen]}>
                  <View style={styles.transactionIconRow}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="#2D6A4F" />
                    <AppText style={styles.transactionLabelGreen}>Ventes</AppText>
                  </View>
                  <AppText style={styles.transactionValueGreen}>
                    {new Intl.NumberFormat('fr-FR').format(transactionSummary.ventes)} FCFA
                  </AppText>
                  <AppText style={styles.transactionSub}>{transactionSummary.ventes_count || 0} transaction(s)</AppText>
                </View>
                <View style={[styles.transactionCard, styles.transactionCardRed]}>
                  <View style={styles.transactionIconRow}>
                    <MaterialCommunityIcons name="trending-down" size={16} color="#DC3545" />
                    <AppText style={styles.transactionLabelRed}>Achats</AppText>
                  </View>
                  <AppText style={styles.transactionValueRed}>
                    {new Intl.NumberFormat('fr-FR').format(transactionSummary.achats)} FCFA
                  </AppText>
                  <AppText style={styles.transactionSubRed}>{transactionSummary.achats_count || 0} transaction(s)</AppText>
                </View>
              </View>

              {/* Section Gestations */}
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Gestations en cours</AppText>
                <TouchableOpacity>
                  <AppText style={styles.seeAll}>Voir tout</AppText>
                </TouchableOpacity>
              </View>

              {gestations.length > 0 ? (
                gestations.map((gestation, index) => (
                  <View key={index} style={styles.alertCard}>
                    <View style={[styles.alertIconCircle, { backgroundColor: '#F3E5F5' }]}>
                      <MaterialCommunityIcons name="reproduction" size={20} color="#7B1FA2" />
                    </View>
                    <View style={styles.alertContent}>
                      <AppText style={styles.alertTitle}>{gestation.animal_nom || 'Gestation'}</AppText>
                      <AppText style={styles.alertDetail}>
                        Gestation — {formatDate(gestation.date_evenement)}
                      </AppText>
                    </View>
                  </View>
                ))
              ) : (
                <AppText style={styles.emptyText}>Aucune gestation en cours</AppText>
              )}

              {/* Section Rappels */}
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Rappels</AppText>
                <TouchableOpacity>
                  <AppText style={styles.seeAll}>Voir tout</AppText>
                </TouchableOpacity>
              </View>

              {rappelsEnRetard.length > 0 ? (
                <View style={styles.rappelSection}>
                  <AppText style={styles.rappelSubtitle} color="#D32F2F" fontWeight="bold">En retard</AppText>
                  {rappelsEnRetard.slice(0, 3).map((rappel, index) => (
                    <View key={index} style={[styles.alertCard, { borderLeftColor: '#D32F2F' }]}>
                      <View style={[styles.alertIconCircle, { backgroundColor: '#FFEBEE' }]}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
                      </View>
                      <View style={styles.alertContent}>
                        <AppText style={styles.alertTitle}>{rappel.type_rappel}</AppText>
                        <AppText style={styles.alertDetail}>
                          Prévu le {formatDate(rappel.date_prevue)}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {rappelsAVenir.length > 0 ? (
                <View style={styles.rappelSection}>
                  <AppText style={styles.rappelSubtitle} color="#2E7D32" fontWeight="bold">À venir</AppText>
                  {rappelsAVenir.slice(0, 3).map((rappel, index) => {
                    const jours = calculateJoursRestants(rappel.date_prevue);
                    const color = getUrgenceColor(rappel);
                    return (
                      <View key={index} style={[styles.alertCard, { borderLeftColor: color }]}>
                        <View style={[styles.alertIconCircle, { backgroundColor: color + '20' }]}>
                          <MaterialCommunityIcons name="bell" size={20} color={color} />
                        </View>
                        <View style={styles.alertContent}>
                          <AppText style={styles.alertTitle}>{rappel.type_rappel}</AppText>
                          <AppText style={styles.alertDetail}>
                            {jours === 0 ? "Aujourd'hui" : `Dans ${jours} jour${jours > 1 ? 's' : ''}`} — {formatDate(rappel.date_prevue)}
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {rappelsEnRetard.length === 0 && rappelsAVenir.length === 0 && (
                <AppText style={styles.emptyText}>Aucun rappel à venir</AppText>
              )}
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
    backgroundColor: '#F0F4F1',
  },
  headerPrimary: {
    backgroundColor: '#2D6A4F',
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
    height:250
  },
  userInfo: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  farmInfo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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

  // Carte stats globales chevauchant le header
  statsCard: {
    position: 'absolute',
    top: 200,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 60,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  seeAll: {
    fontSize: 13,
    color: '#2D6A4F',
    fontWeight: '500',
  },

  // Alertes
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  alertDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Transactions
  transactionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  transactionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  transactionCardGreen: {
    backgroundColor: '#E8F5E9',
  },
  transactionCardRed: {
    backgroundColor: '#FFEBEE',
  },
  transactionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  transactionLabelGreen: {
    fontSize: 13,
    color: '#2D6A4F',
    fontWeight: '500',
  },
  transactionLabelRed: {
    fontSize: 13,
    color: '#DC3545',
    fontWeight: '500',
  },
  transactionValueGreen: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 4,
  },
  transactionValueRed: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 4,
  },
  transactionSub: {
    fontSize: 11,
    color: '#81C784',
  },
  transactionSubRed: {
    fontSize: 11,
    color: '#EF9A9A',
  },

  // Gestations
  gestationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gestationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gestationContent: {
    flex: 1,
  },
  gestationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  gestationDetail: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Rappels
  rappelSection: {
    marginBottom: 12,
  },
  rappelSubtitle: {
    fontSize: 13,
    marginBottom: 8,
    color: '#6B7280',
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
  },
});

export default HomeScreen;
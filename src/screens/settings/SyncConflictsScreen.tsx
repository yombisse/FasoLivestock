import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getConflicts, forceKeepLocal, acceptServerVersion, ConflictSummary, ConflictDetail } from '../../database/repositories/conflictRepository';
import { getDatabase } from '../../database/connection';
import { farmStorage } from '../../storage/farmStorage';
import { fullSync } from '../../sync/syncService';

const TABLE_LABELS: Record<string, string> = {
  animals: 'Animal',
  transactions: 'Transaction',
  evenements: 'Événement',
  lots: 'Lot',
  notifications: 'Notification',
  naissances: 'Naissance',
};

interface FailedSyncItem {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  error_message: string;
  data: string;
  created_at: string;
}

const SyncConflictsScreen = () => {
  const [conflicts, setConflicts] = useState<ConflictSummary[]>([]);
  const [failedItems, setFailedItems] = useState<FailedSyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<Record<string, ConflictDetail>>({});

  const loadConflicts = async () => {
    try {
      const conflictsData = await getConflicts();
      setConflicts(conflictsData);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFailedItems = async () => {
    try {
      const db = await getDatabase();
      const result = await db.execute(
        `SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY created_at DESC`
      );
      const items = result?.rows || [];
      setFailedItems(items);
    } catch (error) {
      console.error('Error loading failed items:', error);
    }
  };

  useEffect(() => {
    loadConflicts();
    loadFailedItems();
  }, []);

  const handleForceKeepLocal = (conflict: ConflictSummary) => {
    Alert.alert(
      'Renvoyer ma version',
      `Vous allez renvoyer votre version de "${conflict.label}" au serveur. Cela peut écraser des modifications faites ailleurs. Continuer ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Renvoyer',
          style: 'destructive',
          onPress: async () => {
            try {
              await forceKeepLocal(conflict.table_name, conflict.id);
              // Optimistic UI - remove from list
              setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
              setConflictDetails((prev) => {
                const newDetails = { ...prev };
                delete newDetails[conflict.id];
                return newDetails;
              });
            } catch (error) {
              console.error('Error forcing keep local:', error);
              Alert.alert('Erreur', 'Impossible de renvoyer la version locale');
            }
          },
        },
      ]
    );
  };

  const handleAcceptServerVersion = (conflict: ConflictSummary) => {
    Alert.alert(
      'Accepter la version serveur',
      `Vous allez remplacer votre version de "${conflict.label}" par la version du serveur. Vos modifications locales seront perdues. Continuer ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Accepter',
          style: 'default',
          onPress: async () => {
            try {
              await acceptServerVersion(conflict.table_name, conflict.id);
              // Optimistic UI - remove from list
              setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
              setConflictDetails((prev) => {
                const newDetails = { ...prev };
                delete newDetails[conflict.id];
                return newDetails;
              });
            } catch (error) {
              console.error('Error accepting server version:', error);
              Alert.alert('Erreur', 'Impossible d\'accepter la version serveur');
            }
          },
        },
      ]
    );
  };

  const handleExpandConflict = async (conflict: ConflictSummary) => {
    const conflictKey = `${conflict.table_name}-${conflict.id}`;
    
    if (expandedConflict === conflictKey) {
      setExpandedConflict(null);
      return;
    }

    setExpandedConflict(conflictKey);

    // Load conflict details if not already loaded
    if (!conflictDetails[conflict.id]) {
      try {
        const { getConflictDetail } = await import('../../database/repositories/conflictRepository');
        const detail = await getConflictDetail(conflict.table_name, conflict.id);
        if (detail) {
          setConflictDetails((prev) => ({
            ...prev,
            [conflict.id]: detail,
          }));
        }
      } catch (error) {
        console.error('Error loading conflict detail:', error);
      }
    }
  };

  const handleRetryFailed = async () => {
    if (retrying) return;

    try {
      setRetrying(true);
      const farm = await farmStorage.getActiveFarm();
      if (!farm) {
        Alert.alert('Erreur', 'Aucune ferme active');
        return;
      }

      // Reset failed items to pending
      const db = await getDatabase();
      await db.execute(
        `UPDATE sync_queue SET status = 'pending', error_message = NULL WHERE status = 'failed'`
      );

      // Trigger sync
      await fullSync(farm.id);

      // Reload items
      await loadFailedItems();
    } catch (error) {
      console.error('Error retrying failed items:', error);
      Alert.alert('Erreur', 'Impossible de réessayer la synchronisation');
    } finally {
      setRetrying(false);
    }
  };

  const handleDeleteFailedItem = async (item: FailedSyncItem) => {
    Alert.alert(
      'Supprimer cet item',
      'Cet item sera supprimé de la file de synchronisation. Les données locales seront conservées mais ne seront plus synchronisées.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.execute(
                `DELETE FROM sync_queue WHERE id = ?`,
                [item.id]
              );
              // Optimistic UI - remove from list
              setFailedItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch (error) {
              console.error('Error deleting failed item:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cet item');
            }
          },
        },
      ]
    );
  };

  const renderFailedItem = (item: FailedSyncItem) => (
    <View key={item.id} style={styles.failedItem}>
      <View style={styles.failedHeader}>
        <View style={styles.failedIconContainer}>
          <MaterialCommunityIcons name="alert-circle" size={24} color="#D32F2F" />
        </View>
        <View style={styles.failedInfo}>
          <AppText style={styles.failedLabel} fontWeight="bold">
            {TABLE_LABELS[item.table_name] || item.table_name}
          </AppText>
          <AppText style={styles.failedAction} color="#757575" fontSize={12}>
            {item.action === 'create' ? 'Création' : item.action === 'update' ? 'Modification' : 'Suppression'}
          </AppText>
        </View>
      </View>
      <AppText style={styles.failedError} color="#D32F2F" fontSize={13}>
        {item.error_message || 'Erreur inconnue'}
      </AppText>
      <View style={styles.failedActions}>
        <TouchableOpacity
          style={styles.failedDeleteButton}
          onPress={() => handleDeleteFailedItem(item)}
        >
          <MaterialCommunityIcons name="delete" size={18} color="#D32F2F" />
          <AppText style={styles.failedDeleteButtonText} color="#D32F2F" fontSize={13}>
            Supprimer
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="check-circle" size={64} color="#2E7D32" />
      <AppText style={styles.emptyTitle} fontWeight="bold" fontSize={18}>
        Tout est synchronisé
      </AppText>
      <AppText style={styles.emptyText} color="#757575">
        Aucun conflit ou erreur de synchronisation détecté
      </AppText>
    </View>
  );

  const renderConflictItem = (conflict: ConflictSummary) => {
    const conflictKey = `${conflict.table_name}-${conflict.id}`;
    const isExpanded = expandedConflict === conflictKey;
    const detail = conflictDetails[conflict.id];

    return (
      <View key={conflictKey} style={styles.conflictItem}>
        <TouchableOpacity onPress={() => handleExpandConflict(conflict)}>
          <View style={styles.conflictHeader}>
            <View style={styles.conflictIconContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#FF9800" />
            </View>
            <View style={styles.conflictInfo}>
              <AppText style={styles.conflictLabel} fontWeight="bold">
                {conflict.label}
              </AppText>
              <AppText style={styles.conflictTable} color="#757575" fontSize={12}>
                {TABLE_LABELS[conflict.table_name] || conflict.table_name}
              </AppText>
            </View>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#757575" 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && detail && (
          <View style={styles.conflictDetails}>
            <View style={styles.versionBlock}>
              <AppText style={styles.versionTitle} color="#2E7D32" fontWeight="bold" fontSize={14}>
                Ma version (locale)
              </AppText>
              <AppText style={styles.versionText} color="#757575" fontSize={12}>
                {JSON.stringify(detail.local_data, null, 2)}
              </AppText>
            </View>
            <View style={styles.versionBlock}>
              <AppText style={styles.versionTitle} color="#D32F2F" fontWeight="bold" fontSize={14}>
                Version serveur
              </AppText>
              <AppText style={styles.versionText} color="#757575" fontSize={12}>
                {JSON.stringify(detail.server_data, null, 2)}
              </AppText>
            </View>
          </View>
        )}

        <View style={styles.conflictActions}>
          <AppButton
            title="Renvoyer ma version"
            onPress={() => handleForceKeepLocal(conflict)}
            style={styles.forceButton}
            textStyle={styles.forceButtonText}
          />
          <AppButton
            title="Accepter version serveur"
            onPress={() => handleAcceptServerVersion(conflict)}
            style={styles.acceptServerButton}
            textStyle={styles.forceButtonText}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Conflits de synchronisation" showBackButton />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadConflicts();
            loadFailedItems();
          }}
          tintColor="#2E7D32"
          colors={['#2E7D32']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <AppText color="#757575">Chargement...</AppText>
          </View>
        ) : conflicts.length === 0 && failedItems.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {failedItems.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <AppText style={styles.sectionTitle} fontWeight="bold" fontSize={14} color="#757575">
                    {failedItems.length} erreur{failedItems.length > 1 ? 's' : ''} de synchronisation
                  </AppText>
                  <TouchableOpacity
                    style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
                    onPress={handleRetryFailed}
                    disabled={retrying}
                  >
                    {retrying ? (
                      <ActivityIndicator size={16} color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" />
                        <AppText style={styles.retryButtonText} color="#FFFFFF" fontSize={13}>
                          Réessayer tout
                        </AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                {failedItems.map(renderFailedItem)}
              </>
            )}

            {conflicts.length > 0 && (
              <>
                {failedItems.length > 0 && <View style={styles.divider} />}
                <AppText style={styles.sectionTitle} fontWeight="bold" fontSize={14} color="#757575">
                  {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} détecté{conflicts.length > 1 ? 's' : ''}
                </AppText>
                {conflicts.map(renderConflictItem)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
  sectionTitle: {
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  conflictItem: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictLabel: {
    fontSize: 16,
    marginBottom: 2,
  },
  conflictTable: {
    textTransform: 'capitalize',
  },
  conflictDescription: {
    marginBottom: 12,
    lineHeight: 18,
  },
  forceButton: {
    alignSelf: 'flex-start',
    width: 'auto',
    paddingHorizontal: 20,
    height: 40,
  },
  forceButtonText: {
    fontSize: 14,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acceptServerButton: {
    alignSelf: 'flex-start',
    width: 'auto',
    paddingHorizontal: 20,
    height: 40,
    backgroundColor: '#1976D2',
  },
  conflictDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  versionBlock: {
    marginBottom: 12,
  },
  versionTitle: {
    marginBottom: 4,
  },
  versionText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  retryButtonText: {
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  failedItem: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  failedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  failedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFCDD2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  failedInfo: {
    flex: 1,
  },
  failedLabel: {
    fontSize: 16,
    marginBottom: 2,
  },
  failedAction: {
    textTransform: 'capitalize',
  },
  failedError: {
    marginBottom: 12,
    lineHeight: 18,
  },
  failedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  failedDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  failedDeleteButtonText: {
    marginLeft: 4,
  },
});

export default SyncConflictsScreen;

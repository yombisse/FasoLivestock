import { synchronize } from '@nozbe/watermelondb/sync';
import database from '../database/watermelonIndex';
import api from '../services/api';
import syncService from '../services/sync.service';

export interface SyncResult {
  success: boolean;
  error?: string;
  requiresRetry?: boolean;
}

/**
 * Custom conflict resolver implementing client-wins-per-column strategy
 * WatermelonDB 0.28.0: conflictResolver must RETURN resolved data, not call a callback.
 * 
 * Strategy:
 * 1. Start with remote (server version) as base
 * 2. For each column in local._changed (columns modified locally since last sync),
 *    reapply the local value on top of remote to preserve unsynced user changes
 * 3. Return the merged object
 * 
 * This ensures no unsynced user input is lost while accepting server updates
 * for unmodified columns.
 */
const conflictResolver = async ({ local, remote }: any) => {
  console.log('[ConflictResolver] Called with local:', local, 'remote:', remote);
  
  // If no remote version, return local
  if (!remote) {
    return local;
  }
  
  // If no local version (record doesn't exist locally), return remote for creation
  if (!local) {
    console.log('[ConflictResolver] No local record, returning remote for creation');
    return remote;
  }
  
  // Start with remote as base
  const merged = { ...remote };
  
  // Reapply locally modified columns on top of remote
  // _changed is a comma-separated string of column names modified locally since last sync
  const changedColumns = (local._changed || '').split(',').filter((c: string) => c.length > 0);
  
  if (changedColumns.length > 0) {
    console.log('[ConflictResolver] Locally changed columns:', changedColumns);
    
    changedColumns.forEach((column: string) => {
      if (local[column] !== undefined) {
        merged[column] = local[column];
        console.log(`[ConflictResolver] Merging column '${column}': local value preserved`);
      }
    });
  }
  
  console.log('[ConflictResolver] Merged result:', merged);
  return merged;
};

export async function syncWatermelon(farmId: string): Promise<SyncResult> {
  console.log('[WatermelonSync] Starting sync for farm:', farmId);

  // DEBUG: Count local especes before sync
  database.get('especes').query().fetch().then(r => {
    console.log('[WatermelonSync] ESPECES LOCAL COUNT BEFORE SYNC:', r.length);
    if (r.length > 0) {
      console.log('[WatermelonSync] ESPECES LOCAL SAMPLE:', r[0]);
    }
  });

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion }) => {
        console.log('[WatermelonSync] Pulling changes since:', lastPulledAt ? new Date(lastPulledAt).toISOString() : 'null');
        
        // Convert timestamp number to ISO string for backend
        const lastSyncAt = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;
        
        const response = await api.post('/sync/pull', {
          last_sync_at: lastSyncAt, // Send ISO string or null for initial sync
          farm_id: farmId,
          schema_version: schemaVersion,
        });

        console.log('[WatermelonSync] Pull response:', response.data);

        if (!response.data || !response.data.data || !response.data.data.changes) {
          throw new Error('Invalid sync response: missing changes');
        }

        const { changes, timestamp } = response.data.data;
        console.log('[WatermelonSync] Pull received changes:', Object.keys(changes).length, 'tables');
        
        // Essential logging for evenements
        if (changes.evenements) {
          console.log('[WatermelonSync] EVENEMENTS - created:', changes.evenements.created?.length || 0, 'updated:', changes.evenements.updated?.length || 0, 'deleted:', changes.evenements.deleted?.length || 0);
          if (changes.evenements.created?.length > 0) {
            console.log('[WatermelonSync] EVENEMENTS SAMPLE:', changes.evenements.created[0]);
          }
        }
        
        // Essential logging for animals and transactions
        console.log('[WatermelonSync] ANIMALS - created:', changes.animals?.created?.length || 0, 'updated:', changes.animals?.updated?.length || 0);
        console.log('[WatermelonSync] TRANSACTIONS - created:', changes.transactions?.created?.length || 0, 'updated:', changes.transactions?.updated?.length || 0);
        
        // Clean nested data from farms (owner, users) before passing to WatermelonDB
        if (changes.farms) {
          changes.farms.created = (changes.farms.created || []).map((farm: any) => {
            const { owner, users, ...cleanFarm } = farm;
            return cleanFarm;
          });
          changes.farms.updated = (changes.farms.updated || []).map((farm: any) => {
            const { owner, users, ...cleanFarm } = farm;
            return cleanFarm;
          });
          changes.farms.deleted = (changes.farms.deleted || []).map((farm: any) => {
            const { owner, users, ...cleanFarm } = farm;
            return cleanFarm;
          });
        }
        
        // Convert ISO timestamps to milliseconds for WatermelonDB compatibility
        const convertTimestamps = (record: any) => {
          const timestampFields = ['created_at', 'updated_at', 'deleted_at', 'last_sync_at', 'date_naissance', 'date_evenement'];
          const numericFields = ['montant', 'cout', 'poids', 'poids_naissance', 'nombre', 'nombre_petits'];
          const converted = { ...record };
          
          timestampFields.forEach(field => {
            if (converted[field] && typeof converted[field] === 'string') {
              converted[field] = new Date(converted[field]).getTime();
            }
          });
          
          numericFields.forEach(field => {
            if (converted[field] !== null && converted[field] !== undefined && typeof converted[field] === 'string') {
              const numValue = parseFloat(converted[field]);
              if (!isNaN(numValue)) {
                converted[field] = numValue;
              }
            }
          });
          
          return converted;
        };
        
        Object.keys(changes).forEach(tableName => {
          if (changes[tableName].created) {
            changes[tableName].created = changes[tableName].created.map(convertTimestamps);
          }
          if (changes[tableName].updated) {
            changes[tableName].updated = changes[tableName].updated.map(convertTimestamps);
          }
        });
        
        // Convert ISO timestamp to number (milliseconds) as required by WatermelonDB
        const timestampMs = new Date(timestamp).getTime();
        
        console.log('[WatermelonSync] About to apply changes to WatermelonDB');
        return { changes, timestamp: timestampMs };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        console.log('[WatermelonSync] Pushing changes:', Object.keys(changes).length, 'tables');

        // Filter out reference tables that are synced only via initial sync
        const referenceTables = ['especes', 'categories', 'type_evenements', 'farm_user', 'farms'];
        const filteredChanges = { ...changes } as any;
        
        referenceTables.forEach(table => {
          if (filteredChanges[table]) {
            filteredChanges[table] = {
              created: [],
              updated: [],
              deleted: [],
            };
          }
        });

        // Filter out transactions linked to events (server-side only)
        if (filteredChanges.transactions) {
          filteredChanges.transactions = {
            created: (filteredChanges.transactions.created || []).filter(
              (trx: any) => !trx.evenement_id
            ),
            updated: (filteredChanges.transactions.updated || []).filter(
              (trx: any) => !trx.evenement_id
            ),
          };
        }

        // Map field names to match backend schema (nom -> nom_lot for lots table) in push
        if (filteredChanges.lots) {
          const mapLotFields = (lot: any) => {
            const mapped = { ...lot };
            if (mapped.nom !== undefined && mapped.nom_lot === undefined) {
              mapped.nom_lot = mapped.nom;
              delete mapped.nom;
            }
            return mapped;
          };
          
          filteredChanges.lots.created = (filteredChanges.lots.created || []).map(mapLotFields);
          filteredChanges.lots.updated = (filteredChanges.lots.updated || []).map(mapLotFields);
        }

        // Count total items in payload and track IDs for validation
        let totalItems = 0;
        const pushedIds: { [table: string]: string[] } = {};
        
        Object.entries(filteredChanges).forEach(([tableName, tableChanges]: [string, any]) => {
          if (tableChanges.created) {
            totalItems += tableChanges.created.length;
            pushedIds[tableName] = [...(pushedIds[tableName] || []), ...tableChanges.created.map((r: any) => r.id)];
          }
          if (tableChanges.updated) {
            totalItems += tableChanges.updated.length;
            pushedIds[tableName] = [...(pushedIds[tableName] || []), ...tableChanges.updated.map((r: any) => r.id)];
          }
          if (tableChanges.deleted) {
            totalItems += tableChanges.deleted.length;
            pushedIds[tableName] = [...(pushedIds[tableName] || []), ...tableChanges.deleted];
          }
        });
        console.log('[WatermelonSync] Total items to push:', totalItems);

        // NOTE: Backend has MAX_CHUNK_SIZE = 200 items limit
        // For demo purposes, we recommend raising this limit to 500 or 1000 on the backend
        // instead of implementing complex chunking logic on mobile side
        // If HTTP 413 errors occur, increase MAX_CHUNK_SIZE in backend sync controller

        const response = await api.post('/sync/push', {
          changes: filteredChanges,
          farm_id: farmId,
          last_sync_at: lastPulledAt ? new Date(lastPulledAt).toISOString() : null,
        });

        console.log('[WatermelonSync] Push response success:', response.data.success);

        const results = response.data.data?.results || {};
        console.log('[WatermelonSync] Server results:', results);

        if (!results || typeof results !== 'object') {
          throw new Error('Server response missing data.results');
        }

        // Process results for each module
        const tablesToUpdate = ['evenements', 'transactions', 'naissances', 'notifications', 'animals', 'lots'];
        let totalConfirmed = 0;
        let totalRejected = 0;

        await database.write(async () => {
          for (const tableName of tablesToUpdate) {
            const moduleResult = results[tableName];
            
            if (!moduleResult) {
              console.log(`[WatermelonSync] No results for table ${tableName}, skipping`);
              continue;
            }

            const confirmed = moduleResult.confirmed || [];
            const rejected = moduleResult.rejected || [];

            console.log(`[WatermelonSync] ${tableName}: ${confirmed.length} confirmed, ${rejected.length} rejected`);
            totalConfirmed += confirmed.length;
            totalRejected += rejected.length;

            for (const recordId of confirmed) {
              try {
                const record = await database.get(tableName).find(recordId);
                await record.update((r: any) => {
                  r.sync_status = 'synced';
                  r.sync_error = null;
                  r.server_confirmed_at = Date.now();
                });
              } catch (error) {
                console.error(`[WatermelonSync] Error marking ${recordId} as synced:`, error);
              }
            }

            for (const rejectedItem of rejected) {
              try {
                const record = await database.get(tableName).find(rejectedItem.id);
                await record.update((r: any) => {
                  r.sync_status = 'failed';
                  r.sync_error = JSON.stringify({
                    code: rejectedItem.code,
                    reason: rejectedItem.reason,
                  });
                  r.last_push_attempt_at = Date.now();
                });
                console.log(`[WatermelonSync] ${rejectedItem.id} rejected: ${rejectedItem.code}`);
              } catch (error) {
                console.error(`[WatermelonSync] Error marking ${rejectedItem.id} as rejected:`, error);
              }
            }
          }
        });

        // Mark any unmentioned records as failed (sent but not in response)
        await database.write(async () => {
          for (const tableName of tablesToUpdate) {
            if (pushedIds[tableName] && Array.isArray(pushedIds[tableName])) {
              const moduleResult = results[tableName] || { confirmed: [], rejected: [] };
              const confirmedIds = moduleResult.confirmed || [];
              const rejectedIds = (moduleResult.rejected || []).map((r: any) => r.id);
              const processedIds = new Set([...confirmedIds, ...rejectedIds]);
              const unprocessedIds = pushedIds[tableName].filter((id: string) => !processedIds.has(id));
              
              if (unprocessedIds.length > 0) {
                console.log(`[WatermelonSync] ${unprocessedIds.length} unprocessed in ${tableName}`);
                for (const recordId of unprocessedIds) {
                  try {
                    const record = await database.get(tableName).find(recordId);
                    await record.update((r: any) => {
                      r.sync_status = 'failed';
                      r.sync_error = 'Server did not include this record in response';
                      r.last_push_attempt_at = Date.now();
                    });
                  } catch (error) {
                    console.error(`[WatermelonSync] Error marking ${recordId} as failed:`, error);
                  }
                }
              }
            }
          }
        });

        console.log(`[WatermelonSync] Push completed: ${totalConfirmed} confirmed, ${totalRejected} rejected`);
        return response.data;
      },
      // CONFLICT RESOLUTION STRATEGY:
      // Using custom conflict resolver implementing client-wins-per-column strategy.
      // This ensures that when a conflict occurs (same record modified on both client and server),
      // the server version is used as base, but locally modified columns (since last sync) are preserved.
      // This prevents loss of unsynced user input while accepting server updates for unmodified columns.
      conflictResolver,
      migrationsEnabledAtVersion: undefined, // Disable migrations for now (JSI not available in dev mode)
      sendCreatedAsUpdated: true, // Backend sends all changes in 'updated' array to avoid UNIQUE constraint issues
    });

    console.log('[WatermelonSync] Sync completed successfully');
    
    // Log data stored in WatermelonDB after sync
    const evenementsCount = await database.get('evenements').query().fetchCount();
    const animalsCount = await database.get('animals').query().fetchCount();
    const transactionsCount = await database.get('transactions').query().fetchCount();
    console.log('[WatermelonSync] After sync - EVENEMENTS in DB:', evenementsCount, 'ANIMALS:', animalsCount, 'TRANSACTIONS:', transactionsCount);
    
    if (evenementsCount > 0) {
      const sampleEvent = await database.get('evenements').query().fetch();
      console.log('[WatermelonSync] SAMPLE EVENT FROM DB:', sampleEvent[0]);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[WatermelonSync] Sync failed:', error);
    
    // Check if it's a 403 or 404 error (invalid farm ID)
    if (error.response?.status === 403 || error.response?.status === 404) {
      console.log('[WatermelonSync] Farm ID invalid (403/404), triggering initial sync...');
      
      try {
        // Trigger initial sync to refresh farm list
        await syncService.initialSync();
        console.log('[WatermelonSync] Initial sync completed, please retry sync');
        
        return {
          success: false,
          error: 'Farm ID was invalid. Initial sync completed. Please retry.',
          requiresRetry: true,
        };
      } catch (initialSyncError: any) {
        console.error('[WatermelonSync] Initial sync also failed:', initialSyncError);
        return {
          success: false,
          error: initialSyncError.message || 'Initial sync failed',
        };
      }
    }
    
    return {
      success: false,
      error: error.message || 'Sync failed',
    };
  }
}

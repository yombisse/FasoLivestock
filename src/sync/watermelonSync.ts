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
 * Custom conflict resolver to prevent duplicates during sync pull
 * This ensures that if the server sends back a record with the same ID as a local record,
 * the local record is updated instead of creating a duplicate.
 */
const conflictResolver = async ({ local, remote, resolved }: any) => {
  if (!local || !local.id) {
    console.log('[ConflictResolver] Local record is missing or has no ID, using remote version');
    resolved(remote);
    return;
  }
  
  console.log('[ConflictResolver] Resolving conflict for record:', local.id);
  
  // Use the remote version (server truth) but preserve local sync_status if it's pending
  const resolvedData = { ...remote };
  
  // If local was pending sync, keep it as pending to ensure it gets pushed
  if (local.sync_status === 'pending') {
    resolvedData.sync_status = 'pending';
  } else {
    // Mark as synced after successful pull
    resolvedData.sync_status = 'synced';
  }
  
  resolved(resolvedData);
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
        console.log('[WatermelonSync] Pulling changes since:', lastPulledAt);
        console.log('[AUDIT] Pull - lastPulledAt before pull:', lastPulledAt, 'type:', typeof lastPulledAt);
        
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
        console.log('[WatermelonSync] Tables received:', Object.keys(changes));
        
        // Log raw data from backend for each table
        const referenceTables = ['especes', 'categories', 'type_evenements', 'farm_user', 'farms'];
        Object.keys(changes).forEach(tableName => {
          const tableType = referenceTables.includes(tableName) ? 'REFERENCE TABLE' : 'BUSINESS TABLE';
          const tableChanges = changes[tableName];
          console.log(`[AUDIT] ${tableType} - ${tableName} RAW backend data:`, JSON.stringify(tableChanges, null, 2));
          
          // Special logging for transactions to check montant values
          if (tableName === 'transactions') {
            console.log('[AUDIT] TRANSACTIONS - Checking montant values:');
            if (tableChanges.created && tableChanges.created.length > 0) {
              tableChanges.created.forEach((trx: any, idx: number) => {
                console.log(`[AUDIT] Transaction created[${idx}]:`, {
                  id: trx.id,
                  montant: trx.montant,
                  montant_type: typeof trx.montant,
                  montant_is_zero: trx.montant === 0,
                  montant_is_null: trx.montant === null,
                  montant_is_undefined: trx.montant === undefined,
                });
              });
            }
            if (tableChanges.updated && tableChanges.updated.length > 0) {
              tableChanges.updated.forEach((trx: any, idx: number) => {
                console.log(`[AUDIT] Transaction updated[${idx}]:`, {
                  id: trx.id,
                  montant: trx.montant,
                  montant_type: typeof trx.montant,
                  montant_is_zero: trx.montant === 0,
                  montant_is_null: trx.montant === null,
                  montant_is_undefined: trx.montant === undefined,
                });
              });
            }
          }
        });
        
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
          console.log('[AUDIT] Cleaned nested data from farms (including deleted)');
        }
        
        // Convert ISO timestamps to milliseconds for WatermelonDB compatibility
        // Note: date_transaction is stored as string in schema, not converted to milliseconds
        const convertTimestamps = (record: any) => {
          const timestampFields = ['created_at', 'updated_at', 'deleted_at', 'last_sync_at', 'date_naissance', 'date_evenement'];
          const numericFields = ['montant', 'cout', 'poids', 'poids_naissance', 'nombre', 'nombre_petits'];
          const converted = { ...record };
          
          timestampFields.forEach(field => {
            if (converted[field] && typeof converted[field] === 'string') {
              console.log(`[AUDIT] Converting ${field} from ${converted[field]} to ${new Date(converted[field]).getTime()}`);
              converted[field] = new Date(converted[field]).getTime();
            } else if (converted[field] === null) {
              console.log(`[AUDIT] Field ${field} is null, keeping as null`);
            }
          });
          
          numericFields.forEach(field => {
            if (converted[field] !== null && converted[field] !== undefined && typeof converted[field] === 'string') {
              const numValue = parseFloat(converted[field]);
              if (!isNaN(numValue)) {
                console.log(`[AUDIT] Converting ${field} from string '${converted[field]}' to number ${numValue}`);
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
          if (changes[tableName].deleted) {
            changes[tableName].deleted = changes[tableName].deleted.map(convertTimestamps);
          }
        });
        console.log('[AUDIT] Converted ISO timestamps to milliseconds');
        
        // Log data after conversion with schema comparison
        Object.keys(changes).forEach(tableName => {
          const tableType = referenceTables.includes(tableName) ? 'REFERENCE TABLE' : 'BUSINESS TABLE';
          console.log(`[AUDIT] ${tableType} - ${tableName} FINAL data for WatermelonDB:`, JSON.stringify(changes[tableName], null, 2));
          
          // Log schema fields for comparison
          if (changes[tableName].created && changes[tableName].created.length > 0) {
            const sampleRecord = changes[tableName].created[0];
            console.log(`[AUDIT] ${tableName} - Fields in data:`, Object.keys(sampleRecord));
            console.log(`[AUDIT] ${tableName} - Field types:`, Object.keys(sampleRecord).reduce((acc: any, key) => {
              acc[key] = typeof sampleRecord[key];
              return acc;
            }, {}));
            
            // Log each field value in detail for debugging
            console.log(`[AUDIT] ${tableName} - Detailed field values:`, Object.keys(sampleRecord).reduce((acc: any, key) => {
              acc[key] = { value: sampleRecord[key], type: typeof sampleRecord[key], isNull: sampleRecord[key] === null, isUndefined: sampleRecord[key] === undefined };
              return acc;
            }, {}));
            
            // Log complete detailed values for debugging
            try {
              const detailedValues = Object.keys(sampleRecord).reduce((acc: any, key) => {
                acc[key] = { value: sampleRecord[key], type: typeof sampleRecord[key], isNull: sampleRecord[key] === null, isUndefined: sampleRecord[key] === undefined };
                return acc;
              }, {});
              console.log(`[AUDIT] ${tableName} - Complete detailed values:`, JSON.stringify(detailedValues, null, 2));
            } catch (e) {
              console.error(`[AUDIT] ${tableName} - Error logging detailed values:`, e);
            }
          }
        });
        
        // Log detailed changes for each table to identify problematic records
        Object.keys(changes).forEach(tableName => {
          const tableChanges = changes[tableName];
          console.log(`[AUDIT] Table ${tableName}:`, {
            created: tableChanges.created?.map((r: any) => ({ 
              id: r.id, 
              id_type: typeof r.id,
              keys: Object.keys(r),
              sample_values: Object.keys(r).slice(0, 5).map(k => ({ key: k, value: r[k], type: typeof r[k] }))
            })),
            updated: tableChanges.updated?.map((r: any) => ({ 
              id: r.id, 
              id_type: typeof r.id,
              keys: Object.keys(r),
              sample_values: Object.keys(r).slice(0, 5).map(k => ({ key: k, value: r[k], type: typeof r[k] }))
            })),
            deleted: tableChanges.deleted?.map((r: any) => ({ id: r.id, id_type: typeof r.id })),
          });
        });
        
        console.log('[WatermelonSync] Especes in changes:', 'especes' in changes, changes.especes?.length || 0);
        console.log('[WatermelonSync] Especes data:', changes.especes);
        
        // Convert ISO timestamp to number (milliseconds) as required by WatermelonDB
        const timestampMs = new Date(timestamp).getTime();
        console.log('[AUDIT] Pull - new timestamp from backend:', timestamp, 'converted to ms:', timestampMs);
        
        console.log('[AUDIT] About to return changes to WatermelonDB for applyRemoteChanges');
        console.log('[AUDIT] Changes structure:', Object.keys(changes).reduce((acc: any, tableName) => {
          acc[tableName] = {
            created_count: changes[tableName].created?.length || 0,
            updated_count: changes[tableName].updated?.length || 0,
            deleted_count: changes[tableName].deleted?.length || 0,
          };
          return acc;
        }, {}));
        
        return { changes, timestamp: timestampMs };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        console.log('[WatermelonSync] Pushing changes:', Object.keys(changes).length, 'tables');
        console.log('[AUDIT] Push - lastPulledAt before push:', lastPulledAt, 'type:', typeof lastPulledAt);

        // Filter out reference tables that are synced only via initial sync
        // These tables contain global/system data that should not be pushed
        const referenceTables = ['especes', 'categories', 'type_evenements', 'farm_user', 'farms'];
        const filteredChanges = { ...changes } as any;
        
        referenceTables.forEach(table => {
          if (filteredChanges[table]) {
            filteredChanges[table] = {
              created: [],
              updated: [],
              deleted: [],
            };
            console.log(`[WatermelonSync] Filtered out reference table: ${table}`);
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
          console.log('[WatermelonSync] Filtered out',
            (filteredChanges.transactions.created?.length || 0) + (filteredChanges.transactions.updated?.length || 0),
            'transactions linked to events');
        }

        // Map field names to match backend schema (nom -> nom_lot for lots table) in push
        if (filteredChanges.lots) {
          console.log('[AUDIT] PUSH - Lots before mapping:', JSON.stringify(filteredChanges.lots, null, 2));
          const mapLotFields = (lot: any) => {
            const mapped = { ...lot };
            console.log('[AUDIT] PUSH - Mapping lot:', {
              id: lot.id,
              has_nom: 'nom' in lot,
              has_nom_lot: 'nom_lot' in lot,
              nom_value: lot.nom,
              nom_lot_value: lot.nom_lot,
            });
            if (mapped.nom !== undefined && mapped.nom_lot === undefined) {
              mapped.nom_lot = mapped.nom;
              delete mapped.nom;
              console.log('[AUDIT] PUSH - Converted nom to nom_lot for lot:', lot.id);
            }
            return mapped;
          };
          
          filteredChanges.lots.created = (filteredChanges.lots.created || []).map(mapLotFields);
          filteredChanges.lots.updated = (filteredChanges.lots.updated || []).map(mapLotFields);
          filteredChanges.lots.deleted = (filteredChanges.lots.deleted || []).map(mapLotFields);
          console.log('[AUDIT] PUSH - Lots after mapping:', JSON.stringify(filteredChanges.lots, null, 2));
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
            pushedIds[tableName] = [...(pushedIds[tableName] || []), ...tableChanges.deleted.map((r: any) => r.id)];
          }
        });
        console.log('[WatermelonSync] Total items to push:', totalItems);
        console.log('[WatermelonSync] Pushed IDs by table:', pushedIds);

        // Log detailed changes for debugging
        console.log('[WatermelonSync] Detailed changes:', JSON.stringify(filteredChanges, null, 2));
        console.log('[AUDIT] Push payload before HTTP:', {
          farm_id: farmId,
          last_sync_at: lastPulledAt ? new Date(lastPulledAt).toISOString() : null,
          total_items: totalItems,
          tables_with_changes: Object.keys(filteredChanges).filter(t => {
            const tc = filteredChanges[t];
            return (tc.created?.length || 0) + (tc.updated?.length || 0) + (tc.deleted?.length || 0) > 0;
          }),
        });

        // NOTE: Backend has MAX_CHUNK_SIZE = 200 items limit
        // For demo purposes, we recommend raising this limit to 500 or 1000 on the backend
        // instead of implementing complex chunking logic on mobile side
        // If HTTP 413 errors occur, increase MAX_CHUNK_SIZE in backend sync controller

        const response = await api.post('/sync/push', {
          changes: filteredChanges,
          farm_id: farmId,
          last_sync_at: lastPulledAt ? new Date(lastPulledAt).toISOString() : null,
        });

        console.log('[WatermelonSync] Push response:', JSON.stringify(response.data, null, 2));
        console.log('[AUDIT] Push - response received:', {
          success: response.data.success,
          message: response.data.message,
          synced_at: response.data.data?.synced_at,
        });

        // INSTRUMENTED VALIDATION: Parse backend response structure
        const results = response.data.data?.results || {};
        console.log('[WatermelonSync] Server results:', results);

        // Validate that response contains results object
        if (!results || typeof results !== 'object') {
          const errorMsg = 'Server response missing data.results - cannot verify sync success';
          console.error('[WatermelonSync] ERROR:', errorMsg);
          
          // Log the failure
          await database.write(async () => {
            await database.get('sync_logs').create((log: any) => {
              log.farm_id = farmId;
              log.table_name = 'multiple';
              log.sync_type = 'push';
              log.status = 'failed';
              log.error_message = errorMsg;
              log.payload = JSON.stringify({ response: response.data });
              log.created_at = Date.now();
            });
          });
          
          throw new Error(errorMsg);
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

            console.log(`[WatermelonSync] Processing ${tableName}: ${confirmed.length} confirmed, ${rejected.length} rejected`);
            totalConfirmed += confirmed.length;
            totalRejected += rejected.length;

            // Mark confirmed records as synced
            for (const recordId of confirmed) {
              try {
                const record = await database.get(tableName).find(recordId);
                await record.update((r: any) => {
                  r.sync_status = 'synced';
                  r.sync_error = null;
                  r.server_confirmed_at = Date.now();
                });
                console.log(`[WatermelonSync] Marked record ${recordId} in ${tableName} as synced`);
              } catch (error) {
                console.error(`[WatermelonSync] Error marking record ${recordId} in ${tableName} as synced:`, error);
              }
            }

            // Mark rejected records with error details
            for (const rejectedItem of rejected) {
              try {
                const record = await database.get(tableName).find(rejectedItem.id);
                const errorDetails = {
                  code: rejectedItem.code,
                  reason: rejectedItem.reason,
                  client_version: rejectedItem.client_version,
                  server_version: rejectedItem.server_version,
                  existing_id: rejectedItem.existing_id,
                };
                
                await record.update((r: any) => {
                  r.sync_status = 'failed';
                  r.sync_error = JSON.stringify(errorDetails);
                  r.last_push_attempt_at = Date.now();
                });
                
                console.log(`[WatermelonSync] Marked record ${rejectedItem.id} in ${tableName} as rejected: ${rejectedItem.code}`);
                
                // Log rejection for debugging
                await database.get('sync_logs').create((log: any) => {
                  log.farm_id = farmId;
                  log.table_name = tableName;
                  log.record_id = rejectedItem.id;
                  log.sync_type = 'push';
                  log.status = 'rejected';
                  log.error_message = rejectedItem.reason;
                  log.payload = JSON.stringify(errorDetails);
                  log.created_at = Date.now();
                });
              } catch (error) {
                console.error(`[WatermelonSync] Error marking record ${rejectedItem.id} in ${tableName} as rejected:`, error);
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
                console.log(`[WatermelonSync] Marking ${unprocessedIds.length} unprocessed records in ${tableName} as failed`);
                
                for (const recordId of unprocessedIds) {
                  try {
                    const record = await database.get(tableName).find(recordId);
                    await record.update((r: any) => {
                      r.sync_status = 'failed';
                      r.sync_error = 'Server did not include this record in response';
                      r.last_push_attempt_at = Date.now();
                    });
                    console.log(`[WatermelonSync] Marked record ${recordId} in ${tableName} as failed (unprocessed)`);
                  } catch (error) {
                    console.error(`[WatermelonSync] Error marking record ${recordId} in ${tableName} as failed (unprocessed):`, error);
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
      // Using custom conflict resolver to prevent duplicates during sync pull.
      // This ensures that if the server sends back a record with the same ID as a local record,
      // the local record is updated instead of creating a duplicate.
      conflictResolver,
      migrationsEnabledAtVersion: undefined, // Disable migrations for now (JSI not available in dev mode)
    });

    console.log('[WatermelonSync] Sync completed successfully');
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

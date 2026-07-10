import api from '../services/api';
import { getDatabase } from '../database/connection';
import { getIsConnected } from '../utils/networkStatus';
import { buildFarmUpsertStatements } from '../database/repositories/farmRepository';
import { buildFarmUserUpsertStatements } from '../database/repositories/farmUserRepository';
import { buildEspeceUpsertStatements } from '../database/repositories/especeRepository';
import { buildCategorieUpsertStatements } from '../database/repositories/categorieRepository';
import { buildTypeEvenementUpsertStatements } from '../database/repositories/typeEvenementRepository';
import { ensureDefaultCategoriesExist } from '../database/repositories/categorieRepository';
import { syncEvents } from './syncEvents';
import { sortPendingItemsByDependency, TABLE_PRIORITY, SyncQueueItem } from './utils/syncDependencySort';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// FIX 1: Global sync mutex to prevent concurrent DB operations on shared connection
// ============================================================================
let syncMutex: Promise<void> = Promise.resolve();

async function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  const unlock = await (async () => {
    const prev = syncMutex;
    let resolve!: () => void;
    const next = new Promise<void>((res) => { resolve = res; });
    syncMutex = next;
    await prev;
    return resolve;
  })();

  try {
    return await fn();
  } finally {
    unlock();
  }
}

// ============================================================================
// FIX 2: Safe transaction helpers — never let a rollback error mask the real error
// ============================================================================
async function safeRollback(db: any): Promise<void> {
  try {
    await db.execute('ROLLBACK');
  } catch (e) {
    // No transaction was active — safe to ignore
  }
}

async function executeInTransaction<T>(db: any, fn: () => Promise<T>): Promise<T> {
  await safeRollback(db); // Ensure clean slate
  await db.execute('BEGIN TRANSACTION');
  try {
    const result = await fn();
    await db.execute('COMMIT');
    return result;
  } catch (error) {
    await safeRollback(db);
    throw error;
  }
}

// ============================================================================
// Existing helpers (unchanged)
// ============================================================================
let initialSyncInFlight: Promise<void> | null = null;

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function getUUIDByName(db: any, table: string, nameColumn: string, name: string): Promise<string | null> {
  try {
    const result = await db.execute(
      `SELECT id FROM ${table} WHERE ${nameColumn} = ? LIMIT 1`,
      [name]
    );
    if (result && result.rows && result.rows.length > 0) {
      return (result.rows[0] as any).id;
    }
    return null;
  } catch (error) {
    console.error(`Error getting UUID from ${table}:`, error);
    return null;
  }
}

async function normalizeForeignKeys(db: any, table: string, data: any): Promise<any> {
  const normalized = { ...data };

  if (table === 'evenements' && data.type_evenement_id) {
    if (isValidUUID(data.type_evenement_id)) {
      const exists = await db.execute(
        `SELECT id FROM type_evenements WHERE id = ? LIMIT 1`,
        [data.type_evenement_id]
      );
      if (!exists?.rows || exists.rows.length === 0) {
        console.log(`[SyncService] UUID ${data.type_evenement_id} not found in local type_evenements, attempting to find by name`);
        const description = data.description || '';
        let typeName = null;
        if (description.includes('Décès') || description.includes('décès')) {
          typeName = 'deces';
        } else if (description.includes('Perte') || description.includes('perte')) {
          typeName = 'perte';
        } else if (description.includes('Abattage') || description.includes('abattage')) {
          typeName = 'abattage';
        }
        if (typeName) {
          const uuid = await getUUIDByName(db, 'type_evenements', 'nom_type', typeName);
          if (uuid) {
            normalized.type_evenement_id = uuid;
            console.log(`[SyncService] Replaced local UUID with server UUID for type: ${typeName}`);
          }
        }
      }
    } else {
      console.warn(`[SyncService] WARNING: type_evenement_id is a name instead of UUID: ${data.type_evenement_id}. This indicates a screen is not resolving UUIDs before writing locally.`);
      const uuid = await getUUIDByName(db, 'type_evenements', 'nom_type', data.type_evenement_id);
      if (uuid) {
        normalized.type_evenement_id = uuid;
      }
    }
  }

  if (table === 'transactions' && data.categorie_id && !isValidUUID(data.categorie_id)) {
    const uuid = await getUUIDByName(db, 'categories', 'nom_categorie', data.categorie_id);
    if (uuid) {
      normalized.categorie_id = uuid;
    }
  }

  if (table === 'animals' && data.espece_id && !isValidUUID(data.espece_id)) {
    const uuid = await getUUIDByName(db, 'especes', 'nom', data.espece_id);
    if (uuid) {
      normalized.espece_id = uuid;
    }
  }

  if (table === 'animals' && data.lot_id && !isValidUUID(data.lot_id)) {
    const uuid = await getUUIDByName(db, 'lots', 'nom', data.lot_id);
    if (uuid) {
      normalized.lot_id = uuid;
    }
  }

  return normalized;
}

// SyncQueueItem, TABLE_PRIORITY, and sortPendingItemsByDependency are now imported from utils/syncDependencySort

interface SyncChange {
  table: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, any>;
}

interface SyncPushRequest {
  changes: SyncChange[];
  last_sync_at: string | null;
  farm_id: string;
  sync_request_id?: string;
}

interface SyncPushResponse {
  success: boolean;
  message: string;
  data: {
    results: Array<{
      table: string;
      action: string;
      status: string;
      error?: string;
      code?: string;
      reason?: string;
    }>;
    conflicts: Array<{
      table: string;
      record_id: string;
      reason: string;
      server_data: Record<string, any>;
    }>;
    synced_at: string;
    cached?: boolean;
  };
}

interface SyncPullResponse {
  success: boolean;
  message: string;
  data: {
    changes: Record<string, Record<string, any>[]>;
    synced_at: string;
  };
}

interface VerifyConsistencyRequest {
  farm_id: string;
  local_ids: Array<{
    table: string;
    id: string;
  }>;
}

interface VerifyConsistencyResponse {
  success: boolean;
  data: {
    inconsistent_records: Array<{
      table: string;
      id: string;
      reason: string;
    }>;
    total_inconsistent: number;
  };
}

async function getLocalSyncedRecords(db: any): Promise<Array<{ table: string; id: string }>> {
  const tables = ['animals', 'transactions', 'evenements', 'type_evenements', 'especes', 'lots', 'categories'];
  const records: Array<{ table: string; id: string }> = [];

  for (const table of tables) {
    try {
      const result = await db.execute(
        `SELECT id FROM ${table} WHERE sync_status = 'synced' AND deleted_at IS NULL`
      );
      if (result?.rows) {
        for (const row of result.rows) {
          records.push({ table, id: (row as any).id });
        }
      } else if (Array.isArray(result)) {
        for (const row of result) {
          records.push({ table, id: row.id });
        }
      }
    } catch (error) {
      console.error(`Error getting synced records from ${table}:`, error);
    }
  }

  return records;
}

// ============================================================================
// UUID generator for idempotence
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isNetworkError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  return errorMessage.includes('timeout') ||
         errorMessage.includes('network') ||
         errorMessage.includes('etimedout') ||
         errorMessage.includes('enetunreach') ||
         errorMessage.includes('5') ||
         errorMessage.includes('502') ||
         errorMessage.includes('503') ||
         errorMessage.includes('504');
}

// ============================================================================
// Automatic conflict resolution helper
// ============================================================================

const CRITICAL_TABLES = ['animals', 'transactions'];

function resolveConflict(
  item: SyncQueueItem,
  conflict: any,
  localRecord: any
): { strategy: string, action: string } {
  const isCritical = CRITICAL_TABLES.includes(item.table_name);

  if (isCritical) {
    // Server-wins pour les tables critiques
    console.log(`[SyncService] Server-wins strategy for critical table: ${item.table_name}`);

    return {
      strategy: 'server-wins',
      action: 'pull-server-version'
    };
  } else {
    // Client-wins pour les tables non critiques
    console.log(`[SyncService] Client-wins strategy for non-critical table: ${item.table_name}`);

    return {
      strategy: 'client-wins',
      action: 'force-push'
    };
  }
}

// ============================================================================
// Structured validation helper
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  'animals': ['farm_id', 'statut'],
  'evenements': ['farm_id', 'type_evenement_id', 'date_evenement'],
  'transactions': ['farm_id', 'type_transaction', 'montant', 'date_transaction'],
  'lots': ['farm_id', 'nom'],
  'naissances': ['farm_id', 'animal_id', 'date_naissance'],
};

function validateChange(table: string, data: any): ValidationResult {
  const errors: string[] = [];

  // Validation UUID de l'ID principal
  if (data.id && !isValidUUID(data.id)) {
    errors.push(`Invalid UUID format for id: ${data.id}`);
  }

  // Validation des champs requis
  const tableRequiredFields = REQUIRED_FIELDS[table] || [];
  tableRequiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validation des UUID des FK
  const fkFields = ['animal_id', 'evenement_id', 'mother_id', 'farm_id', 'espece_id', 'lot_id', 'categorie_id', 'type_evenement_id'];
  fkFields.forEach(field => {
    if (data[field] && !isValidUUID(data[field])) {
      errors.push(`Invalid UUID format for ${field}: ${data[field]}`);
    }
  });

  // Validation des types spécifiques
  if (table === 'transactions') {
    if (data.montant !== undefined && (typeof data.montant !== 'number' || isNaN(data.montant))) {
      errors.push(`Invalid montant type: must be a number, got ${typeof data.montant}`);
    }
    if (data.type_transaction && !['ENTREE', 'SORTIE', 'TRANSFERT', 'AJUSTEMENT'].includes(data.type_transaction)) {
      errors.push(`Invalid type_transaction: must be ENTREE, SORTIE, TRANSFERT or AJUSTEMENT, got ${data.type_transaction}`);
    }
  }

  if (table === 'animals') {
    if (data.sexe && !['MALE', 'FEMELLE'].includes(data.sexe)) {
      errors.push(`Invalid sexe: must be MALE or FEMELLE, got ${data.sexe}`);
    }
    if (data.statut && !['ACTIF', 'VENDU', 'DECEDE', 'PERDU', 'ABATTU'].includes(data.statut)) {
      errors.push(`Invalid statut: must be one of ACTIF, VENDU, DECEDE, PERDU, ABATTU, got ${data.statut}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// FK error retry helper
// ============================================================================

async function retryFKErrors(
  fkItems: Array<{ item: SyncQueueItem, change: SyncChange }>,
  lastSyncAt: string,
  farmId: string,
  db: any,
  retryCount: number = 0
): Promise<{ success: number, failed: number }> {
  if (fkItems.length === 0 || retryCount >= 3) {
    return { success: 0, failed: fkItems.length };
  }

  console.log(`[SyncService] Retrying ${fkItems.length} FK errors (attempt ${retryCount + 1}/3)`);

  const fkChanges = fkItems.map(({ change }) => change);
  const fkPayload: SyncPushRequest = {
    changes: fkChanges,
    last_sync_at: lastSyncAt,
    farm_id: farmId,
    sync_request_id: generateUUID(),
  };

  try {
    const response = await api.post('/sync/push', fkPayload);
    const fkResults = response.data?.results || [];

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < fkItems.length; i++) {
      const { item, change } = fkItems[i];
      const result = fkResults[i];

      if (result?.status === 'created' || result?.status === 'updated') {
        await db.execute(
          `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
          [new Date().toISOString(), item.id]
        );
        await db.execute(
          `UPDATE ${item.table_name} SET sync_status = 'synced' WHERE id = ?`,
          [item.record_id]
        );
        successCount++;
      } else {
        // Toujours en erreur FK, réessayer plus tard
        console.warn(`[SyncService] FK retry failed for ${item.table_name}/${item.record_id}:`, result?.reason || result?.error);
        failedCount++;
      }
    }

    // Si certains items sont encore en erreur FK, réessayer récursivement
    if (failedCount > 0 && retryCount < 2) {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000)); // Attendre 1s avant retry
      const remainingItems = fkItems.filter((_, i) =>
        fkResults[i]?.status !== 'created' && fkResults[i]?.status !== 'updated'
      );
      const recursiveResult = await retryFKErrors(remainingItems, lastSyncAt, farmId, db, retryCount + 1);
      successCount += recursiveResult.success;
      failedCount = recursiveResult.failed;
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('[SyncService] FK retry failed:', error);
    return { success: 0, failed: fkItems.length };
  }
}

// ============================================================================
// Dependency-aware chunking helper
// ============================================================================

interface DependencyAwareChunk {
  items: SyncQueueItem[];
  changes: SyncChange[];
  dependencyIds: Set<string>;
}

function createDependencyAwareChunks(
  items: SyncQueueItem[],
  changes: SyncChange[],
  maxChunkSize: number = 50
): DependencyAwareChunk[] {
  const chunks: DependencyAwareChunk[] = [];
  let currentChunk: DependencyAwareChunk = {
    items: [],
    changes: [],
    dependencyIds: new Set()
  };

  const getDependencies = (data: any): string[] => {
    const deps: string[] = [];
    if (data.animal_id) deps.push(data.animal_id);
    if (data.evenement_id) deps.push(data.evenement_id);
    if (data.mother_id) deps.push(data.mother_id);
    if (data.farm_id) deps.push(data.farm_id);
    return deps;
  };

  const hasDependenciesInChunk = (dependencies: string[], chunk: DependencyAwareChunk): boolean => {
    return dependencies.some(dep => chunk.dependencyIds.has(dep));
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const data = JSON.parse(item.data);
    const dependencies = getDependencies(data);
    const itemId = data.id;

    // Vérifier si l'item a des dépendances dans le chunk courant
    const depsInCurrentChunk = hasDependenciesInChunk(dependencies, currentChunk);

    // Vérifier si l'item est une dépendance pour des items déjà dans le chunk
    const isDependencyForChunk = currentChunk.dependencyIds.has(itemId);

    // Si l'item n'est ni dépendant ni dépendance du chunk courant, et que le chunk n'est pas vide
    // et qu'on a atteint la limite, commencer un nouveau chunk
    if (!depsInCurrentChunk && !isDependencyForChunk &&
        currentChunk.items.length > 0 && currentChunk.items.length >= maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = {
        items: [],
        changes: [],
        dependencyIds: new Set()
      };
    }

    // Ajouter l'item au chunk courant
    currentChunk.items.push(item);
    currentChunk.changes.push(changes[i]);

    // Ajouter l'ID et ses dépendances au set de dépendances du chunk
    if (itemId) currentChunk.dependencyIds.add(itemId);
    dependencies.forEach(dep => currentChunk.dependencyIds.add(dep));

    // Force le nouveau chunk si on dépasse significativement la limite (sécurité)
    if (currentChunk.items.length >= maxChunkSize * 1.5) {
      console.warn(`[SyncService] Chunk size exceeded safety limit (${currentChunk.items.length}), forcing new chunk`);
      chunks.push(currentChunk);
      currentChunk = {
        items: [],
        changes: [],
        dependencyIds: new Set()
      };
    }
  }

  // Ajouter le dernier chunk s'il n'est pas vide
  if (currentChunk.items.length > 0) {
    chunks.push(currentChunk);
  }

  console.log(`[SyncService] Created ${chunks.length} dependency-aware chunks from ${items.length} items`);
  return chunks;
}

// ============================================================================
// FIX 3: Internal implementations (no locks) — called only by public wrappers
// ============================================================================

async function _verifySyncConsistency(farmId: string): Promise<{ fixed: number }> {
  const db = await getDatabase();

  try {
    const localSyncedRecords = await getLocalSyncedRecords(db);

    if (localSyncedRecords.length === 0) {
      return { fixed: 0 };
    }

    console.log(`[SyncService] Verifying consistency for ${localSyncedRecords.length} synced records`);

    const request: VerifyConsistencyRequest = {
      farm_id: farmId,
      local_ids: localSyncedRecords,
    };

    const response = await api.post<VerifyConsistencyResponse>('/sync/verify-consistency', request);
    const responseData = response.data;

    if (!responseData.success) {
      console.warn('[SyncService] Consistency verification failed:', responseData);
      return { fixed: 0 };
    }

    const inconsistentRecords = responseData.data?.inconsistent_records || [];
    let fixedCount = 0;

    // FIX: Use executeInTransaction helper
    await executeInTransaction(db, async () => {
      for (const record of inconsistentRecords) {
        await db.execute(
          `UPDATE ${record.table} SET sync_status = 'pending' WHERE id = ?`,
          [record.id]
        );

        const existingQueue = await db.execute(
          `SELECT id FROM sync_queue WHERE table_name = ? AND record_id = ? AND status = 'pending'`,
          [record.table, record.id]
        );

        if (!existingQueue?.rows || existingQueue.rows.length === 0) {
          const recordData = await db.execute(`SELECT * FROM ${record.table} WHERE id = ?`, [record.id]);
          if (recordData?.rows && recordData.rows.length > 0) {
            const data = recordData.rows[0];
            await db.execute(
              `INSERT INTO sync_queue (table_name, record_id, action, data, status, created_at) VALUES (?, ?, 'update', ?, 'pending', ?)`,
              [record.table, record.id, JSON.stringify(data), new Date().toISOString()]
            );
          }
        }

        console.log(`[SyncService] Fixed inconsistent record: ${record.table}/${record.id} (${record.reason})`);
        fixedCount++;
      }
    });

    console.log(`[SyncService] Consistency verification completed: ${fixedCount} records fixed`);
    return { fixed: fixedCount };
  } catch (error) {
    console.error('[SyncService] Consistency verification failed:', error);
    return { fixed: 0 };
  }
}

async function _pushChanges(): Promise<{ success: number; failed: number }> {
  const db = await getDatabase();

  try {
    // Clean up transactions with null categorie_id before sync
    await db.execute(
      `DELETE FROM transactions WHERE categorie_id IS NULL`
    );
    const deletedCount = await db.execute(`SELECT changes() as count`);
    if (deletedCount?.[0]?.count > 0) {
      console.log(`[SyncService] Cleaned up ${deletedCount[0].count} transactions with null categorie_id`);
    }

    // Also clean up sync queue entries for these deleted transactions
    await db.execute(
      `DELETE FROM sync_queue WHERE table_name = 'transactions' AND data LIKE '%"categorie_id":null%'`
    );

    // Reset failed items with FK_MISSING errors to pending for retry
    await db.execute(
      `UPDATE sync_queue SET status = 'pending', error_message = NULL, retry_count = 0 WHERE status = 'failed' AND (error_message LIKE '%FK_MISSING%' OR error_message LIKE '%Référence introuvable%')`
    );
    const resetCount = await db.execute(`SELECT changes() as count`);
    if (resetCount?.[0]?.count > 0) {
      console.log(`[SyncService] Reset ${resetCount[0].count} failed items with FK errors to pending for retry`);
    }

    // Clean up items that have exceeded max retry count (5 retries)
    await db.execute(
      `DELETE FROM sync_queue WHERE status = 'failed' AND retry_count >= 5`
    );
    const cleanupCount = await db.execute(`SELECT changes() as count`);
    if (cleanupCount?.[0]?.count > 0) {
      console.log(`[SyncService] Cleaned up ${cleanupCount[0].count} items that exceeded max retry count`);
    }

    const queueResult = await db.execute(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`
    );
    let allPendingItems: SyncQueueItem[] = [];
    if (queueResult?.rows) {
      allPendingItems = queueResult.rows as SyncQueueItem[];
    } else if (Array.isArray(queueResult)) {
      allPendingItems = queueResult as SyncQueueItem[];
    }

    // Filtrer les items qui ne doivent pas être retryés maintenant (backoff)
    function shouldRetryNow(item: SyncQueueItem): boolean {
      if ((item.retry_count || 0) === 0 || !item.last_retry_at) {
        return true; // Premier essai ou pas de timestamp
      }

      const timeSinceLastRetry = Date.now() - new Date(item.last_retry_at).getTime();
      const backoffDelay = Math.pow(2, item.retry_count || 0) * 1000; // 2^retry_count secondes en ms

      return timeSinceLastRetry >= backoffDelay;
    }

    let pendingItems = allPendingItems.filter(item => shouldRetryNow(item));
    const skippedCount = allPendingItems.length - pendingItems.length;
    if (skippedCount > 0) {
      console.log(`[SyncService] Skipped ${skippedCount} items waiting for backoff`);
    }

    if (pendingItems.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`[SyncService] Found ${pendingItems.length} pending items in sync_queue`);
    pendingItems = sortPendingItemsByDependency(pendingItems);
    console.log(`[SyncService] Sorted pending items by dependency order`);

    for (const item of pendingItems) {
      const data = JSON.parse(item.data);
      console.log(`[SyncService] Pending item: table=${item.table_name}, action=${item.action}, record_id=${item.record_id}, animal_id=${data.animal_id}, id=${data.id}`);
    }

    let farmId = null;
    for (const item of pendingItems) {
      try {
        const data = JSON.parse(item.data);
        if (data.farm_id) {
          farmId = data.farm_id;
          break;
        }
      } catch (e) {
        console.warn('[SyncService] Failed to parse sync_queue data:', e);
      }
    }

    if (!farmId) {
      throw new Error('Cannot determine farm_id from sync_queue');
    }

    const metadataResult = await db.execute(`SELECT last_sync_at FROM sync_metadata WHERE id = 1`);
    let lastSyncAt = null;
    if (metadataResult?.rows) {
      lastSyncAt = metadataResult.rows[0]?.last_sync_at || null;
    } else if (Array.isArray(metadataResult) && metadataResult.length > 0) {
      lastSyncAt = metadataResult[0]?.last_sync_at || null;
    }

    const changes: SyncChange[] = [];
    const validatedItems: SyncQueueItem[] = [];

    for (const item of pendingItems) {
      let data = JSON.parse(item.data);

      // Validation avant envoi
      const validation = validateChange(item.table_name, data);
      if (!validation.valid) {
        console.error(`[SyncService] Validation failed for ${item.table_name}/${item.record_id}:`, validation.errors);
        await db.execute(
          `UPDATE sync_queue SET status = 'failed', error_message = ? WHERE id = ?`,
          [`Validation error: ${validation.errors.join(', ')}`, item.id]
        );
        await db.execute(
          `UPDATE ${item.table_name} SET sync_status = 'pending' WHERE id = ?`,
          [item.record_id]
        );
        continue;
      }

      data = await normalizeForeignKeys(db, item.table_name, data);
      console.log(`[SyncService] Sending ${item.table_name}/${item.record_id} to server:`, JSON.stringify(data, null, 2));
      changes.push({
        table: item.table_name,
        action: item.action,
        data: data,
      });
      validatedItems.push(item);
    }

    // Remplacer pendingItems par validatedItems
    pendingItems = validatedItems;

    // PHASE 4: Dependency-aware chunking - group dependent items together
    const CHUNK_SIZE = 50;
    const chunks = createDependencyAwareChunks(pendingItems, changes, CHUNK_SIZE);

    let totalSuccessCount = 0;
    let totalFailedCount = 0;

    // Process each chunk sequentially
    for (const chunk of chunks) {
      const syncRequestId = generateUUID();

      // Store sync_request_id for each item in the chunk
      for (const item of chunk.items) {
        await db.execute(
          `UPDATE sync_queue SET sync_request_id = ? WHERE id = ?`,
          [syncRequestId, item.id]
        );
      }

      const payload: SyncPushRequest = {
        changes: chunk.changes,
        last_sync_at: lastSyncAt,
        farm_id: farmId,
        sync_request_id: syncRequestId,
      };

      console.log(`[SyncService] Sending chunk with ${chunk.changes.length} items, sync_request_id: ${syncRequestId}`);

      let response;
      try {
        response = await api.post('/sync/push', payload);

        // Check if response is cached
        if (response.data?.cached) {
          console.log(`[SyncService] Using cached response for sync_request_id: ${syncRequestId}`);
        }
      } catch (error: any) {
        // Network error - will be handled in the error processing below
        throw error;
      }
      const responseData = response.data as SyncPushResponse;

      console.log('[SyncService] Server response:', JSON.stringify(responseData, null, 2));

      let successCount = 0;
      let failedCount = 0;
      const results = responseData.data?.results || [];
      const conflicts = responseData.data?.conflicts || [];

      // FIX: Use executeInTransaction helper
      await executeInTransaction(db, async () => {
        for (let i = 0; i < chunk.items.length; i++) {
          const item = chunk.items[i];
          const result = results[i];

          console.log(`[SyncService] Processing item ${item.id} (${item.table_name}):`, {
            action: item.action,
            record_id: item.record_id,
            result: result
          });

          const conflict = conflicts.find((c) => c.record_id === item.record_id && c.table === item.table_name);

          if (conflict) {
            console.warn(`[SyncService] Conflict detected for item ${item.id} (${item.table_name}): ${conflict.reason}`);

            // Get current local record data
            const localRecordResult = await db.execute(`SELECT * FROM ${item.table_name} WHERE id = ?`, [item.record_id]);
            const localRecord = localRecordResult?.[0];

            const resolution = resolveConflict(item, conflict, localRecord);

            if (resolution.strategy === 'server-wins') {
              // Marquer pour pull automatique de la version serveur
              await db.execute(
                `UPDATE sync_queue SET status = 'pending', error_message = 'Conflict: server-wins - will pull server version on next sync' WHERE id = ?`,
                [item.id]
              );

              // Marquer le record local pour pull
              await db.execute(
                `UPDATE ${item.table_name} SET sync_status = 'conflict' WHERE id = ?`,
                [item.record_id]
              );

              console.log(`[SyncService] Item ${item.id} marked for server version pull`);
            } else {
              // Client-wins: incrémenter la version et retry
              const newVersion = (conflict.server_data?.version || 0) + 1;

              await db.execute(
                `UPDATE ${item.table_name} SET version = ? WHERE id = ?`,
                [newVersion, item.record_id]
              );

              // Mettre à jour les données dans sync_queue avec la nouvelle version
              const updatedData = { ...localRecord, version: newVersion };
              await db.execute(
                `UPDATE sync_queue SET data = ?, status = 'pending', error_message = 'Conflict: client-wins - retrying with new version' WHERE id = ?`,
                [JSON.stringify(updatedData), item.id]
              );

              console.log(`[SyncService] Item ${item.id} will retry with version ${newVersion}`);
            }

            failedCount++;
          } else if (result && (result.status === 'created' || result.status === 'updated' || result.status === 'deleted' || result.status === 'conflict')) {
            await db.execute(
              `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
              [new Date().toISOString(), item.id]
            );
            await db.execute(
              `UPDATE ${item.table_name} SET sync_status = 'synced' WHERE id = ?`,
              [item.record_id]
            );
            successCount++;
          } else {
            const errorMessage = (result as any)?.error || (result as any)?.message || result?.status || JSON.stringify(result) || 'Unknown error';
            console.error(`[SyncService] Sync failed for item ${item.id} (${item.table_name}):`, errorMessage);
            console.error(`[SyncService] Full result:`, JSON.stringify(result, null, 2));
            console.error(`[SyncService] Failed item data:`, JSON.parse(item.data));

            // Get current retry_count
            const retryResult = await db.execute(`SELECT retry_count FROM sync_queue WHERE id = ?`, [item.id]);
            const currentRetryCount = retryResult?.[0]?.retry_count || 0;

            // Determine if error is network/server error (retryable) or validation error (permanent)
            const isNetworkError = errorMessage.includes('timeout') ||
                                  errorMessage.includes('network') ||
                                  errorMessage.includes('ETIMEDOUT') ||
                                  errorMessage.includes('ENETUNREACH') ||
                                  errorMessage.includes('5') || // 5xx errors
                                  errorMessage.includes('502') ||
                                  errorMessage.includes('503') ||
                                  errorMessage.includes('504') ||
                                  errorMessage.includes('FK_MISSING') || // Foreign key reference not synced yet - retryable
                                  errorMessage.includes('Référence introuvable'); // French FK error message

            if (isNetworkError) {
              // Network/server error - increment retry_count and keep pending
              const newRetryCount = currentRetryCount + 1;
              const now = new Date().toISOString();
              const backoffDelay = Math.pow(2, newRetryCount) * 1000;

              if (newRetryCount > 5) {
                // Too many retries - mark as failed
                await db.execute(
                  `UPDATE sync_queue SET status = 'failed', error_message = ?, retry_count = ?, last_retry_at = ? WHERE id = ?`,
                  [`Échecs répétés (${newRetryCount} tentatives), vérification manuelle requise: ${errorMessage}`, newRetryCount, now, item.id]
                );
                console.warn(`[SyncService] Item ${item.id} exceeded max retries (5), marking as failed`);
              } else {
                // Keep pending for retry, increment retry_count
                await db.execute(
                  `UPDATE sync_queue SET status = 'pending', error_message = ?, retry_count = ?, last_retry_at = ? WHERE id = ?`,
                  [errorMessage, newRetryCount, now, item.id]
                );
                console.log(`[SyncService] Item ${item.id} will retry (attempt ${newRetryCount}/5) after ${backoffDelay}ms`);
              }
            } else {
              // Validation error (4xx) - mark as failed immediately without retry
              await db.execute(
                `UPDATE sync_queue SET status = 'failed', error_message = ? WHERE id = ?`,
                [`Erreur de validation: ${errorMessage}`, item.id]
              );
              console.warn(`[SyncService] Item ${item.id} failed with validation error, no retry`);
            }

            await db.execute(
              `UPDATE ${item.table_name} SET sync_status = 'pending' WHERE id = ?`,
              [item.record_id]
            );
            failedCount++;
          }
        }
      });

      // Accumulate chunk results
      totalSuccessCount += successCount;
      totalFailedCount += failedCount;

      // Update metadata if this chunk had successes
      if (successCount > 0) {
        await db.execute(
          `UPDATE sync_metadata SET last_push_at = ? WHERE id = 1`,
          [responseData.data?.synced_at || new Date().toISOString()]
        );
      }

      console.log(`[SyncService] Chunk completed: ${successCount} success, ${failedCount} failed`);

      // Retry FK errors immediately after chunk processing
      const fkErrors = chunk.items.filter((_, index) => {
        const result = results[index];
        return result?.error?.includes('FK_MISSING') ||
               result?.error?.includes('Référence introuvable') ||
               result?.code === 'FK_MISSING';
      });

      if (fkErrors.length > 0) {
        console.log(`[SyncService] Found ${fkErrors.length} FK errors, queuing for immediate retry`);

        const fkItems = fkErrors.map((item, index) => ({
          item,
          change: chunk.changes[chunk.items.indexOf(item)]
        }));

        const fkRetryResult = await retryFKErrors(fkItems, lastSyncAt, farmId, db);
        totalSuccessCount += fkRetryResult.success;
        totalFailedCount += fkRetryResult.failed;
      }
    }

    return { success: totalSuccessCount, failed: totalFailedCount };
  } catch (error) {
    console.error('[SyncService] Push changes failed:', error);
    throw error;
  }
}

async function _pullChanges(farmId: string): Promise<{ pulled: number }> {
  const db = await getDatabase();

  try {
    // FIX: Use safeRollback instead of raw ROLLBACK
    await safeRollback(db);

    const metadataResult = await db.execute(`SELECT last_sync_at FROM sync_metadata WHERE id = 1`);
    const lastSyncAt = metadataResult?.[0]?.last_sync_at || null;
    const lastSyncParam = lastSyncAt || '1970-01-01T00:00:00.000Z';

    const response = await api.get('/sync/pull', {
      params: {
        last_sync_at: lastSyncParam,
        farm_id: farmId,
      },
    });
    const responseData = response.data as SyncPullResponse;

    const changesByTable = responseData.data?.changes || {};
    let pulledCount = 0;

    for (const tableName of Object.keys(changesByTable)) {
      const changes = changesByTable[tableName];

      // FIX: Use executeInTransaction helper instead of manual BEGIN/COMMIT/ROLLBACK
      try {
        await executeInTransaction(db, async () => {
          for (const data of changes) {
            const recordId = data.id;
            const selectColumns = tableName === 'farm_user' ? 'version' : 'version, deleted_at';
            const existingResult = await db.execute(
              `SELECT ${selectColumns} FROM ${tableName} WHERE id = ?`,
              [recordId]
            );
            let existing = null;
            if (existingResult?.rows) {
              existing = existingResult.rows[0];
            } else if (Array.isArray(existingResult) && existingResult.length > 0) {
              existing = existingResult[0];
            }

            if (tableName === 'farm_user') {
              if (existing) {
                if (data.version > existing.version) {
                  const columns = Object.keys(data);
                  const setClause = columns.map((col) => `${col} = ?`).join(', ');
                  const values = Object.values(data);
                  await db.execute(
                    `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
                    [...values, recordId]
                  );
                  pulledCount++;
                }
              } else {
                const columns = Object.keys(data);
                const placeholders = columns.map(() => '?').join(', ');
                const values = Object.values(data).map((value) => {
                  if (value !== null && typeof value === 'object') {
                    return JSON.stringify(value);
                  }
                  return value;
                });
                await db.execute(
                  `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
                  values
                );
                pulledCount++;
              }
            } else if (data.deleted_at !== null && data.deleted_at !== undefined) {
              if (existing) {
                await db.execute(
                  `UPDATE ${tableName} SET deleted_at = ?, sync_status = 'synced' WHERE id = ?`,
                  [data.deleted_at, recordId]
                );
                pulledCount++;
              }
            } else {
              if (existing) {
                if (data.version > existing.version) {
                  const columns = Object.keys(data);
                  const setClause = columns.map((col) => `${col} = ?`).join(', ');
                  const values = Object.values(data).map((value) => {
                    if (value !== null && typeof value === 'object') {
                      return JSON.stringify(value);
                    }
                    return value;
                  });
                  await db.execute(
                    `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
                    [...values, recordId]
                  );
                  pulledCount++;
                }
              } else {
                if (tableName === 'transactions' && data.evenement_id) {
                  const localDuplicate = await db.execute(
                    `SELECT id FROM transactions WHERE evenement_id = ? AND id != ?`,
                    [data.evenement_id, data.id]
                  );
                  if (localDuplicate?.rows?.length > 0) {
                    console.log(`[SyncService] Removing local duplicate transaction for evenement ${data.evenement_id}`);
                    await db.execute(`DELETE FROM transactions WHERE id = ?`, [localDuplicate.rows[0].id]);
                  }
                }

                const columns = Object.keys(data);
                const placeholders = columns.map(() => '?').join(', ');
                const values = Object.values(data).map((value) => {
                  if (value !== null && typeof value === 'object') {
                    return JSON.stringify(value);
                  }
                  return value;
                });
                await db.execute(
                  `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
                  values
                );
                pulledCount++;
              }
            }
          }
        });
      } catch (error) {
        console.error(`[SyncService] Error processing pull change for ${tableName}:`, error);
        // Continue with next table — don't let one bad table kill the whole pull
      }
    }

    await db.execute(
      `UPDATE sync_metadata SET last_pull_at = ?, last_sync_at = ? WHERE id = 1`,
      [responseData.data?.synced_at || new Date().toISOString(), responseData.data?.synced_at || new Date().toISOString()]
    );

    return { pulled: pulledCount };
  } catch (error) {
    console.error('[SyncService] Pull changes failed:', error);
    await safeRollback(db);
    throw error;
  }
}

async function _initialSync(): Promise<void> {
  try {
    if (!getIsConnected()) {
      throw new Error('OFFLINE: Cannot perform initial sync while offline');
    }

    console.log('[SyncService] Starting initial sync...');
    const response = await api.post('/sync/initial');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Initial sync failed');
    }

    const data = response.data.data;
    console.log('[SyncService] Initial sync data received:', data);
    
    const actualData = data.data || data;
    const now = new Date().toISOString();
    
    console.log('[SyncService] Categories in initial sync:', actualData.categories?.length || 0);
    if (actualData.categories?.length > 0) {
      console.log('[SyncService] Sample categories:', actualData.categories.slice(0, 3));
    }

    const allStatements = [
      ...(actualData.farms?.length ? buildFarmUpsertStatements(actualData.farms, now) : []),
      ...(actualData.farm_user?.length ? buildFarmUserUpsertStatements(actualData.farm_user, now) : []),
      ...(actualData.especes?.length ? buildEspeceUpsertStatements(actualData.especes, now) : []),
      ...(actualData.categories?.length ? buildCategorieUpsertStatements(actualData.categories, now) : []),
      ...(actualData.type_evenements?.length ? buildTypeEvenementUpsertStatements(actualData.type_evenements, now) : []),
    ];

    if (allStatements.length === 0) {
      console.log('[SyncService] No data to upsert during initial sync');
      return;
    }

    const db = await getDatabase();
    try {
      await db.executeBatch(allStatements);
      console.log(`[SyncService] Initial sync batch executed: ${allStatements.length} statements`);
    } catch (error) {
      console.error('[SyncService] Initial sync batch failed:', error);
      throw error;
    }

    // Fallback: Ensure default categories exist if backend didn't send them
    await ensureDefaultCategoriesExist();
    console.log('[SyncService] Ensured default categories exist');

    await AsyncStorage.setItem('initial_sync_at', new Date().toISOString());
    console.log('[SyncService] Initial sync completed successfully');
    syncEvents.emit('sync:initial:completed');
  } catch (error) {
    console.error('[SyncService] Initial sync failed:', error);
    throw error;
  } finally {
    initialSyncInFlight = null;
  }
}

async function _fullSync(farmId: string, skipPush: boolean = false): Promise<void> {
  if (!getIsConnected()) {
    throw new Error('OFFLINE: Cannot sync while offline');
  }

  try {
    console.log('[SyncService] Starting consistency verification...');
    const consistencyResult = await _verifySyncConsistency(farmId);
    if (consistencyResult.fixed > 0) {
      console.log(`[SyncService] Fixed ${consistencyResult.fixed} inconsistent records before sync`);
    }

    const pullResult = await _pullChanges(farmId);
    console.log(`[SyncService] Pull completed: ${pullResult.pulled} records pulled`);

    if (skipPush) {
      console.log('[SyncService] Skipping push (skipPush=true)');
      return;
    }

    const pushResult = await _pushChanges();
    console.log(`[SyncService] Push completed: ${pushResult.success} synced, ${pushResult.failed} failed`);

    if (pushResult.failed > 0) {
      console.warn(`[SyncService] ${pushResult.failed} changes failed to sync`);
    }

    syncEvents.emit('sync:full:completed');
  } catch (error) {
    console.error('[SyncService] Full sync failed:', error);
    // FIX: Use safeRollback instead of raw ROLLBACK
    try {
      const db = await getDatabase();
      await safeRollback(db);
    } catch (rollbackError) {
      // Ignore
    }
    throw error;
  }
}

// ============================================================================
// FIX 4: Public API — all entry points acquire the global sync lock
// ============================================================================

export async function verifySyncConsistency(farmId: string): Promise<{ fixed: number }> {
  return withSyncLock(() => _verifySyncConsistency(farmId));
}

export async function pushChanges(): Promise<{ success: number; failed: number }> {
  return withSyncLock(() => _pushChanges());
}

export async function pullChanges(farmId: string): Promise<{ pulled: number }> {
  return withSyncLock(() => _pullChanges(farmId));
}

export async function fullSync(farmId: string, skipPush: boolean = false): Promise<void> {
  return withSyncLock(() => _fullSync(farmId, skipPush));
}

export async function initialSync(): Promise<void> {
  if (initialSyncInFlight) {
    console.log('[SyncService] Initial sync already in progress, awaiting existing call');
    return initialSyncInFlight;
  }
  
  initialSyncInFlight = withSyncLock(() => _initialSync());
  
  try {
    return await initialSyncInFlight;
  } finally {
    initialSyncInFlight = null;
  }
}
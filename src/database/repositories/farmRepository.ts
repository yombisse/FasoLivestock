import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { Farm } from '../../types/farm.types';
import { BatchStatement } from '../batchTypes';

/**
 * Get all farms (non-deleted)
 * Returns all farms since user scope is guaranteed by /sync/initial on server side
 */
export async function getFarms(): Promise<Farm[]> {
  try {
    const farms = await database.get('farms')
      .query(Q.where('deleted_at', null))
      .fetch();
    return farms as unknown as Farm[];
  } catch (error) {
    console.error('[FarmRepository] Error fetching farms:', error);
    throw error;
  }
}

/**
 * Get a single farm by ID (including deleted for upsert checks)
 */
export async function getFarmById(id: string, includeDeleted: boolean = false): Promise<Farm | null> {
  try {
    let query;
    if (!includeDeleted) {
      query = database.get('farms').query(Q.where('api_id', id), Q.where('deleted_at', null));
    } else {
      query = database.get('farms').query(Q.where('api_id', id));
    }
    const farms = await query.fetch();
    return farms.length > 0 ? (farms[0] as unknown as Farm) : null;
  } catch (error) {
    console.error('[FarmRepository] Error fetching farm by id:', error);
    throw error;
  }
}

/**
 * Build batch statements for farm upserts (pure function, no DB execution)
 * Used with executeBatch for atomic operations
 * @param farms - Array of farms to upsert
 * @param now - Current timestamp string
 * @returns Array of [sql, params] tuples for batch execution
 */
export function buildFarmUpsertStatements(farms: Farm[], now: string): BatchStatement[] {
  return farms.map((farm) => [
    `INSERT INTO farms (
      id, name, location, description, type_elevage, photo, owner_id,
      status, sync_status, version, last_sync_at, deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', 1, ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      location = excluded.location,
      description = excluded.description,
      type_elevage = excluded.type_elevage,
      photo = excluded.photo,
      owner_id = excluded.owner_id,
      status = excluded.status,
      sync_status = 'synced',
      last_sync_at = excluded.last_sync_at,
      updated_at = excluded.updated_at,
      version = version + 1,
      deleted_at = NULL`,
    [
      farm.id,
      farm.name,
      farm.location || null,
      farm.description || null,
      farm.type_elevage || null,
      farm.photo || null,
      farm.owner_id,
      farm.status || null,
      now,
      farm.created_at || now,
      farm.updated_at || now,
    ],
  ]);
}

/**
 * Upsert farms (insert or update)
 * Used during sync to store farms from backend
 * @param farms - Array of farms to upsert
 * @param tx - Optional transaction object for atomic operations (ignored in WatermelonDB)
 */
export async function upsertFarms(farms: Farm[], tx?: any): Promise<void> {
  try {
    await database.write(async () => {
      const collection = database.get('farms');
      
      for (const farm of farms) {
        const existing = await collection.query(Q.where('api_id', farm.id)).fetch();
        
        if (existing.length > 0) {
          // Update existing - ne pas définir les champs readonly
          await existing[0].update((record: any) => {
            record.name = farm.name;
            record.location = farm.location || null;
            record.description = farm.description || null;
            record.type_elevage = farm.type_elevage || null;
            record.photo = farm.photo || null;
            record.owner_id = farm.owner_id;
            record.status = farm.status || null;
            // last_sync_at, updated_at sont readonly - gérés par WatermelonDB
          });
        } else {
          // Create new - ne pas définir les champs readonly
          await collection.create((record: any) => {
            record.id = farm.id;
            record.name = farm.name;
            record.location = farm.location || null;
            record.description = farm.description || null;
            record.type_elevage = farm.type_elevage || null;
            record.photo = farm.photo || null;
            record.owner_id = farm.owner_id;
            record.status = farm.status || null;
            record.last_modified_by = farm.last_modified_by || null;
            // created_at, updated_at, deleted_at, last_sync_at sont readonly - gérés par WatermelonDB
          });
        }
      }
    });

    console.log(`[FarmRepository] Upserted ${farms.length} farms`);
  } catch (error) {
    console.error('[FarmRepository] Error upserting farms:', error);
    throw error;
  }
}

/**
 * Update last_sync_at for a farm
 */
export async function updateFarmSyncTime(farmId: string): Promise<void> {
  try {
    await database.write(async () => {
      const collection = database.get('farms');
      const farm = await collection.find(farmId);
      await farm.update((record: any) => {
        record.last_sync_at = Date.now();
      });
    });

    console.log(`[FarmRepository] Updated sync time for farm ${farmId}`);
  } catch (error) {
    console.error('[FarmRepository] Error updating farm sync time:', error);
    throw error;
  }
}

/**
 * Soft delete a farm (deleted_at timestamp)
 */
export async function deleteFarm(id: string): Promise<void> {
  try {
    await database.write(async () => {
      const collection = database.get('farms');
      const farm = await collection.find(id);
      await farm.update((record: any) => {
        record.deleted_at = Date.now();
        record.updated_at = Date.now();
      });
    });

    console.log('[FarmRepository] Deleted farm:', id);
  } catch (error) {
    console.error('[FarmRepository] Error deleting farm:', error);
    throw error;
  }
}

/**
 * Get farms that need sync (sync_status = 'pending')
 * Note: WatermelonDB uses _status internally, not sync_status column
 * This function returns all farms that have been modified locally
 */
export async function getPendingFarms(): Promise<Farm[]> {
  try {
    // WatermelonDB tracks sync status via _status field internally
    // For now, return all non-deleted farms as sync candidates
    const farms = await database.get('farms')
      .query(Q.where('deleted_at', null))
      .fetch();
    return farms as unknown as Farm[];
  } catch (error) {
    console.error('[FarmRepository] Error fetching pending farms:', error);
    throw error;
  }
}

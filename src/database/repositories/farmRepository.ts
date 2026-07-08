import { getDatabase } from '../connection';
import { Farm } from '../../types/farm.types';
import { BatchStatement } from '../batchTypes';

/**
 * Get all farms (non-deleted)
 * Returns all farms since user scope is guaranteed by /sync/initial on server side
 */
export async function getFarms(): Promise<Farm[]> {
  try {
    const db = await getDatabase();
    
    const result = await db.execute(
      `SELECT * FROM farms 
       WHERE deleted_at IS NULL 
       ORDER BY created_at DESC`
    );

    const farms = (result.rows || []) as Farm[];
    return farms;
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
    const db = await getDatabase();
    const deletedFilter = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const result = await db.execute(
      `SELECT * FROM farms WHERE id = ? ${deletedFilter}`,
      [id]
    );

    const farms = result.rows?._array || [];
    return farms.length > 0 ? (farms[0] as Farm) : null;
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
 * Upsert farms (insert or update) - atomic using ON CONFLICT
 * Used during sync to store farms from backend
 * @param farms - Array of farms to upsert
 * @param tx - Optional transaction object for atomic operations
 */
export async function upsertFarms(farms: Farm[], tx?: any): Promise<void> {
  try {
    const db = tx || (await getDatabase());
    const now = new Date().toISOString();

    for (const farm of farms) {
      // Atomic UPSERT using ON CONFLICT - eliminates race condition
      await db.execute(
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
        ]
      );
    }

    console.log(`[FarmRepository] Upserted ${farms.length} farms atomically`);
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
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE farms SET last_sync_at = ? WHERE id = ?`,
      [now, farmId]
    );

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
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE farms 
       SET deleted_at = ?, updated_at = ?, version = version + 1, sync_status = 'pending'
       WHERE id = ?`,
      [now, now, id]
    );

    console.log('[FarmRepository] Deleted farm:', id);
  } catch (error) {
    console.error('[FarmRepository] Error deleting farm:', error);
    throw error;
  }
}

/**
 * Get farms that need sync (sync_status = 'pending')
 */
export async function getPendingFarms(): Promise<Farm[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM farms WHERE sync_status = 'pending' AND deleted_at IS NULL`
    );

    return (result.rows?._array || []) as Farm[];
  } catch (error) {
    console.error('[FarmRepository] Error fetching pending farms:', error);
    throw error;
  }
}

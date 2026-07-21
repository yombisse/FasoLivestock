import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { FarmUser } from '../../types/farm.types';
import { BatchStatement } from '../batchTypes';

/**
 * Get all farm_user relations for a user
 */
export async function getFarmUsersByUserId(userId: string): Promise<FarmUser[]> {
  try {
    const farmUsers = await database.get('farm_user')
      .query(Q.where('user_id', userId))
      .fetch();
    return farmUsers as unknown as FarmUser[];
  } catch (error) {
    console.error('[FarmUserRepository] Error fetching farm_users by user_id:', error);
    throw error;
  }
}

/**
 * Get all farm_user relations for a farm
 */
export async function getFarmUsersByFarmId(farmId: string): Promise<FarmUser[]> {
  try {
    const farmUsers = await database.get('farm_user')
      .query(Q.where('farm_id', farmId))
      .fetch();
    return farmUsers as unknown as FarmUser[];
  } catch (error) {
    console.error('[FarmUserRepository] Error fetching farm_users by farm_id:', error);
    throw error;
  }
}

/**
 * Get a single farm_user relation by ID
 */
export async function getFarmUserById(id: string): Promise<FarmUser | null> {
  try {
    const farmUsers = await database.get('farm_user')
      .query(Q.where('id', id))
      .fetch();
    return farmUsers.length > 0 ? (farmUsers[0] as unknown as FarmUser) : null;
  } catch (error) {
    console.error('[FarmUserRepository] Error fetching farm_user by id:', error);
    throw error;
  }
}

/**
 * Build batch statements for farm_user upserts (pure function, no DB execution)
 * Used with executeBatch for atomic operations
 * @param farmUsers - Array of farm_user relations to upsert
 * @param now - Current timestamp string
 * @returns Array of [sql, params] tuples for batch execution
 */
export function buildFarmUserUpsertStatements(farmUsers: FarmUser[], now: string): BatchStatement[] {
  return farmUsers.map((farmUser) => [
    `INSERT INTO farm_user (
      id, farm_id, user_id, role, sync_status, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'synced', 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      farm_id = excluded.farm_id,
      user_id = excluded.user_id,
      role = excluded.role,
      sync_status = 'synced',
      updated_at = excluded.updated_at,
      version = version + 1`,
    [
      farmUser.id,
      farmUser.farm_id,
      farmUser.user_id,
      farmUser.role || null,
      farmUser.created_at || now,
      farmUser.updated_at || now,
    ],
  ]);
}

/**
 * Upsert farm_user relations (insert or update)
 * Used during sync to store farm_user from backend
 * @param farmUsers - Array of farm_user relations to upsert
 * @param tx - Optional transaction object for atomic operations (ignored in WatermelonDB)
 */
export async function upsertFarmUsers(farmUsers: FarmUser[], tx?: any): Promise<void> {
  try {
    await database.write(async () => {
      const collection = database.get('farm_user');
      
      for (const farmUser of farmUsers) {
        const existing = await collection.query(Q.where('id', farmUser.id)).fetch();
        
        if (existing.length > 0) {
          // Update existing
          await existing[0].update((record: any) => {
            record.farm_id = farmUser.farm_id;
            record.user_id = farmUser.user_id;
            record.role = farmUser.role || null;
            record.updated_at = farmUser.updated_at ? new Date(farmUser.updated_at).getTime() : Date.now();
          });
        } else {
          // Create new
          await collection.create((record: any) => {
            record.id = farmUser.id;
            record.farm_id = farmUser.farm_id;
            record.user_id = farmUser.user_id;
            record.role = farmUser.role || null;
            record.created_at = farmUser.created_at ? new Date(farmUser.created_at).getTime() : Date.now();
            record.updated_at = farmUser.updated_at ? new Date(farmUser.updated_at).getTime() : Date.now();
          });
        }
      }
    });

    console.log(`[FarmUserRepository] Upserted ${farmUsers.length} farm_user relations`);
  } catch (error) {
    console.error('[FarmUserRepository] Error upserting farm_users:', error);
    throw error;
  }
}

/**
 * Get farm_user relations that need sync (sync_status = 'pending')
 * Note: WatermelonDB uses _status internally, not sync_status column
 * This function returns all farm_user relations as sync candidates
 */
export async function getPendingFarmUsers(): Promise<FarmUser[]> {
  try {
    // WatermelonDB tracks sync status via _status field internally
    // For now, return all farm_user relations as sync candidates
    const farmUsers = await database.get('farm_user')
      .query()
      .fetch();
    return farmUsers as unknown as FarmUser[];
  } catch (error) {
    console.error('[FarmUserRepository] Error fetching pending farm_users:', error);
    throw error;
  }
}

/**
 * Delete farm_user relation by ID
 */
export async function deleteFarmUser(id: string): Promise<void> {
  try {
    await database.write(async () => {
      const collection = database.get('farm_user');
      const farmUser = await collection.find(id);
      await farmUser.destroyPermanently();
    });

    console.log('[FarmUserRepository] Deleted farm_user:', id);
  } catch (error) {
    console.error('[FarmUserRepository] Error deleting farm_user:', error);
    throw error;
  }
}

/**
 * Delete all farm_user relations for a farm
 */
export async function deleteFarmUsersByFarmId(farmId: string): Promise<void> {
  try {
    await database.write(async () => {
      const collection = database.get('farm_user');
      const farmUsers = await collection.query(Q.where('farm_id', farmId)).fetch();
      for (const farmUser of farmUsers) {
        await farmUser.destroyPermanently();
      }
    });

    console.log('[FarmUserRepository] Deleted farm_users for farm:', farmId);
  } catch (error) {
    console.error('[FarmUserRepository] Error deleting farm_users by farm_id:', error);
    throw error;
  }
}

import { getDatabase } from '../connection';
import { FarmUser } from '../../types/farm.types';
import { BatchStatement } from '../batchTypes';

/**
 * Get all farm_user relations for a user
 */
export async function getFarmUsersByUserId(userId: string): Promise<FarmUser[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM farm_user WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return (result.rows || []) as FarmUser[];
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
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM farm_user WHERE farm_id = ? ORDER BY created_at DESC`,
      [farmId]
    );

    return (result.rows || []) as FarmUser[];
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
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM farm_user WHERE id = ?`,
      [id]
    );

    const farmUsers = result.rows || [];
    return farmUsers.length > 0 ? (farmUsers[0] as FarmUser) : null;
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
 * Upsert farm_user relations (insert or update) - atomic using ON CONFLICT
 * Used during sync to store farm_user from backend
 * @param farmUsers - Array of farm_user relations to upsert
 * @param tx - Optional transaction object for atomic operations
 */
export async function upsertFarmUsers(farmUsers: FarmUser[], tx?: any): Promise<void> {
  try {
    const db = tx || (await getDatabase());
    const now = new Date().toISOString();

    for (const farmUser of farmUsers) {
      // Atomic UPSERT using ON CONFLICT - eliminates race condition
      await db.execute(
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
        ]
      );
    }

    console.log(`[FarmUserRepository] Upserted ${farmUsers.length} farm_user relations atomically`);
  } catch (error) {
    console.error('[FarmUserRepository] Error upserting farm_users:', error);
    throw error;
  }
}

/**
 * Get farm_user relations that need sync (sync_status = 'pending')
 */
export async function getPendingFarmUsers(): Promise<FarmUser[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM farm_user WHERE sync_status = 'pending'`
    );

    return (result.rows || []) as FarmUser[];
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
    const db = await getDatabase();
    await db.execute(
      `DELETE FROM farm_user WHERE id = ?`,
      [id]
    );

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
    const db = await getDatabase();
    await db.execute(
      `DELETE FROM farm_user WHERE farm_id = ?`,
      [farmId]
    );

    console.log('[FarmUserRepository] Deleted farm_users for farm:', farmId);
  } catch (error) {
    console.error('[FarmUserRepository] Error deleting farm_users by farm_id:', error);
    throw error;
  }
}

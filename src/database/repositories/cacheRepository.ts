import { getDatabase } from '../connection';

export interface CacheEntry {
  payload: any;
  cachedAt: string;
}

/**
 * Get cached data by key
 * @param key - Cache key (e.g., 'dashboard:{farm_id}', 'mouvements_history:{animal_id}:{page}')
 * @returns Cached entry or null if not found
 */
export async function getCache(key: string): Promise<CacheEntry | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT payload, cached_at FROM api_cache WHERE cache_key = ?`,
      [key]
    );

    let entry = null;
    if (result?.rows) {
      entry = result.rows[0];
    } else if (Array.isArray(result) && result.length > 0) {
      entry = result[0];
    }

    if (!entry) {
      return null;
    }

    return {
      payload: JSON.parse(entry.payload),
      cachedAt: entry.cached_at,
    };
  } catch (error) {
    console.error(`[CacheRepository] Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data
 * @param key - Cache key
 * @param farmId - Farm ID (can be null for reference data)
 * @param payload - Data to cache (will be JSON stringified)
 */
export async function setCache(
  key: string,
  farmId: string | null,
  payload: any
): Promise<void> {
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT OR REPLACE INTO api_cache (cache_key, farm_id, payload, cached_at) VALUES (?, ?, ?, ?)`,
      [key, farmId, JSON.stringify(payload), now]
    );
  } catch (error) {
    console.error(`[CacheRepository] Error setting cache for key ${key}:`, error);
    throw error;
  }
}

/**
 * Clear cached data by key
 * @param key - Cache key to clear
 */
export async function clearCache(key: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execute(`DELETE FROM api_cache WHERE cache_key = ?`, [key]);
  } catch (error) {
    console.error(`[CacheRepository] Error clearing cache for key ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all cached data for a specific farm
 * @param farmId - Farm ID
 */
export async function clearFarmCache(farmId: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execute(`DELETE FROM api_cache WHERE farm_id = ?`, [farmId]);
  } catch (error) {
    console.error(`[CacheRepository] Error clearing cache for farm ${farmId}:`, error);
    throw error;
  }
}

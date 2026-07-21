import { getDatabase } from '../connection';

export interface CacheEntry {
  payload: any;
  cachedAt: string;
}

/**
 * Get cached data by key
 * @param key - Cache key (e.g., 'dashboard:{farm_id}', 'mouvements_history:{animal_id}:{page}')
 * @returns Cached entry or null if not found
 *
 * NOTE: Cache is disabled for WatermelonDB compatibility
 * WatermelonDB has its own caching mechanism via observation
 */
export async function getCache(key: string): Promise<CacheEntry | null> {
  // Cache disabled - WatermelonDB handles caching via observation
  return null;
}

/**
 * Set cached data
 * @param key - Cache key
 * @param farmId - Farm ID (can be null for reference data)
 * @param payload - Data to cache (will be JSON stringified)
 *
 * NOTE: Cache is disabled for WatermelonDB compatibility
 * WatermelonDB has its own caching mechanism via observation
 */
export async function setCache(
  key: string,
  farmId: string | null,
  payload: any
): Promise<void> {
  // Cache disabled - WatermelonDB handles caching via observation
  console.log(`[CacheRepository] Cache disabled for key ${key} (WatermelonDB compatibility)`);
}

/**
 * Clear cached data by key
 * @param key - Cache key to clear
 *
 * NOTE: Cache is disabled for WatermelonDB compatibility
 */
export async function clearCache(key: string): Promise<void> {
  // Cache disabled - no-op
}

/**
 * Clear all cached data for a specific farm
 * @param farmId - Farm ID
 *
 * NOTE: Cache is disabled for WatermelonDB compatibility
 */
export async function clearFarmCache(farmId: string): Promise<void> {
  // Cache disabled - no-op
}

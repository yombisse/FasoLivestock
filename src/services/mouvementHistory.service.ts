import api from './api';
import { getIsConnected } from '../utils/networkStatus';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { MouvementHistoryResponse, TracabiliteResponse } from '../types/mouvement.types';

export interface MouvementHistoryResult {
  data: MouvementHistoryResponse['data'];
  fromCache: boolean;
  cachedAt: string | null;
}

export interface TracabiliteResult {
  data: TracabiliteResponse['data'];
  fromCache: boolean;
  cachedAt: string | null;
}

/**
 * Get animal movements history with cache-then-network pattern
 * @param animalId - Animal ID
 * @param page - Page number (default: 1)
 * @returns Movements history with cache status
 */
export async function getAnimalMouvements(
  animalId: string,
  page: number = 1
): Promise<MouvementHistoryResult> {
  const cacheKey = `mouvements_history:${animalId}:${page}`;
  const isConnected = getIsConnected();

  // Try network first if connected
  if (isConnected) {
    try {
      const response = await api.get<MouvementHistoryResponse>(
        `/animals/${animalId}/mouvements`,
        { params: { per_page: 20, page } }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const now = new Date().toISOString();

        // Cache the response
        await setCache(cacheKey, null, data);

        return {
          data,
          fromCache: false,
          cachedAt: now,
        };
      } else {
        throw new Error(response.data.message || 'Invalid movements response');
      }
    } catch (networkError: any) {
      console.warn('[MouvementHistoryService] Network request failed, falling back to cache:', networkError.message);
      // Fall through to cache
    }
  }

  // Try cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return {
      data: cached.payload,
      fromCache: true,
      cachedAt: cached.cachedAt,
    };
  }

  // No network and no cache
  throw new Error('Aucune donnée disponible hors ligne. Connexion requise pour charger l\'historique des mouvements.');
}

/**
 * Get animal tracability with cache-then-network pattern
 * @param animalId - Animal ID
 * @returns Tracability data with cache status
 */
export async function getAnimalTracabilite(animalId: string): Promise<TracabiliteResult> {
  const cacheKey = `tracabilite:${animalId}`;
  const isConnected = getIsConnected();

  // Try network first if connected
  if (isConnected) {
    try {
      const response = await api.get<TracabiliteResponse>(`/mouvements/trace/${animalId}`);

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const now = new Date().toISOString();

        // Cache the response
        await setCache(cacheKey, null, data);

        return {
          data,
          fromCache: false,
          cachedAt: now,
        };
      } else {
        throw new Error(response.data.message || 'Invalid tracability response');
      }
    } catch (networkError: any) {
      console.warn('[MouvementHistoryService] Network request failed, falling back to cache:', networkError.message);
      // Fall through to cache
    }
  }

  // Try cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return {
      data: cached.payload,
      fromCache: true,
      cachedAt: cached.cachedAt,
    };
  }

  // No network and no cache
  throw new Error('Aucune donnée disponible hors ligne. Connexion requise pour charger la traçabilité.');
}

import api from './api';
import { Farm, FarmsResponse, FarmUser } from '../types/farm.types';
import { getFarms as getLocalFarms } from '../database/repositories/farmRepository';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { authStorage } from '../storage/authStorage';

class FarmService {
  /**
   * Récupérer la liste des fermes
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getFarms(): Promise<Farm[]> {
    // Try local database first
    try {
      const localFarms = await getLocalFarms();
      console.log(`[FarmService] DEBUG: Local read returned ${localFarms.length} farms`);
      if (localFarms.length > 0) {
        return localFarms;
      }
    } catch (localError) {
      console.error('[FarmService] Local read failed:', localError);
    }

    // Fallback to network if local read fails
    try {
      console.log('[FarmService] DEBUG: Local read returned 0 farms, trying network API');
      const response = await api.get<FarmsResponse>('/farms');
      console.log(`[FarmService] DEBUG: API response success=${response.data.success}, data=${JSON.stringify(response.data.data)}`);
      if (response.data.success && response.data.data?.farms) {
        console.log(`[FarmService] DEBUG: API returned ${response.data.data.farms.length} farms`);
        return response.data.data.farms;
      }
      throw new Error('Format de réponse invalide');
    } catch (error: any) {
      console.error('[FarmService] DEBUG: Network API failed:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erreur lors du chargement des fermes');
    }
  }

  /**
   * Récupérer les relations farm-user
   * EXCEPTION: Kept as network call with cache-then-network pattern.
   * Justification: Farm-user relations are server-side permissions that should be synced
   * via sync pull. No local table exists for this relation yet.
   */
  async getFarmUsers(): Promise<FarmUser[]> {
    const cacheKey = 'farm_users';
    
    // Try cache first
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[FarmService] Farm users from cache');
        return cached.payload;
      }
    } catch (cacheError) {
      console.warn('[FarmService] Cache read failed:', cacheError);
    }

    // Network call
    try {
      const response = await api.get('/farm-users');
      if (response.data.success && response.data.data?.farm_users) {
        // Cache the result
        try {
          await setCache(cacheKey, 'global', response.data.data.farm_users);
        } catch (cacheError) {
          console.warn('[FarmService] Cache write failed:', cacheError);
        }
        return response.data.data.farm_users;
      }
      throw new Error('Format de réponse invalide');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erreur lors du chargement des relations farm-user');
    }
  }

  /**
   * Définir la ferme courante
   * EXCEPTION: Kept as network call.
   * Justification: This is a server-side session setting that must be communicated to the backend.
   * No local equivalent exists.
   */
  async setCurrentFarm(farmId: string): Promise<void> {
    try {
      const response = await api.post(`/farms/${farmId}/current`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la définition de la ferme courante');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erreur lors de la définition de la ferme courante');
    }
  }
}

export default new FarmService();

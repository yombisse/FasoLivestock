import api from './api';
import { Espece, EspecesResponse } from '../types/espece.types';
import { getLocalEspeces } from '../database/repositories/especeRepository';
import { getCache, setCache } from '../database/repositories/cacheRepository';

const ESPECES_ENDPOINT = '/especes';

class EspeceService {
  /**
   * Récupérer la liste des espèces
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getEspeces(): Promise<Espece[]> {
    // Try local database first
    try {
      const localEspeces = await getLocalEspeces();
      if (localEspeces.length > 0) {
        return localEspeces;
      }
    } catch (localError) {
      console.error('[EspeceService] Local read failed:', localError);
    }

    // Fallback to cache
    const cacheKey = 'especes';
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[EspeceService] Especes from cache');
        return cached.payload;
      }
    } catch (cacheError) {
      console.warn('[EspeceService] Cache read failed:', cacheError);
    }

    // Fallback to network if local and cache fail
    try {
      const response = await api.get(ESPECES_ENDPOINT);
      
      if (response.data.success && response.data.data?.especes) {
        // Cache the result
        try {
          await setCache(cacheKey, 'global', response.data.data.especes);
        } catch (cacheError) {
          console.warn('[EspeceService] Cache write failed:', cacheError);
        }
        return response.data.data.especes;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la récupération des espèces');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de la récupération des espèces';
      console.error('Error fetching especes:', message);
      throw new Error(message);
    }
  }
}

export default new EspeceService();

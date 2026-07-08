import api from './api';
import { farmStorage } from '../storage/farmStorage';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { SanteHistoriqueAnimalResponse } from '../types/sante.types';

/**
 * Santé (Health) Service
 * Handles health-related API calls with offline-first cache-then-network pattern
 */

const santeService = {
  /**
   * Get upcoming reminders (a-venir)
   */
  async getRappelsAVenir(farmId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_rappels_a_venir:${farmId}`;

    try {
      // Network request first
      const response = await api.get('/sante/rappels/a-venir', {
        params: { farm_id: farmId },
      });
      const data = response.data?.data || {};

      // Cache the result
      await setCache(cacheKey, farmId, data);

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching rappels a-venir:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Rappels a-venir from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get overdue reminders (en-retard)
   */
  async getRappelsEnRetard(farmId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_rappels_en_retard:${farmId}`;

    try {
      // Network request first
      const response = await api.get('/sante/rappels/en-retard', {
        params: { farm_id: farmId },
      });
      const data = response.data?.data || {};

      // Cache the result
      await setCache(cacheKey, farmId, data);

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching rappels en-retard:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Rappels en-retard from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get medical history for an animal
   */
  async getHistoriqueMedical(animalId: string): Promise<SanteHistoriqueAnimalResponse> {
    const cacheKey = `sante_historique_medical:${animalId}`;

    try {
      // Network request first
      const response = await api.get(`/sante/animals/${animalId}/historique-medical`);
      const data = response.data?.data || {};

      // Cache the result
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        await setCache(cacheKey, farm.id, data);
      }

      return response.data;
    } catch (error: any) {
      console.error('[SanteService] Error fetching historique medical:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Historique medical from cache (fallback)');
        return {
          success: true,
          message: 'Données chargées depuis le cache',
          data: cached.payload,
        };
      }
      throw error;
    }
  },

  /**
   * Get health statistics for an animal
   */
  async getAnimalStatistiquesSanitaires(animalId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_statistiques_sanitaires:${animalId}`;

    try {
      // Network request first
      const response = await api.get(`/sante/animals/${animalId}/statistiques-sanitaires`);
      const data = response.data?.data || {};

      // Cache the result
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        await setCache(cacheKey, farm.id, data);
      }

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching statistiques sanitaires:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Statistiques sanitaires from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get vaccinations for an animal
   */
  async getAnimalVaccinations(animalId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_vaccinations:${animalId}`;

    try {
      // Network request first
      const response = await api.get(`/sante/animals/${animalId}/vaccinations`);
      const data = response.data?.data || {};

      // Cache the result
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        await setCache(cacheKey, farm.id, data);
      }

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching vaccinations:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Vaccinations from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get treatments for an animal
   */
  async getAnimalTraitements(animalId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_traitements:${animalId}`;

    try {
      // Network request first
      const response = await api.get(`/sante/animals/${animalId}/traitements`);
      const data = response.data?.data || {};

      // Cache the result
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        await setCache(cacheKey, farm.id, data);
      }

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching traitements:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Traitements from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get diseases for an animal
   */
  async getAnimalMaladies(animalId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_maladies:${animalId}`;

    try {
      // Network request first
      const response = await api.get(`/sante/animals/${animalId}/maladies`);
      const data = response.data?.data || {};

      // Cache the result
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        await setCache(cacheKey, farm.id, data);
      }

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching maladies:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Maladies from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get consultations for an animal
   */
  async getAnimalConsultations(animalId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_consultations:${animalId}`;

    try {
      // Network request first
      const response = await api.get(`/sante/animals/${animalId}/consultations`);
      const data = response.data?.data || {};

      // Cache the result
      const farm = await farmStorage.getActiveFarm();
      if (farm) {
        await setCache(cacheKey, farm.id, data);
      }

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching consultations:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Consultations from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get farm health summary
   */
  async getResumeFerme(farmId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_resume_ferme:${farmId}`;

    try {
      // Network request first
      const response = await api.get('/sante/resume-ferme', {
        params: { farm_id: farmId },
      });
      const data = response.data?.data || {};

      // Cache the result
      await setCache(cacheKey, farmId, data);

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching resume ferme:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Resume ferme from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get farm health alerts
   */
  async getAlertesFerme(farmId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_alertes_ferme:${farmId}`;

    try {
      // Network request first
      const response = await api.get('/sante/alertes-ferme', {
        params: { farm_id: farmId },
      });
      const data = response.data?.data || {};

      // Cache the result
      await setCache(cacheKey, farmId, data);

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching alertes ferme:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Alertes ferme from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  /**
   * Get health statistics by type
   */
  async getStatistiquesParType(farmId: string): Promise<{ data: any; fromCache: boolean; cachedAt: string | null }> {
    const cacheKey = `sante_statistiques_par_type:${farmId}`;

    try {
      // Network request first
      const response = await api.get('/sante/statistiques-par-type', {
        params: { farm_id: farmId },
      });
      const data = response.data?.data || {};

      // Cache the result
      await setCache(cacheKey, farmId, data);

      return { data, fromCache: false, cachedAt: null };
    } catch (error: any) {
      console.error('[SanteService] Error fetching statistiques par type:', error);
      // Fallback to cache on network error
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[SanteService] Statistiques par type from cache (fallback)');
        return { data: cached.payload, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },
};

export default santeService;

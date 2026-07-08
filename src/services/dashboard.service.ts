import api from './api';
import { getIsConnected } from '../utils/networkStatus';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { DashboardData, DashboardResponse, FinancialEvolutionData, FinancialEvolutionResponse } from '../types/dashboard.types';

export interface DashboardResult {
  data: DashboardData;
  fromCache: boolean;
  cachedAt: string | null;
}

export interface FinancialEvolutionResult {
  data: FinancialEvolutionData;
  fromCache: boolean;
  cachedAt: string | null;
}

/**
 * Get dashboard data with cache-then-network pattern
 * EXCEPTION: Kept as network call with cache-then-network pattern.
 * Justification: Dashboard provides aggregated statistics (animal counts, financial summaries, alerts)
 * that are complex to compute from local SQLite. Could be implemented locally but requires
 * significant aggregation logic. For now, cache-then-network is acceptable.
 * @param farmId - Farm ID
 * @returns Dashboard data with cache status
 */
export async function getDashboard(farmId: string): Promise<DashboardResult> {
  const cacheKey = `dashboard:${farmId}`;
  const isConnected = getIsConnected();

  // Try cache first
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('[DashboardService] Dashboard from cache');
      return {
        data: cached.payload,
        fromCache: true,
        cachedAt: cached.cachedAt,
      };
    }
  } catch (cacheError) {
    console.warn('[DashboardService] Cache read failed:', cacheError);
  }

  // Network call if connected
  if (isConnected) {
    try {
      const response = await api.get<DashboardResponse>('/dashboard', {
        params: { farm_id: farmId }
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const now = new Date().toISOString();

        // Cache the response
        await setCache(cacheKey, farmId, data);

        return {
          data,
          fromCache: false,
          cachedAt: now,
        };
      } else {
        throw new Error(response.data.message || 'Invalid dashboard response');
      }
    } catch (networkError: any) {
      console.warn('[DashboardService] Network request failed:', networkError.message);
    }
  }

  // No network and no cache
  throw new Error('Aucune donnée disponible hors ligne. Connexion requise pour charger les données du tableau de bord.');
}

/**
 * Get financial evolution data with cache-then-network pattern
 * EXCEPTION: Kept as network call with cache-then-network pattern.
 * Justification: Financial evolution provides time-series aggregated statistics that are
 * complex to compute from local SQLite. Could be implemented locally but requires
 * significant aggregation logic. For now, cache-then-network is acceptable.
 * @param farmId - Farm ID
 * @returns Financial evolution data with cache status
 */
export async function getFinancialEvolution(farmId: string): Promise<FinancialEvolutionResult> {
  const cacheKey = `financial_evolution:${farmId}`;
  const isConnected = getIsConnected();

  // Try cache first
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('[DashboardService] Financial evolution from cache');
      return {
        data: cached.payload,
        fromCache: true,
        cachedAt: cached.cachedAt,
      };
    }
  } catch (cacheError) {
    console.warn('[DashboardService] Cache read failed:', cacheError);
  }

  // Network call if connected
  if (isConnected) {
    try {
      const response = await api.get<FinancialEvolutionResponse>('/statistics/financial-evolution', {
        params: { farm_id: farmId }
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const now = new Date().toISOString();

        // Cache the response
        await setCache(cacheKey, farmId, data);

        return {
          data,
          fromCache: false,
          cachedAt: now,
        };
      } else {
        throw new Error(response.data.message || 'Invalid financial evolution response');
      }
    } catch (networkError: any) {
      console.warn('[DashboardService] Financial evolution network request failed:', networkError.message);
    }
  }

  // No network and no cache
  throw new Error('Aucune donnée disponible hors ligne. Connexion requise pour charger les données d\'évolution financière.');
}

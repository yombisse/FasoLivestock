import api from './api';
import animalService from './animal.service';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { farmStorage } from '../storage/farmStorage';
import {
  AchatRequest,
  NaissanceRequest,
  VenteRequest,
  TransfertRequest,
  DecesRequest,
  PerteRequest,
  AbattageRequest,
  MouvementResponse,
  MouvementHistoriqueAnimalResponse,
  ErrorResponse,
} from '../types/mouvement.types';

const mouvementService = {
  /**
   * Enregistrer un achat d'animal
   * DEPRECATED: Use animalRepository.createAnimal() directly for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async achat(data: AchatRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use animalRepository.createAnimal() directly for offline-first pattern');
  },

  /**
   * Récupérer les femelles éligibles à une naissance
   * EXCEPTION: Kept as network call with cache-then-network pattern.
   * Justification: No local SQLite table exists for "eligible females" - this is a computed
   * server-side endpoint based on reproduction rules. Fallback to local animals table on error.
   */
  async getFemellesEligibles(farmId?: string): Promise<any[]> {
    const cacheKey = `femelles_eligibles_${farmId || 'global'}`;
    
    // Try cache first
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[MouvementService] Femelles eligibles from cache');
        return cached.payload;
      }
    } catch (cacheError) {
      console.warn('[MouvementService] Cache read failed:', cacheError);
    }

    // Network call
    try {
      const response = await api.get('/reproduction/femelles-eligibles', {
        params: farmId ? { farm_id: farmId, farmId, farm: farmId } : {},
      });

      const payload = response.data;
      const candidates = payload?.data ?? payload?.animals ?? payload?.femelles ?? payload?.data?.animals ?? [];
      const result = Array.isArray(candidates) ? candidates : [];

      // Cache the result
      if (farmId) {
        try {
          await setCache(cacheKey, farmId, result);
        } catch (cacheError) {
          console.warn('[MouvementService] Cache write failed:', cacheError);
        }
      }

      return result;
    } catch (error: any) {
      const status = error?.response?.status;

      if ((status === 401 || status === 403 || status === 404) && farmId) {
        try {
          const fallback = await animalService.getAnimals(farmId, { sexe: 'femelle', per_page: 100 });
          return fallback.animals || [];
        } catch (fallbackError: any) {
          console.warn('Fallback eligible females failed:', fallbackError);
        }
      }

      throw this.handleError(error);
    }
  },

  /**
   * Enregistrer’une naissance d'animal
   * DEPRECATED: Use reproductionRepository.createReproductionEvent() directly for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async createNaissance(data: NaissanceRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use reproductionRepository.createReproductionEvent() directly for offline-first pattern');
  },

  /**
   * Enregistrer une vente d'animal
   * DEPRECATED: Use transactionRepository.createTransaction() with type='ENTREE' and categorie='VENTE_ANIMAL' for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async vente(animalId: string, data: VenteRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use transactionRepository.createTransaction() directly for offline-first pattern');
  },

  /**
   * Enregistrer un transfert d'animal
   * DEPRECATED: Use createLocalRecord('evenements') with categorie='MOUVEMENT' for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async transfert(animalId: string, data: TransfertRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use createLocalRecord() directly for offline-first pattern');
  },

  /**
   * Déclarer le décès d'un animal
   * DEPRECATED: Use createLocalRecord('evenements') with type_evenement_id='deces' for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async deces(animalId: string, data: DecesRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use createLocalRecord() directly for offline-first pattern');
  },

  /**
   * Déclarer la perte d'un animal
   * DEPRECATED: Use createLocalRecord('evenements') with type_evenement_id='perte' for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async perte(animalId: string, data: PerteRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use createLocalRecord() directly for offline-first pattern');
  },

  /**
   * Enregistrer l'abattage d'un animal
   * DEPRECATED: Use createLocalRecord('evenements') with type_evenement_id='abattage' for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async abattage(animalId: string, data: AbattageRequest): Promise<MouvementResponse> {
    throw new Error('DEPRECATED: Use createLocalRecord() directly for offline-first pattern');
  },

  /**
   * Récupérer l'historique des mouvements d'un animal (network-first + cache)
   */
  async getHistoriqueMouvement(animalId: string, page?: number): Promise<MouvementHistoriqueAnimalResponse> {
    const farm = await farmStorage.getActiveFarm();
    const cacheKey = `mouvement_historique_animal_${animalId}`;

    try {
      const response = await api.get<MouvementHistoriqueAnimalResponse>(
        `/animals/${animalId}/mouvements`,
        { params: page ? { page } : undefined }
      );

      if (response.data?.success && farm?.id) {
        await setCache(cacheKey, farm.id, response.data.data);
      }

      return response.data;
    } catch (error: any) {
      console.error('[MouvementService] Error fetching animal movement history:', error);
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[MouvementService] Animal movement history from cache (fallback)');
        return {
          success: true,
          message: 'Données chargées depuis le cache',
          data: cached.payload,
        };
      }
      throw this.handleError(error);
    }
  },

  /**
   * Gestion des erreurs
   */
  handleError(error: any): ErrorResponse {
    const errorData = error?.response?.data || error?.data || {};

    if (errorData.errors) {
      return {
        success: false,
        message: errorData.message || 'Erreur de validation',
        errors: errorData.errors,
      };
    }

    if (error?.response?.status) {
      return {
        success: false,
        message: errorData.message || error.message || `Erreur serveur (${error.response.status})`,
      };
    }

    if (error?.request) {
      return {
        success: false,
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
      };
    }

    return {
      success: false,
      message: error?.message || 'Une erreur inconnue est survenue',
    };
  },
};

export default mouvementService;

import api from './api';
import {
  Animal,
  AnimalFilters,
  CreateAnimalRequest,
  UpdateAnimalRequest,
  AnimalsResponse,
  AnimalListParams,
  TrashedAnimalsParams,
} from '../types/animal.types';
import { getLocalAnimals, getLocalAnimalById, createAnimal, updateAnimal, deleteAnimal } from '../database/repositories/animalRepository';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { farmStorage } from '../storage/farmStorage';

const ANIMALS_ENDPOINT = '/animals';

class AnimalService {
  /**
   * Récupérer la liste paginée des animaux
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getAnimals(farmId: string, filters?: AnimalFilters): Promise<AnimalsResponse> {
    // Try local database first
    try {
      const localAnimals = await getLocalAnimals(farmId);
      return {
        animals: localAnimals,
        meta: {
          total: localAnimals.length,
          per_page: filters?.per_page || 15,
          current_page: filters?.page || 1,
          last_page: 1,
        },
      };
    } catch (localError) {
      console.error('[AnimalService] Local read failed, falling back to network:', localError);
    }

    // Fallback to network if local read fails
    try {
      const params = {
        farm_id: farmId,
        ...filters,
      };

      console.log('getAnimals params:', params);
      const response = await api.get(ANIMALS_ENDPOINT, { params });
      console.log('getAnimals response:', response.data);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la récupération des animaux');
    } catch (error: any) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join('\n');
        console.error('Validation errors:', errorMessages);
        throw new Error(errorMessages);
      }
      
      const message = error.response?.data?.message || error.message || 'Erreur lors de la récupération des animaux';
      console.error('API Error:', message, error.response?.data);
      throw new Error(message);
    }
  };

  /**
   * Récupérer les détails d'un animal
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getAnimal(id: string): Promise<Animal> {
    // Try local database first
    try {
      const localAnimal = await getLocalAnimalById(id);
      if (localAnimal) {
        return localAnimal;
      }
    } catch (localError) {
      console.error('[AnimalService] Local read failed, falling back to network:', localError);
    }

    // Fallback to network if local read fails
    try {
      const response = await api.get(`${ANIMALS_ENDPOINT}/${id}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la récupération de l\'animal');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de la récupération de l\'animal';
      throw new Error(message);
    }
  }

  /**
   * Créer un nouvel animal
   * DEPRECATED: Use animalRepository.createAnimal() directly for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async createAnimal(data: CreateAnimalRequest): Promise<Animal> {
    throw new Error('DEPRECATED: Use animalRepository.createAnimal() directly for offline-first pattern');
  }

  /**
   * Mettre à jour un animal
   * DEPRECATED: Use animalRepository.updateAnimal() directly for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async updateAnimal(id: string, data: UpdateAnimalRequest): Promise<Animal> {
    throw new Error('DEPRECATED: Use animalRepository.updateAnimal() directly for offline-first pattern');
  }

  /**
   * Archiver un animal (soft delete)
   * DEPRECATED: Use animalRepository.deleteAnimal() directly for offline-first pattern.
   * This function is kept for backward compatibility but should not be used.
   */
  async archiveAnimal(id: string): Promise<void> {
    throw new Error('DEPRECATED: Use animalRepository.deleteAnimal() directly for offline-first pattern');
  }

  /**
   * Récupérer la liste des animaux archivés
   * EXCEPTION: Kept as network call with cache-then-network pattern.
   * Justification: Trashed animals are rarely accessed and can be fetched from server.
   * Could be implemented locally but not critical for offline-first pattern.
   */
  async getTrashedAnimals(
    farmId: string,
    filters?: Pick<AnimalFilters, 'search' | 'per_page'>
  ): Promise<AnimalsResponse> {
    const cacheKey = `trashed_animals_${farmId}_${JSON.stringify(filters || {})}`;
    const farm = await farmStorage.getActiveFarm();
    
    // Try cache first
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[AnimalService] Trashed animals from cache');
        return cached.payload;
      }
    } catch (cacheError) {
      console.warn('[AnimalService] Cache read failed:', cacheError);
    }

    // Network call
    try {
      const params = {
        farm_id: farmId,
        ...filters,
      };

      const response = await api.get(`${ANIMALS_ENDPOINT}/trashed`, { params });
      
      if (response.data.success && response.data.data) {
        // Cache the result
        if (farm?.id) {
          try {
            await setCache(cacheKey, farm.id, response.data.data);
          } catch (cacheError) {
            console.warn('[AnimalService] Cache write failed:', cacheError);
          }
        }
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la récupération des animaux archivés');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de la récupération des animaux archivés';
      throw new Error(message);
    }
  }

  /**
   * Restaurer un animal archivé
   * DEPRECATED: Use transactionRepository.restoreTransaction() pattern for soft-delete restore.
   * This function is kept for backward compatibility but should not be used.
   */
  async restoreAnimal(id: string): Promise<Animal> {
    throw new Error('DEPRECATED: Implement restore via repository pattern for offline-first');
  }
}

export default new AnimalService();

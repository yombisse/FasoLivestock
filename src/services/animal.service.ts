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

const ANIMALS_ENDPOINT = '/animals';

class AnimalService {
  /**
   * Récupérer la liste paginée des animaux
   */
  async getAnimals(farmId: string, filters?: AnimalFilters): Promise<AnimalsResponse> {
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
  }

  /**
   * Récupérer les détails d'un animal
   */
  async getAnimal(id: string): Promise<Animal> {
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
   */
  async createAnimal(data: CreateAnimalRequest): Promise<Animal> {
    try {
      const response = await api.post(ANIMALS_ENDPOINT, data);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la création de l\'animal');
    } catch (error: any) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join('\n');
        throw new Error(errorMessages);
      }
      
      const message = error.response?.data?.message || error.message || 'Erreur lors de la création de l\'animal';
      throw new Error(message);
    }
  }

  /**
   * Mettre à jour un animal
   */
  async updateAnimal(id: string, data: UpdateAnimalRequest): Promise<Animal> {
    try {
      const response = await api.put(`${ANIMALS_ENDPOINT}/${id}`, data);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la mise à jour de l\'animal');
    } catch (error: any) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join('\n');
        throw new Error(errorMessages);
      }
      
      const message = error.response?.data?.message || error.message || 'Erreur lors de la mise à jour de l\'animal';
      throw new Error(message);
    }
  }

  /**
   * Archiver un animal (soft delete)
   */
  async archiveAnimal(id: string): Promise<void> {
    try {
      const response = await api.delete(`${ANIMALS_ENDPOINT}/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de l\'archivage de l\'animal');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de l\'archivage de l\'animal';
      throw new Error(message);
    }
  }

  /**
   * Récupérer la liste des animaux archivés
   */
  async getTrashedAnimals(
    farmId: string,
    filters?: Pick<AnimalFilters, 'search' | 'per_page'>
  ): Promise<AnimalsResponse> {
    try {
      const params = {
        farm_id: farmId,
        ...filters,
      };

      const response = await api.get(`${ANIMALS_ENDPOINT}/trashed`, { params });
      
      if (response.data.success && response.data.data) {
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
   */
  async restoreAnimal(id: string): Promise<Animal> {
    try {
      const response = await api.post(`${ANIMALS_ENDPOINT}/${id}/restore`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Erreur lors de la restauration de l\'animal');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de la restauration de l\'animal';
      throw new Error(message);
    }
  }
}

export default new AnimalService();

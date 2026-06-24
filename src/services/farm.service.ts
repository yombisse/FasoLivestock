import api from './api';
import { Farm, FarmsResponse } from '../types/farm.types';

class FarmService {
  async getFarms(): Promise<Farm[]> {
    try {
      const response = await api.get<FarmsResponse>('/farms');
      if (response.data.success && response.data.data?.farms) {
        return response.data.data.farms;
      }
      throw new Error('Format de réponse invalide');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erreur lors du chargement des fermes');
    }
  }
}

export default new FarmService();

import api from './api';
import { Espece, EspecesResponse } from '../types/espece.types';

const ESPECES_ENDPOINT = '/especes';

class EspeceService {
  /**
   * Récupérer la liste des espèces
   */
  async getEspeces(): Promise<Espece[]> {
    try {
      const response = await api.get(ESPECES_ENDPOINT);
      
      if (response.data.success && response.data.data?.especes) {
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

import api from './api';
import { getCache, setCache } from '../database/repositories/cacheRepository';
import { farmStorage } from '../storage/farmStorage';
import { getIsConnected } from '../utils/networkStatus';
import {
  getLocalTransactions,
  getLocalTransactionById,
  createTransaction as createLocalTransaction,
  updateTransaction as updateLocalTransaction,
  deleteTransaction as deleteLocalTransaction,
  restoreTransaction as restoreLocalTransaction,
  getLocalBilan,
} from '../database/repositories/transactionRepository';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransactionsResponse,
  TransactionResponse,
  BilanResponse,
  TransactionHistoriqueAnimalResponse,
  ErrorResponse,
} from '../types/transaction.types';

const transactionService = {
  /**
   * Récupérer toutes les transactions (offline-first)
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getAll(params?: TransactionFilters): Promise<TransactionsResponse> {
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No farm available');
    }

    // Try local database first
    try {
      const localTransactions = await getLocalTransactions(farm.id, params);
      return {
        success: true,
        message: 'Données chargées localement',
        data: {
          transactions: localTransactions,
          meta: {
            total: localTransactions.length,
            per_page: params?.per_page || 15,
            current_page: params?.page || 1,
            last_page: 1,
          },
        },
      };
    } catch (localError) {
      console.error('[TransactionService] Local read failed:', localError);
    }

    // Fallback to cache
    const cacheKey = `transactions_${farm.id}_${JSON.stringify(params || {})}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return {
        success: true,
        message: 'Données chargées depuis le cache',
        data: cached.payload,
      };
    }

    // Fallback to network if local and cache fail
    try {
      const response = await api.get<TransactionsResponse>('/transactions', { params });
      
      if (response.data?.success && farm?.id) {
        await setCache(cacheKey, farm.id, response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Récupérer une transaction par son ID (offline-first)
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getById(id: string): Promise<TransactionResponse> {
    // Try local database first
    try {
      const localTransaction = await getLocalTransactionById(id);
      if (localTransaction) {
        return {
          success: true,
          message: 'Données chargées localement',
          data: { transaction: localTransaction },
        };
      }
    } catch (localError) {
      console.error('[TransactionService] Local read failed:', localError);
    }

    // Fallback to network if local read fails
    try {
      const response = await api.get<TransactionResponse>(`/transactions/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Récupérer le bilan financier (offline-first)
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getBilan(params?: { date_debut?: string; date_fin?: string }): Promise<BilanResponse> {
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No farm available');
    }

    // Try local database first
    try {
      const localBilan = await getLocalBilan(farm.id, params);
      return {
        success: true,
        message: 'Données chargées localement',
        data: localBilan,
      };
    } catch (localError) {
      console.error('[TransactionService] Local read failed:', localError);
    }

    // Fallback to cache
    const cacheKey = `bilan_${farm.id}_${JSON.stringify(params || {})}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return {
        success: true,
        message: 'Données chargées depuis le cache',
        data: cached.payload,
      };
    }

    // Fallback to network if local and cache fail
    try {
      const response = await api.get<BilanResponse>('/transactions/bilan', { params });
      
      if (response.data?.success && farm?.id) {
        await setCache(cacheKey, farm.id, response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Récupérer les transactions d'un animal (offline-first)
   * OFFLINE-FIRST: Reads from SQLite local database first, network call only for cache refresh.
   */
  async getByAnimal(animalId: string, params?: TransactionFilters): Promise<TransactionsResponse> {
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No farm available');
    }

    // Try local database first
    try {
      const localTransactions = await getLocalTransactions(farm.id, { ...params, animal_id: animalId });
      return {
        success: true,
        message: 'Données chargées localement',
        data: {
          transactions: localTransactions,
          meta: {
            total: localTransactions.length,
            per_page: params?.per_page || 15,
            current_page: params?.page || 1,
            last_page: 1,
          },
        },
      };
    } catch (localError) {
      console.error('[TransactionService] Local read failed:', localError);
    }

    // Fallback to cache
    const cacheKey = `transactions_animal_${animalId}_${JSON.stringify(params || {})}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return {
        success: true,
        message: 'Données chargées depuis le cache',
        data: cached.payload,
      };
    }

    // Fallback to network if local and cache fail
    try {
      const response = await api.get<TransactionsResponse>('/transactions', {
        params: { ...params, animal_id: animalId },
      });
      
      if (response.data?.success && farm?.id) {
        await setCache(cacheKey, farm.id, response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Créer une transaction (offline-first)
   */
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No farm available');
    }

    const transactionData = {
      ...data,
      farm_id: farm.id,
    };

    const localTransaction = await createLocalTransaction(transactionData);
    return localTransaction;
  },

  /**
   * Modifier une transaction (offline-first)
   */
  async updateTransaction(id: string, data: UpdateTransactionData): Promise<Transaction> {
    const localTransaction = await updateLocalTransaction(id, data);
    return localTransaction;
  },

  /**
   * Supprimer une transaction (offline-first)
   */
  async deleteTransaction(id: string): Promise<void> {
    await deleteLocalTransaction(id);
  },

  /**
   * Restaurer une transaction (offline-first)
   */
  async restoreTransaction(id: string): Promise<Transaction> {
    const localTransaction = await restoreLocalTransaction(id);
    return localTransaction;
  },

  /**
   * Récupérer les transactions archivées (offline-first)
   */
  async getTrashed(params?: TransactionFilters): Promise<TransactionsResponse> {
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No farm available');
    }

    const localTransactions = await getLocalTransactions(farm.id, { ...params, deleted: true });
    return {
      success: true,
      message: 'Données chargées localement',
      data: {
        transactions: localTransactions,
        meta: {
          total: localTransactions.length,
          per_page: params?.per_page || 15,
          current_page: params?.page || 1,
          last_page: 1,
        },
      },
    };
  },

  /**
   * Récupérer l'historique transactionnel d'un animal (offline-first)
   * EXCEPTION: Kept as network call with cache-then-network pattern.
   * Justification: This endpoint provides aggregated statistics and animal details that are
   * not easily computed from local SQLite. Could be implemented locally but requires
   * complex aggregation logic. For now, cache-then-network is acceptable.
   */
  async getHistoriqueAnimal(animalId: string, page?: number): Promise<TransactionHistoriqueAnimalResponse> {
    const farm = await farmStorage.getActiveFarm();
    const cacheKey = `transaction_historique_animal_${animalId}`;

    // Try cache first
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('[TransactionService] Animal transaction history from cache');
        return {
          success: true,
          message: 'Données chargées depuis le cache',
          data: cached.payload,
        };
      }
    } catch (cacheError) {
      console.warn('[TransactionService] Cache read failed:', cacheError);
    }

    // Network call
    try {
      const response = await api.get<TransactionHistoriqueAnimalResponse>(
        `/transactions/animals/${animalId}`,
        { params: page ? { page } : undefined }
      );

      if (response.data?.success && farm?.id) {
        await setCache(cacheKey, farm.id, response.data.data);
      }

      return response.data;
    } catch (error: any) {
      console.error('[TransactionService] Error fetching animal transaction history:', error);
      // Return empty response instead of throwing error
      return {
        success: true,
        message: 'Aucune donnée disponible',
        data: {
          animal: { 
            id: animalId, 
            nom: '', 
            statut: '', 
            espece: { id: '', nom: '' } 
          },
          transactions: [],
          statistiques: {
            total_revenus: 0,
            total_charges: 0,
            bilan: 0,
            nombre_transactions: 0,
            nombre_revenus: 0,
            nombre_charges: 0,
          },
          meta: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
        },
      };
    }
  },

  /**
   * Gestion des erreurs
   */
  handleError(error: any): ErrorResponse {
    if (error.response) {
      const errorData = error.response.data;
      
      if (errorData.errors) {
        return {
          success: false,
          message: errorData.message || 'Erreur de validation',
          errors: errorData.errors,
        };
      }
      
      return {
        success: false,
        message: errorData.message || 'Une erreur est survenue',
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
      };
    } else {
      return {
        success: false,
        message: error.message || 'Une erreur inconnue est survenue',
      };
    }
  },
};

export default transactionService;

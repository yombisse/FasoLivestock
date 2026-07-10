import axios from 'axios';
import { authStorage } from '../storage/authStorage';
import { farmStorage } from '../storage/farmStorage';

const API_BASE_URL = __DEV__ 
  ? 'http://10.125.2.24:8000/api' // Pour Android Emulator
  : 'http://192.168.100.50:8000/api'
//'https://headscarf-spotless-onto.ngrok-free.dev/api'; // URL de production
const getErrorMessage = (error: any): string => {
  const backendMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;

  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }

  if (error?.response?.data?.errors) {
    const validationErrors = error.response.data.errors;

    if (typeof validationErrors === 'object') {
      const details = Object.entries(validationErrors)
        .map(([field, messages]) => {
          const list = Array.isArray(messages) ? messages : [messages];
          return `${field}: ${list.join(', ')}`;
        })
        .join(' | ');

      if (details) {
        return details;
      }
    }
  }

  if (error?.response?.status) {
    return `Erreur serveur (${error.response.status})`;
  }

  return 'Une erreur inattendue est survenue.';
};

const buildApiError = (error: any): Error => {
  const message = getErrorMessage(error);
  const apiError = new Error(message) as Error & {
    response?: any;
    data?: any;
    status?: number;
  };

  apiError.response = error?.response;
  apiError.data = error?.response?.data;
  apiError.status = error?.response?.status;
  return apiError;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor pour les requêtes
api.interceptors.request.use(
  async (config) => {
    // Ajouter le token d'authentification si disponible
    try {
      const token = await authStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }

    // Ajouter le header X-Farm-Id si une ferme est sélectionnée
    try {
      const activeFarm = await farmStorage.getActiveFarm();
      if (activeFarm) {
        config.headers['X-Farm-Id'] = activeFarm.id;
        console.log('[API] Adding X-Farm-Id header:', activeFarm.id, 'for URL:', config.url);
      } else {
        console.warn('[API] No active farm found in storage for URL:', config.url);
      }
    } catch (error) {
      console.error('Error getting active farm from storage:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor pour les réponses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      const apiError = buildApiError(error);
      console.error('API Error:', apiError.message, error.response.data);

      if (error.response.status === 401) {
        try {
          await authStorage.clearAuth();
        } catch (storageError) {
          console.error('Error removing token from storage:', storageError);
        }
      }

      return Promise.reject(apiError);
    } else if (error.request) {
      const networkError = new Error('Erreur de connexion. Vérifiez votre connexion internet.');
      console.error('Network Error:', networkError.message);
      return Promise.reject(networkError);
    }

    const configError = new Error(error.message || 'Erreur de configuration réseau');
    console.error('Error:', configError.message);
    return Promise.reject(configError);
  }
);

export default api;

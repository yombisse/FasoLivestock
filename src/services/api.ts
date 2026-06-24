import axios from 'axios';
import { authStorage } from '../storage/authStorage';

// Configuration de base de l'API
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:8000/api' // Pour Android Emulator
  : 'https://headscarf-spotless-onto.ngrok-free.dev/api'; // URL de production

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
    // Gérer les erreurs globales ici
    if (error.response) {
      // Erreur de réponse du serveur
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        // Token expiré ou invalide, supprimer le token et rediriger vers login
        try {
          await authStorage.clearAuth();
        } catch (storageError) {
          console.error('Error removing token from storage:', storageError);
        }
        // TODO: Implémenter la redirection vers login
      }
    } else if (error.request) {
      // Erreur de réseau
      console.error('Network Error:', error.message);
    } else {
      // Erreur de configuration
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

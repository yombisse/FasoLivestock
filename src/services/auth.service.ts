import api from './api';
import {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  Verify2faRequest,
  ResetPasswordRequest,
  AuthResponse,
  ErrorResponse,
} from '../types/auth.types';

// Service d'authentification
const authService = {
  /**
   * Connexion de l'utilisateur
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Demande de réinitialisation du mot de passe
   */
  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Vérification 2FA avec code
   */
  async verify2fa(data: Verify2faRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/verify-2fa', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Réinitialisation du mot de passe avec nouveau mot de passe
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/reset-password', {
        token,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Renouvellement du token d'accès
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Déconnexion
   */
  async logout(): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/logout');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  /**
   * Gestion des erreurs
   */
  handleError(error: any): ErrorResponse {
    if (error.response) {
      // Erreur de réponse du serveur
      const errorData = error.response.data;
      
      if (errorData.errors) {
        // Erreurs de validation
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
      // Erreur de réseau
      return {
        success: false,
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
      };
    } else {
      // Erreur de configuration
      return {
        success: false,
        message: error.message || 'Une erreur inconnue est survenue',
      };
    }
  },
};

export default authService;

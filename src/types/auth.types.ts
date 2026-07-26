// Types pour l'authentification

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface Verify2faRequest {
  verification_id: string;
  code: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    refresh_token?: string;
    expires_in?: number; // en secondes
    token_type?: string;
    user?: {
      id: string;
      fullName: string;
      email: string;
    };
    verification_id?: string;
    pending_2fa?: boolean;
  };
}

export interface TokenData {
  token: string;
  refresh_token: string;
  expires_at: number; // timestamp en millisecondes
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  fullName?: string;
  createdAt?: string;
  updatedAt?: string;
}

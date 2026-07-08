// Types pour le module Transactions (Offline-first)

export type TransactionType = 'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'AJUSTEMENT';

export interface Transaction {
  id: string;
  farm_id: string;
  type_transaction: TransactionType;
  montant: number;
  date_transaction: string;
  categorie_id?: string;
  description?: string;
  evenement_id?: string;
  animal_id?: string;
  tiers?: string;
  sync_status: 'pending' | 'synced' | 'conflict';
  version: number;
  last_modified_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations incluses (from API)
  farm?: {
    id: string;
    name: string;
    location?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  animal?: {
    id: string;
    nom: string;
    espece?: { id: string; nom: string };
  };
  categorie?: {
    id: string;
    nom_categorie: string;
    type: 'revenu' | 'charge';
  };
  evenement?: {
    id: string;
    type_evenement?: string;
  };
}

export interface CreateTransactionData {
  type_transaction: TransactionType;
  montant: number;
  date_transaction: string;
  categorie_id?: string;
  description?: string;
  evenement_id?: string;
  farm_id: string;
  animal_id?: string;
  tiers?: string;
  user_id?: string;
}

export interface UpdateTransactionData {
  type_transaction?: TransactionType;
  montant?: number;
  date_transaction?: string;
  animal_id?: string;
  categorie_id?: string;
  description?: string;
  evenement_id?: string;
  version: number;
}

export interface TransactionFilters {
  type_transaction?: TransactionType;
  animal_id?: string;
  categorie_id?: string;
  date_debut?: string;
  date_fin?: string;
  revenus?: boolean;
  charges?: boolean;
  per_page?: number;
  page?: number;
}

export interface TransactionMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface TransactionsResponse {
  success: boolean;
  message?: string;
  data: {
    transactions: Transaction[];
    meta: TransactionMeta;
  };
}

export interface TransactionResponse {
  success: boolean;
  message?: string;
  data: {
    transaction: Transaction;
  };
}

export interface BilanResponse {
  success: boolean;
  message?: string;
  data: {
    total_revenus: number;
    total_charges: number;
    bilan: number;
    nombre_transactions?: number;
    revenus_par_categorie?: Array<{
      categorie: string;
      montant: number;
      pourcentage: number;
    }>;
    charges_par_categorie?: Array<{
      categorie: string;
      montant: number;
      pourcentage: number;
    }>;
    periode?: {
      debut: string;
      fin: string;
    };
  };
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

export interface TransactionStatistiques {
  total_revenus: number;
  total_charges: number;
  bilan: number;
  nombre_transactions: number;
  nombre_revenus: number;
  nombre_charges: number;
}

export interface TransactionHistoriqueAnimal {
  animal: {
    id: string;
    nom: string;
    statut: string;
    espece?: {
      id: string;
      nom: string;
    };
  };
  transactions: Transaction[];
  statistiques: TransactionStatistiques;
  meta: TransactionMeta;
}

export interface TransactionHistoriqueAnimalResponse {
  success: boolean;
  message?: string;
  data: TransactionHistoriqueAnimal;
}

/**
 * Types for Health (Santé) Module
 * Based on backend API documentation
 */

export type TypeRappel = 'VACCINATION' | 'TRAITEMENT' | 'CONTROLE';

export type StatutRappel = 'EN_ATTENTE' | 'REALISE' | 'EN_RETARD';

export type TypeEvenementSanitaire = 'vaccination' | 'traitement' | 'maladie' | 'controle';

/**
 * Rappel Sanitaire (Health Reminder)
 */
export interface Rappel {
  id: string;
  farm_id: string;
  animal_id: string;
  type_rappel: TypeRappel;
  date_prevue: string; // YYYY-MM-DD
  date_realisee?: string; // YYYY-MM-DD
  statut: StatutRappel;
  note?: string;
  evenement_id?: string; // Link to the event when realized
  sync_status: 'pending' | 'synced' | 'conflict';
  last_modified_by?: string;
  version: number;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create Rappel Request
 */
export interface CreateRappelRequest {
  animal_id: string;
  type_rappel: TypeRappel;
  date_prevue: string;
  note?: string;
}

/**
 * Update Rappel Request
 */
export interface UpdateRappelRequest {
  type_rappel?: TypeRappel;
  date_prevue?: string;
  note?: string;
}

/**
 * Marquer Rappel Realisé Request
 */
export interface MarquerRappelRealiseRequest {
  evenement_id: string;
}

/**
 * Événement Sanitaire (Health Event)
 * Extends ReproductionEvent structure with metadonnees for health-specific data
 * Note: metadonnees is stored as JSON string in database, parsed when returned to app
 */
export interface EvenementSanitaire {
  id: string;
  farm_id: string;
  type_evenement_id: string;
  animal_id: string;
  date_evenement: string;
  description?: string;
  cout?: number;
  categorie: 'SANITAIRE';
  type: TypeEvenementSanitaire;
  metadonnees?: string; // JSON string in database
  statut_avant?: 'ACTIF' | 'VENDU' | 'MORT' | 'PERDU';
  statut_apres?: 'ACTIF' | 'VENDU' | 'MORT' | 'PERDU';
  transaction_id?: string;
  statut?: string;
  date_fin?: string;
  sync_status: 'pending' | 'synced' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Metadonnees Sanitaires (Health-specific metadata stored in JSON)
 */
export interface MetadonneesSanitaire {
  // Vaccination metadata
  nom_vaccin?: string;
  dosage?: string;
  lot_vaccin?: string;
  date_prochaine?: string;

  // Traitement metadata
  nom_medicament?: string;
  duree?: string;
  frequence?: string;

  // Maladie metadata
  nom_maladie?: string;
  symptomes?: string;
  gravite?: string;
  diagnostic?: string;

  // Contrôle metadata
  type_controle?: string;
  resultat?: string;

  // Common metadata
  veterinaire?: string;
}

/**
 * Create Evenement Sanitaire Request
 */
export interface CreateEvenementSanitaireRequest {
  animal_id: string;
  type: TypeEvenementSanitaire;
  date_evenement: string;
  description?: string;
  cout?: number;
  metadonnees?: MetadonneesSanitaire;
}

/**
 * Update Evenement Sanitaire Request
 */
export interface UpdateEvenementSanitaireRequest {
  type?: TypeEvenementSanitaire;
  date_evenement?: string;
  description?: string;
  cout?: number;
  metadonnees?: MetadonneesSanitaire;
}

/**
 * API Response wrappers
 */
export interface RappelsResponse {
  rappels: Rappel[];
  total: number;
  page?: number;
  per_page?: number;
}

export interface EvenementsSanitairesResponse {
  evenements: EvenementSanitaire[];
  total: number;
  page?: number;
  per_page?: number;
}

// Types pour l'historique médical par animal (GET /sante/animals/{animal}/historique-medical)
export interface SanteHistoriqueAnimal {
  animal: {
    id: string;
    nom: string;
    sexe: string;
    espece: string;
    date_naissance: string;
  };
  evenements_sanitaires: Array<{
    id: string;
    type: string;
    date_evenement: string;
    description?: string;
    cout?: number;
    created_at: string;
  }>;
  rappels_sanitaires?: Array<{
    id: string;
    type_rappel: string;
    date_prevue: string;
    date_realisee?: string;
    statut: string;
    note?: string;
    evenement?: {
      id: string;
      date_evenement: string;
      description?: string;
    };
    created_at: string;
  }>;
}

export interface SanteHistoriqueAnimalResponse {
  success: boolean;
  message?: string;
  data: SanteHistoriqueAnimal;
}

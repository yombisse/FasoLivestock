// Types pour le module Naissances (entité complète)

export interface Naissance {
  id: string;
  farm_id: string;
  mother_id: string;
  date_naissance: string;
  nombre_petits: number;
  poids_naissance?: number;
  observation?: string;
  evenement_id?: string;
  date_saillie?: string;
  pere_id?: string;
  // Champs de synchronisation
  sync_status: 'pending' | 'synced' | 'conflict';
  version: number;
  last_modified_by?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Réexport du type request depuis mouvement.types.ts pour éviter duplication
export type { NaissanceRequest } from './mouvement.types';

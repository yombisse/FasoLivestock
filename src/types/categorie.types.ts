// Types pour le module Catégories

export interface Categorie {
  id: string;
  nom_categorie: string;
  type: 'REVENU' | 'DEPENSE';
  description?: string;
  farm_id: string | null;
  // Champs de synchronisation
  sync_status: 'pending' | 'synced' | 'conflict';
  version: number;
  last_modified_by?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

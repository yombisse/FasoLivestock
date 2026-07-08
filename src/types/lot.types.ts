// Types pour le module Lots

export interface Lot {
  id: string;
  farm_id: string;
  nom_lot: string;
  nombre: number;
  description?: string;
  espece_id?: string;
  // Champs de synchronisation
  sync_status: 'pending' | 'synced' | 'conflict';
  version: number;
  last_modified_by?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

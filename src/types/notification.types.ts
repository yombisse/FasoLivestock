// Types pour le module Notifications

export interface Notification {
  id: string;
  farm_id?: string;
  animal_id?: string;
  titre?: string;
  message: string;
  sent_at?: string;
  evenement_id?: string;
  type: 'VACCINATION' | 'TRAITEMENT' | 'NAISSANCE' | 'MOUVEMENT' | 'ALERTE' | 'INFO';
  // Champs de synchronisation
  sync_status: 'pending' | 'synced' | 'conflict';
  version: number;
  last_modified_by?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

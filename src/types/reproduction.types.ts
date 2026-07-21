export interface ReproductionEventType {
  id: string;
  nom_type: string;
  categorie: string;
  description?: string;
}

export interface CreateReproductionEventRequest {
  animal_id: string;
  type_evenement_id: string;
  date_evenement: string;
  description?: string;
  cout?: number;
}

export interface ReproductionEvent {
  id: string;
  farm_id: string;
  animal_id: string;
  type_evenement_id: string;
  date_evenement: string;
  statut?: string;
  description?: string;
  cout?: number;
  metadonnees?: string;
  // Champs de synchronisation
  sync_status: 'pending' | 'synced' | 'conflict';
  version: number;
  deleted_at?: string | null;
  last_modified_by?: string;
}

export interface ReproductionEventsResponse {
  evenements: ReproductionEvent[];
  meta?: {
    current_page?: number;
    total?: number;
    per_page?: number;
  };
}

// Types pour l'historique reproductif par animal (GET /reproduction/animals/{animal}/historique)
export interface ReproductionHistoriqueAnimal {
  evenements_reproductifs: Array<{
    id: string;
    type: string;
    date_evenement: string;
    description?: string;
    cout?: number;
  }>;
  naissances?: Array<{
    id: string;
    date_naissance: string;
    nombre_petits: number;
    nombre_petits_enregistres: number;
    petits?: Array<{
      id: string;
      nom: string;
      sexe: string;
      statut: string;
    }>;
  }>;
}

export interface ReproductionHistoriqueAnimalResponse {
  success: boolean;
  message?: string;
  data: ReproductionHistoriqueAnimal;
}

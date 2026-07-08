// Types pour le module Mouvements (Entrées/Sorties d'animaux)

export interface MouvementResponse {
  success: boolean;
  message: string;
  data?: any;
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

// Entrées
export interface AchatRequest {
  farm_id: string;
  farm_source_id?: string;
  nom: string;
  race?: string;
  sexe: 'male' | 'femelle';
  espece_id?: string;
  lot_id?: string;
  numero_identification?: string;
  poids?: number;
  provenance?: string;
  prix_achat: number;
  date_achat: string;
}

export interface NaissanceRequest {
  farm_id?: string;
  mother_id: string;
  date_naissance: string;
  nombre_petits: number;
  poids_naissance?: number;
  observation?: string;
  date_saillie?: string;
  date_mise_bas_prevue?: string;
  creer_petits?: boolean;
}

// Sorties
export interface VenteRequest {
  prix_vente?: number;
  date_vente?: string;
  acheteur?: string;
}

export interface TransfertRequest {
  farm_destination_id: string;
  date_transfert?: string;
  motif?: string;
}

export interface DecesRequest {
  date_deces?: string;
  cause?: string;
}

export interface PerteRequest {
  date_perte?: string;
  cause?: string;
}

export interface AbattageRequest {
  date_abattage?: string;
  motif?: string;
}

// Types pour l'historique des mouvements (GET /api/animals/{animal}/mouvements)
export interface MouvementHistoryItem {
  id: string;
  type: 'ACHAT' | 'NAISSANCE' | 'IMPORT' | 'VENTE' | 'TRANSFERT' | 'DECES' | 'PERTE' | 'ABATTAGE';
  date: string;
  description?: string;
  montant?: number;
  details?: Record<string, any>;
  farm?: {
    id: string;
    name: string;
  };
  animal?: {
    id: string;
    nom: string;
    numero_identification?: string;
  };
  type_mouvement?: {
    id: string;
    nom: string;
  };
}

export interface MouvementHistoryResponse {
  success: boolean;
  message: string;
  data?: {
    data: MouvementHistoryItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Types pour la traçabilité (GET /api/mouvements/trace/{animal})
export interface TracabiliteResponse {
  success: boolean;
  message: string;
  data?: {
    animal: {
      id: string;
      nom: string;
      numero_identification?: string;
      espece?: string;
      race?: string;
    };
    ferme_actuelle: {
      id: string;
      name: string;
      location?: string;
    };
    historique: {
      id: string;
      type: string;
      date: string;
      ferme_source?: {
        id: string;
        name: string;
      };
      ferme_destination?: {
        id: string;
        name: string;
      };
      details?: Record<string, any>;
    }[];
    dernier_mouvement?: {
      type: string;
      date: string;
      ferme?: string;
    };
    provenance?: {
      type: string;
      ferme?: string;
      date?: string;
    };
    destination?: {
      type: string;
      ferme?: string;
    };
  };
}

// Types pour l'historique des mouvements par animal (GET /animals/{animal}/mouvements)
export interface MouvementHistoriqueAnimal {
  mouvements: Array<{
    id: string;
    type_evenement_id: string;
    animal_id: string;
    date_evenement: string;
    description?: string;
    cout?: number;
    statut_avant?: string;
    statut_apres?: string;
    farm_destination_id?: string;
    transaction_id?: string;
    type: {
      id: string;
      nom_type: string;
      categorie: string;
    };
    farm?: {
      id: string;
      name: string;
    };
    farm_destination?: {
      id: string;
      name: string;
    };
  }>;
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface MouvementHistoriqueAnimalResponse {
  success: boolean;
  message?: string;
  data: MouvementHistoriqueAnimal;
}

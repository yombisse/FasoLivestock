// Types pour le module Cheptel (Animaux)

export interface Animal {
  id: string;
  farm_id: string;
  nom: string;
  race?: string;
  sexe: 'male' | 'femelle';
  date_naissance?: string;
  poids?: number;
  espece_id?: string;
  lot_id?: string;
  mother_id?: string;
  statut?: string;
  numero_identification?: string;
  photo?: string;
  naissance_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  version: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  // Relations incluses
  farm?: { id: string; name: string };
  espece?: { id: string; nom: string };
  lot?: { id: string; nom: string };
  mother?: { id: string; nom: string };
}

export interface AnimalFilters {
  search?: string;
  espece_id?: string;
  sexe?: 'male' | 'femelle';
  statut?: string;
  lot_id?: string;
  date_naissance_from?: string;
  date_naissance_to?: string;
  per_page?: number;
  page?: number;
}

export interface CreateAnimalRequest {
  farm_id: string;
  nom: string;
  sexe: 'male' | 'femelle';
  race?: string;
  date_naissance?: string;
  poids?: number;
  espece_id?: string;
  lot_id?: string;
  mother_id?: string;
  statut?: string;
  numero_identification?: string;
  photo?: string;
  naissance_id?: string;
}

export interface UpdateAnimalRequest {
  nom?: string;
  sexe?: 'male' | 'femelle';
  race?: string;
  date_naissance?: string;
  poids?: number;
  espece_id?: string;
  lot_id?: string;
  mother_id?: string;
  statut?: string;
  numero_identification?: string;
  photo?: string;
  naissance_id?: string;
}

export interface AnimalMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface AnimalsResponse {
  animals: Animal[];
  meta: AnimalMeta;
}

export interface AnimalListParams {
  farmId: string;
  filters?: AnimalFilters;
}

export interface TrashedAnimalsParams {
  farmId: string;
  filters?: Pick<AnimalFilters, 'search' | 'per_page'>;
}

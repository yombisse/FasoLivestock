// Types pour le module Espèces

export interface Espece {
  id: string;
  nom: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EspecesResponse {
  success: boolean;
  data: {
    especes: Espece[];
  };
}

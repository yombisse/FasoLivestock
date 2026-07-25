import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export interface TypeEvenement {
  id: string;
  nom_type: string;
  description?: string;
  categorie: string;
  farm_id?: string;
  is_system: number;
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalTypeEvenements(farmId?: string): Promise<TypeEvenement[]> {
  if (farmId) {
    const typeEvenements = await database.get('type_evenements')
      .query(Q.where('farm_id', farmId))
      .fetch();
    return typeEvenements as unknown as TypeEvenement[];
  } else {
    const typeEvenements = await database.get('type_evenements')
      .query()
      .fetch();
    return typeEvenements as unknown as TypeEvenement[];
  }
}

export async function getLocalTypeEvenementById(id: string): Promise<TypeEvenement | null> {
  try {
    const typeEvenements = await database.get('type_evenements')
      .query(Q.where('id', id))
      .fetch();
    
    if (typeEvenements.length > 0) {
      return typeEvenements[0] as unknown as TypeEvenement;
    }
    return null;
  } catch (error) {
    console.error('[TypeEvenementRepository] Error getting type_evenement by ID:', error);
    return null;
  }
}

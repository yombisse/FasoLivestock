import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export interface Categorie {
  id: string;
  nom_categorie: string;
  type: 'REVENU' | 'DEPENSE';
  description?: string;
  farm_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalCategories(): Promise<Categorie[]> {
  const categories = await database.get('categories')
    .query()
    .fetch();
  return categories as unknown as Categorie[];
}

export async function getLocalCategorieById(id: string): Promise<Categorie | null> {
  try {
    const categories = await database.get('categories')
      .query(Q.where('api_id', id))
      .fetch();
    
    if (categories.length > 0) {
      return categories[0] as unknown as Categorie;
    }
    return null;
  } catch (error) {
    console.error('[CategorieRepository] Error getting categorie by ID:', error);
    return null;
  }
}

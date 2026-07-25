import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export interface Espece {
  id: string;
  nom: string;
  description?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalEspeces(): Promise<Espece[]> {
  const especes = await database.get('especes')
    .query()
    .fetch();
  return especes as unknown as Espece[];
}

export async function getLocalEspeceById(id: string): Promise<Espece | null> {
  try {
    const especes = await database.get('especes')
      .query(Q.where('id', id))
      .fetch();
    
    if (especes.length > 0) {
      return especes[0] as unknown as Espece;
    }
    return null;
  } catch (error) {
    console.error('[EspeceRepository] Error getting espece by ID:', error);
    return null;
  }
}

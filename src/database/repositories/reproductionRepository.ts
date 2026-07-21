import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord } from './baseRepository';

export interface EvenementReproductif {
  id: string;
  animal_id: string;
  date_evenement: string;
  type_evenement_id: string;
  categorie: string;
  description?: string;
  veterinaire?: string;
  cout?: number;
  metadonnees?: string;
  farm_id: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function createReproductionEvent(data: Omit<EvenementReproductif, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<EvenementReproductif> {
  const result = await createLocalRecord<EvenementReproductif>('evenements', data);
  console.log('[AUDIT] Reproduction event created:', {
    local_id: result.id,
    farm_id: result.farm_id,
    animal_id: result.animal_id,
    type_evenement_id: result.type_evenement_id,
    categorie: result.categorie,
    date_evenement: result.date_evenement,
    metadonnees: result.metadonnees,
    sync_status: (result as any).sync_status,
    _status: (result as any)._status,
  });
  return result;
}

export async function getReproductionEvents(farmId: string, animalId?: string): Promise<EvenementReproductif[]> {
  if (animalId) {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId), Q.where('categorie', 'REPRODUCTION'))
      .fetch();
    return evenements as unknown as EvenementReproductif[];
  } else {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('categorie', 'REPRODUCTION'))
      .fetch();
    return evenements as unknown as EvenementReproductif[];
  }
}

export async function getEvenementReproductifById(id: string): Promise<EvenementReproductif | null> {
  try {
    const evenements = await database.get('evenements')
      .query(Q.where('id', id))
      .fetch();
    
    if (evenements.length > 0) {
      return evenements[0] as unknown as EvenementReproductif;
    }
    return null;
  } catch (error) {
    console.error('[ReproductionRepository] Error getting evenement reproductif by ID:', error);
    return null;
  }
}

export async function getActiveGestations(farmId: string): Promise<EvenementReproductif[]> {
  const evenements = await getReproductionEvents(farmId);
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return evenements.filter(e => {
    const eventDate = new Date(e.date_evenement);
    const isGestation = e.type_evenement_id === 'Gestation' || e.type_evenement_id === 'GESTATION';
    return isGestation && eventDate >= thirtyDaysAgo && eventDate <= today;
  }).slice(0, 5);
}

import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord } from './baseRepository';

export interface Naissance {
  id: string;
  farm_id: string;
  mother_id: string;
  date_naissance: string;
  nombre_petits: number;
  poids_naissance?: number;
  observation?: string;
  evenement_id?: string;
  date_saillie?: string;
  date_mise_bas_prevue?: string;
  pere_id?: string;
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalNaissances(farmId: string, animalId?: string): Promise<Naissance[]> {
  if (animalId) {
    const naissances = await database.get('naissances')
      .query(Q.where('farm_id', farmId), Q.where('mother_id', animalId))
      .fetch();
    return naissances as unknown as Naissance[];
  } else {
    const naissances = await database.get('naissances')
      .query(Q.where('farm_id', farmId))
      .fetch();
    return naissances as unknown as Naissance[];
  }
}

export async function getLocalNaissanceById(id: string): Promise<Naissance | null> {
  try {
    const naissances = await database.get('naissances')
      .query(Q.where('id', id))
      .fetch();
    
    if (naissances.length > 0) {
      return naissances[0] as unknown as Naissance;
    }
    return null;
  } catch (error) {
    console.error('[NaissanceRepository] Error getting naissance by ID:', error);
    return null;
  }
}

export async function createNaissance(data: Partial<Naissance>): Promise<Naissance> {
  const naissanceData = {
    ...data,
    sync_status: 'pending' as const,
    version: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  const result = await createLocalRecord<Naissance>('naissances', naissanceData);
  console.log('[AUDIT] Naissance created:', {
    local_id: result.id,
    farm_id: result.farm_id,
    mother_id: result.mother_id,
    nombre_petits: result.nombre_petits,
    sync_status: (result as any).sync_status,
    _status: (result as any)._status,
  });
  return result;
}

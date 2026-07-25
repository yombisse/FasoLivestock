import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord } from './baseRepository';

export interface Lot {
  id: string;
  farm_id: string;
  nom_lot: string;
  nombre: number;
  description?: string;
  espece_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  version: number;
  last_modified_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function createLot(data: Omit<Lot, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Lot> {
  try {
    const result = await createLocalRecord<Lot>('lots', data);
    console.log('[LotRepository] Lot created successfully with sync_status pending, ID:', result.id);
    return result;
  } catch (error) {
    console.error('[LotRepository] Failed to create lot:', error);
    throw error;
  }
}

export async function getLocalLots(farmId: string): Promise<Lot[]> {
  const lots = await database.get('lots')
    .query(Q.where('farm_id', farmId))
    .fetch();
  return lots as unknown as Lot[];
}

export async function getLocalLotById(id: string): Promise<Lot | null> {
  try {
    const lots = await database.get('lots')
      .query(Q.where('id', id))
      .fetch();
    
    if (lots.length > 0) {
      return lots[0] as unknown as Lot;
    }
    return null;
  } catch (error) {
    console.error('[LotRepository] Error getting lot by ID:', error);
    return null;
  }
}

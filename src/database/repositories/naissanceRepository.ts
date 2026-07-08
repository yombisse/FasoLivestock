import { getDatabase } from '../connection';
import { generateUUID } from '../../utils/uuid';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { Naissance } from '../../types/naissance.types';

export interface CreateNaissanceData {
  id?: string;
  farm_id: string;
  mother_id: string;
  date_naissance: string;
  nombre_petits: number;
  poids_naissance?: number;
  observation?: string;
  evenement_id?: string;
  date_saillie?: string;
  pere_id?: string;
}

export interface UpdateNaissanceData {
  date_naissance?: string;
  nombre_petits?: number;
  poids_naissance?: number;
  observation?: string;
  date_saillie?: string;
  pere_id?: string;
}

/**
 * Get naissances from local database
 */
export async function getLocalNaissances(farmId: string): Promise<Naissance[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM naissances 
       WHERE farm_id = ? 
       AND deleted_at IS NULL
       ORDER BY date_naissance DESC`,
      [farmId]
    );

    let naissances: Naissance[] = [];
    if (result?.rows) {
      naissances = result.rows as Naissance[];
    } else if (Array.isArray(result)) {
      naissances = result as Naissance[];
    }

    return naissances;
  } catch (error) {
    console.error('[NaissanceRepository] Error getting naissances:', error);
    return [];
  }
}

/**
 * Create a naissance in local database
 * Adds to sync queue for synchronization
 */
export async function createNaissance(data: CreateNaissanceData): Promise<Naissance> {
  return createLocalRecord<Naissance>('naissances', data);
}

/**
 * Update a naissance in local database
 * Adds to sync queue for synchronization
 */
export async function updateNaissance(id: string, data: UpdateNaissanceData): Promise<Naissance> {
  return updateLocalRecord<Naissance>('naissances', id, data);
}

/**
 * Soft delete a naissance in local database
 * Adds to sync queue for synchronization
 */
export async function deleteNaissance(id: string): Promise<void> {
  return softDeleteLocalRecord('naissances', id);
}

/**
 * Get naissance by ID
 */
export async function getNaissanceById(id: string): Promise<Naissance | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM naissances WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (result?.rows && result.rows.length > 0) {
      return result.rows[0] as Naissance;
    } else if (Array.isArray(result) && result.length > 0) {
      return result[0] as Naissance;
    }

    return null;
  } catch (error) {
    console.error('[NaissanceRepository] Error getting naissance:', error);
    return null;
  }
}

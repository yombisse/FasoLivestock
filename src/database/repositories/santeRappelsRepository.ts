import { getDatabase } from '../connection';
import { generateUUID } from '../../utils/uuid';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { Rappel, CreateRappelRequest, UpdateRappelRequest } from '../../types/sante.types';

export interface CreateRappelData {
  id?: string;
  farm_id: string;
  animal_id: string;
  type_rappel: 'VACCINATION' | 'TRAITEMENT' | 'CONTROLE';
  date_prevue: string;
  note?: string;
}

export interface UpdateRappelData {
  type_rappel?: 'VACCINATION' | 'TRAITEMENT' | 'CONTROLE';
  date_prevue?: string;
  note?: string;
}

/**
 * Get all rappels for a farm (non-deleted)
 */
export async function getRappels(farmId: string): Promise<Rappel[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM sante_rappels 
       WHERE farm_id = ? AND deleted_at IS NULL 
       ORDER BY date_prevue ASC`,
      [farmId]
    );

    return (result.rows?._array || []) as Rappel[];
  } catch (error) {
    console.error('[SanteRappelsRepository] Error fetching rappels:', error);
    throw error;
  }
}

/**
 * Get rappels by status
 */
export async function getRappelsByStatut(farmId: string, statut: string): Promise<Rappel[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM sante_rappels 
       WHERE farm_id = ? AND statut = ? AND deleted_at IS NULL 
       ORDER BY date_prevue ASC`,
      [farmId, statut]
    );

    return (result.rows?._array || []) as Rappel[];
  } catch (error) {
    console.error('[SanteRappelsRepository] Error fetching rappels by statut:', error);
    throw error;
  }
}

/**
 * Get rappels for a specific animal
 */
export async function getRappelsByAnimal(animalId: string): Promise<Rappel[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM sante_rappels 
       WHERE animal_id = ? AND deleted_at IS NULL 
       ORDER BY date_prevue ASC`,
      [animalId]
    );

    return (result.rows?._array || []) as Rappel[];
  } catch (error) {
    console.error('[SanteRappelsRepository] Error fetching rappels by animal:', error);
    throw error;
  }
}

/**
 * Get a single rappel by ID
 */
export async function getRappelById(id: string): Promise<Rappel | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM sante_rappels WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    const rappels = result.rows?._array || [];
    return rappels.length > 0 ? (rappels[0] as Rappel) : null;
  } catch (error) {
    console.error('[SanteRappelsRepository] Error fetching rappel by id:', error);
    throw error;
  }
}

/**
 * Create a rappel in local database
 * Adds to sync queue for synchronization
 */
export async function createRappel(data: CreateRappelData): Promise<Rappel> {
  const rappelData = {
    ...data,
    statut: 'EN_ATTENTE' as const,
  };
  return createLocalRecord<Rappel>('sante_rappels', rappelData);
}

/**
 * Update a rappel in local database
 * Adds to sync queue for synchronization
 */
export async function updateRappel(id: string, data: UpdateRappelData): Promise<Rappel> {
  return updateLocalRecord<Rappel>('sante_rappels', id, data);
}

/**
 * Marquer un rappel comme réalisé
 * Transition d'état: EN_ATTENTE/EN_RETARD -> REALISE
 * Sets date_realisee and links to event
 */
export async function marquerRappelRealise(id: string, evenementId: string): Promise<Rappel> {
  const now = new Date().toISOString();
  return updateLocalRecord<Rappel>('sante_rappels', id, {
    statut: 'REALISE' as const,
    date_realisee: now,
    evenement_id: evenementId,
  });
}

/**
 * Soft delete a rappel (deleted_at timestamp)
 * NOTE: Delete/trashed/restore will be handled by admin page, not mobile
 * This function is kept for potential future use but not exposed to mobile UI
 */
export async function deleteRappel(id: string): Promise<void> {
  return softDeleteLocalRecord('sante_rappels', id);
}

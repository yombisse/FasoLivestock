import { getDatabase } from '../connection';
import { generateUUID } from '../../utils/uuid';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { ReproductionEvent } from '../../types/reproduction.types';

export interface CreateReproductionEventData {
  id?: string;
  farm_id: string;
  animal_id: string;
  type_evenement_id: string;
  date_evenement: string;
  description?: string;
  cout?: number;
  statut_avant?: string;
  statut_apres?: string;
}

export interface UpdateReproductionEventData {
  description?: string;
  cout?: number;
  statut_avant?: string;
  statut_apres?: string;
  date_evenement?: string;
}

/**
 * Validate evenement payload before insertion/update
 * Throws explicit error if CHECK constraints would be violated
 */
export function validateEvenementPayload(data: Partial<CreateReproductionEventData | UpdateReproductionEventData>): void {
  const VALID_STATUTS = ['ACTIF', 'VENDU', 'MORT', 'PERDU'];
  const VALID_CATEGORIES = ['MOUVEMENT', 'REPRODUCTION', 'SANITAIRE'];

  if (data.statut_avant && !VALID_STATUTS.includes(data.statut_avant)) {
    throw new Error(`statut_avant invalide: "${data.statut_avant}". Valeurs acceptées: ${VALID_STATUTS.join(', ')}`);
  }

  if (data.statut_apres && !VALID_STATUTS.includes(data.statut_apres)) {
    throw new Error(`statut_apres invalide: "${data.statut_apres}". Valeurs acceptées: ${VALID_STATUTS.join(', ')}`);
  }

  // Note: categorie is hardcoded to 'REPRODUCTION' in createReproductionEvent, but validate for future use
  if ('categorie' in data && data.categorie && !VALID_CATEGORIES.includes(data.categorie as string)) {
    throw new Error(`categorie invalide: "${data.categorie}". Valeurs acceptées: ${VALID_CATEGORIES.join(', ')}`);
  }
}

/**
 * Get reproduction events from local database
 * Filters events by category = 'REPRODUCTION'
 */
export async function getReproductionEvents(farmId: string): Promise<ReproductionEvent[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT e.*, te.nom_type as type_nom, a.nom as animal_nom, a.numero_identification as animal_numero 
       FROM evenements e 
       LEFT JOIN type_evenements te ON e.type_evenement_id = te.id 
       LEFT JOIN animals a ON e.animal_id = a.id 
       WHERE e.farm_id = ? 
       AND e.categorie = 'REPRODUCTION' 
       AND e.deleted_at IS NULL
       ORDER BY e.date_evenement DESC`,
      [farmId]
    );

    let events: ReproductionEvent[] = [];
    if (result?.rows) {
      events = result.rows as ReproductionEvent[];
    } else if (Array.isArray(result)) {
      events = result as ReproductionEvent[];
    }

    return events;
  } catch (error) {
    console.error('[ReproductionRepository] Error getting reproduction events:', error);
    return [];
  }
}

/**
 * Create a reproduction event in local database
 * Adds to sync queue for synchronization
 * @returns The ID of the created event
 */
export async function createReproductionEvent(data: CreateReproductionEventData): Promise<string> {
  // Validate payload before insertion
  validateEvenementPayload(data);

  const eventData = {
    ...data,
    categorie: 'REPRODUCTION' as const,
  };
  const result = await createLocalRecord<ReproductionEvent>('evenements', eventData);
  return result.id;
}

/**
 * Get reproduction event by ID
 */
export async function getReproductionEventById(id: string): Promise<ReproductionEvent | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM evenements WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (result?.rows && result.rows.length > 0) {
      return result.rows[0] as ReproductionEvent;
    } else if (Array.isArray(result) && result.length > 0) {
      return result[0] as ReproductionEvent;
    }

    return null;
  } catch (error) {
    console.error('[ReproductionRepository] Error getting reproduction event:', error);
    return null;
  }
}

/**
 * Update a reproduction event in local database
 * Adds to sync queue for synchronization
 */
export async function updateReproductionEvent(id: string, data: UpdateReproductionEventData): Promise<void> {
  // Validate payload before update
  validateEvenementPayload(data);

  await updateLocalRecord<ReproductionEvent>('evenements', id, data);
}

/**
 * Soft delete a reproduction event in local database
 * Adds to sync queue for synchronization
 */
export async function deleteReproductionEvent(id: string): Promise<void> {
  return softDeleteLocalRecord('evenements', id);
}

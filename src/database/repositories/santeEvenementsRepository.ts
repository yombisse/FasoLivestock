import { getDatabase } from '../connection';
import { generateUUID } from '../../utils/uuid';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { EvenementSanitaire, CreateEvenementSanitaireRequest, UpdateEvenementSanitaireRequest } from '../../types/sante.types';

export interface CreateEvenementSanitaireData {
  id?: string;
  farm_id: string;
  type_evenement_id: string;
  animal_id: string;
  date_evenement: string;
  description?: string;
  cout?: number;
  metadonnees?: string;
}

export interface UpdateEvenementSanitaireData {
  type_evenement_id?: string;
  date_evenement?: string;
  description?: string;
  cout?: number;
  metadonnees?: string;
}

/**
 * Get all health events for a farm (non-deleted)
 */
export async function getEvenementsSanitaires(farmId: string): Promise<EvenementSanitaire[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT e.*, te.nom_type as type_nom, a.nom as animal_nom, a.numero_identification as animal_numero 
       FROM evenements e 
       LEFT JOIN type_evenements te ON e.type_evenement_id = te.id 
       LEFT JOIN animals a ON e.animal_id = a.id 
       WHERE e.farm_id = ? AND e.categorie = 'SANITAIRE' AND e.deleted_at IS NULL 
       ORDER BY e.date_evenement DESC`,
      [farmId]
    );

    // Helper to get rows from op-sqlite result
    const getRows = (result: any) => {
      if (!result) return [];
      if (result.rows) return result.rows as any[];
      if (Array.isArray(result)) return result as any[];
      return [];
    };

    const events = getRows(result) as any[];
    
    // Parse metadonnees JSON if present
    return events.map(event => ({
      ...event,
      metadonnees: event.metadonnees ? JSON.parse(event.metadonnees) : undefined,
    })) as EvenementSanitaire[];
  } catch (error) {
    console.error('[SanteEvenementsRepository] Error fetching evenements sanitaires:', error);
    throw error;
  }
}

/**
 * Get health events for a specific animal
 */
export async function getEvenementsSanitairesByAnimal(animalId: string): Promise<EvenementSanitaire[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM evenements 
       WHERE animal_id = ? AND categorie = 'SANITAIRE' AND deleted_at IS NULL 
       ORDER BY date_evenement DESC`,
      [animalId]
    );

    const events = (result.rows?._array || []) as any[];
    
    // Parse metadonnees JSON if present
    return events.map(event => ({
      ...event,
      metadonnees: event.metadonnees ? JSON.parse(event.metadonnees) : undefined,
    })) as EvenementSanitaire[];
  } catch (error) {
    console.error('[SanteEvenementsRepository] Error fetching evenements sanitaires by animal:', error);
    throw error;
  }
}

/**
 * Get a single health event by ID
 */
export async function getEvenementSanitaireById(id: string): Promise<EvenementSanitaire | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT * FROM evenements WHERE id = ? AND categorie = 'SANITAIRE' AND deleted_at IS NULL`,
      [id]
    );

    const events = result.rows?._array || [];
    if (events.length === 0) {
      return null;
    }

    const event = events[0] as any;
    return {
      ...event,
      metadonnees: event.metadonnees ? JSON.parse(event.metadonnees) : undefined,
    } as EvenementSanitaire;
  } catch (error) {
    console.error('[SanteEvenementsRepository] Error fetching evenement sanitaire by id:', error);
    throw error;
  }
}

/**
 * Create a health event in local database
 * Adds to sync queue for synchronization
 */
export async function createEvenementSanitaire(data: CreateEvenementSanitaireData): Promise<EvenementSanitaire> {
  const eventData = {
    ...data,
    categorie: 'SANITAIRE' as const,
  };
  return createLocalRecord<EvenementSanitaire>('evenements', eventData);
}

/**
 * Update a health event in local database
 * Adds to sync queue for synchronization
 */
export async function updateEvenementSanitaire(id: string, data: UpdateEvenementSanitaireData): Promise<EvenementSanitaire> {
  return updateLocalRecord<EvenementSanitaire>('evenements', id, data);
}

/**
 * Soft delete a health event (deleted_at timestamp)
 * NOTE: Delete will be handled by admin page, not mobile
 * This function is kept for potential future use but not exposed to mobile UI
 */
export async function deleteEvenementSanitaire(id: string): Promise<void> {
  return softDeleteLocalRecord('evenements', id);
}

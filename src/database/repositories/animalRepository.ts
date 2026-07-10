import { Animal } from '../../types/animal.types';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { getDatabase } from '../connection';

export async function createAnimal(data: Omit<Animal, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Animal> {
  const db = await getDatabase();

  // Check for duplicate numero_identification within the same farm
  if (data.farm_id && data.numero_identification) {
    const existingAnimal = await db.execute(
      `SELECT id FROM animals WHERE farm_id = ? AND numero_identification = ? AND deleted_at IS NULL`,
      [data.farm_id, data.numero_identification]
    );
    if (existingAnimal?.rows && existingAnimal.rows.length > 0) {
      throw new Error(`Un animal avec le numéro d'identification "${data.numero_identification}" existe déjà dans cette ferme.`);
    }
  }

  try {
    const result = await createLocalRecord<Animal>('animals', data);
    console.log('[AnimalRepository] Animal created successfully with sync_status pending, ID:', result.id);
    return result;
  } catch (error) {
    console.error('[AnimalRepository] Failed to create animal:', error);
    throw error;
  }
}

export async function updateAnimal(id: string, data: Partial<Animal>): Promise<Animal> {
  return updateLocalRecord<Animal>('animals', id, data);
}

export async function deleteAnimal(id: string): Promise<void> {
  return softDeleteLocalRecord('animals', id);
}

export async function getLocalAnimals(farmId: string): Promise<Animal[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM animals WHERE farm_id = ? AND deleted_at IS NULL`,
    [farmId]
  );

  if (!result) {
    return [];
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    return result.rows as Animal[];
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result as Animal[];
  }

  return [];
}

/**
 * Get only active animals (statut = 'ACTIF') for event creation
 */
export async function getLocalActiveAnimals(farmId: string): Promise<Animal[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM animals WHERE farm_id = ? AND statut = 'ACTIF' AND deleted_at IS NULL`,
    [farmId]
  );

  if (!result) {
    return [];
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    return result.rows as Animal[];
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result as Animal[];
  }

  return [];
}

export async function getLocalAnimalById(id: string): Promise<Animal | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT 
      a.*,
      e.id as espece_id,
      e.nom as espece_nom,
      f.id as farm_id,
      f.name as farm_name,
      l.id as lot_id,
      l.nom_lot as lot_nom,
      m.id as mother_id,
      m.nom as mother_nom
     FROM animals a
     LEFT JOIN especes e ON a.espece_id = e.id
     LEFT JOIN farms f ON a.farm_id = f.id
     LEFT JOIN lots l ON a.lot_id = l.id
     LEFT JOIN animals m ON a.mother_id = m.id
     WHERE a.id = ? AND a.deleted_at IS NULL`,
    [id]
  );

  if (!result) {
    return null;
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    const rows = result.rows as any[];
    if (rows.length > 0) {
      const row = rows[0];
      // Transform the flat result into nested structure
      return {
        ...row,
        espece: row.espece_id ? { id: row.espece_id, nom: row.espece_nom } : undefined,
        farm: row.farm_id ? { id: row.farm_id, name: row.farm_name } : undefined,
        lot: row.lot_id ? { id: row.lot_id, nom: row.lot_nom } : undefined,
        mother: row.mother_id ? { id: row.mother_id, nom: row.mother_nom } : undefined,
      } as Animal;
    }
    return null;
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    if (result.length > 0) {
      const row = result[0] as any;
      return {
        ...row,
        espece: row.espece_id ? { id: row.espece_id, nom: row.espece_nom } : undefined,
        farm: row.farm_id ? { id: row.farm_id, name: row.farm_name } : undefined,
        lot: row.lot_id ? { id: row.lot_id, nom: row.lot_nom } : undefined,
        mother: row.mother_id ? { id: row.mother_id, nom: row.mother_nom } : undefined,
      } as Animal;
    }
    return null;
  }

  return null;
}

/**
 * Check if an animal with the given numero_identification already exists in the farm
 */
export async function getLocalAnimalByNumeroIdentification(farmId: string, numeroIdentification: string): Promise<Animal | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM animals WHERE farm_id = ? AND numero_identification = ? AND deleted_at IS NULL`,
    [farmId, numeroIdentification]
  );

  if (!result) {
    return null;
  }

  if (result.rows && result.rows.length > 0) {
    return result.rows[0] as Animal;
  }

  if (Array.isArray(result) && result.length > 0) {
    return result[0] as Animal;
  }

  return null;
}

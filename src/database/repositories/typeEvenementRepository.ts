import { getDatabase } from '../connection';
import { BatchStatement } from '../batchTypes';

export interface TypeEvenement {
  id: string;
  nom_type: string;
  description?: string;
  categorie: 'MOUVEMENT' | 'REPRODUCTION' | 'SANITAIRE';
  farm_id?: string;
  is_system: number;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalTypeEvenements(): Promise<TypeEvenement[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM type_evenements WHERE deleted_at IS NULL`
  );

  if (!result) {
    return [];
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    return result.rows as TypeEvenement[];
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result as TypeEvenement[];
  }

  return [];
}

export async function getLocalTypeEvenementById(id: string): Promise<TypeEvenement | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM type_evenements WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  if (!result) {
    return null;
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    const rows = result.rows as TypeEvenement[];
    return rows.length > 0 ? rows[0] : null;
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }

  return null;
}

/**
 * Normalize type name for comparison (case-insensitive, accent-insensitive)
 */
function normalizeTypeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

/**
 * Get type_evenement UUID by name (case-insensitive, accent-insensitive)
 * This is the shared function to resolve UUIDs before writing events locally
 * @param nomType - The exact name from the backend seeder (e.g., 'Décès', 'Vente', 'Saillie')
 * @returns The UUID or null if not found
 */
export async function getTypeEvenementIdByName(nomType: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT id, nom_type FROM type_evenements WHERE deleted_at IS NULL`
    );
    
    const rows = result?.rows || [];
    console.log('[TypeEvenementRepository] Looking for type:', nomType, 'Found rows:', rows.length);
    
    const normalizedTarget = normalizeTypeName(nomType);
    
    const match = rows.find(
      (row: any) => normalizeTypeName(row.nom_type) === normalizedTarget
    );
    
    if (match) {
      console.log('[TypeEvenementRepository] Found match:', match.nom_type, '->', match.id);
    } else {
      console.log('[TypeEvenementRepository] No match found for:', nomType);
      console.log('[TypeEvenementRepository] Available types:', rows.map((r: any) => r.nom_type));
    }
    
    return match ? match.id : null;
  } catch (error) {
    console.error('[TypeEvenementRepository] Error getting type_evenement_id by name:', error);
    return null;
  }
}

/**
 * Build batch statements for type_evenement upserts (pure function, no DB execution)
 * Used with executeBatch for atomic operations
 * @param typeEvenements - Array of type_evenements to upsert
 * @param now - Current timestamp string
 * @returns Array of [sql, params] tuples for batch execution
 */
export function buildTypeEvenementUpsertStatements(typeEvenements: any[], now: string): BatchStatement[] {
  return typeEvenements.map((typeEvenement) => [
    `INSERT INTO type_evenements (
      id, nom_type, description, categorie, farm_id, is_system, sync_status, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'synced', 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nom_type = excluded.nom_type,
      description = excluded.description,
      categorie = excluded.categorie,
      farm_id = excluded.farm_id,
      is_system = excluded.is_system,
      sync_status = 'synced',
      updated_at = excluded.updated_at,
      version = version + 1`,
    [
      typeEvenement.id,
      typeEvenement.nom_type,
      typeEvenement.description || null,
      typeEvenement.categorie,
      typeEvenement.farm_id || null,
      typeEvenement.is_system || 0,
      typeEvenement.created_at || now,
      typeEvenement.updated_at || now,
    ],
  ]);
}

/**
 * Upsert type_evenements (insert or update) - atomic using ON CONFLICT
 * Used during sync to store type_evenements from backend
 * @param typeEvenements - Array of type_evenements to upsert
 * @param tx - Optional transaction object for atomic operations
 */
export async function upsertTypeEvenements(typeEvenements: TypeEvenement[], tx?: any): Promise<void> {
  try {
    const db = tx || (await getDatabase());
    const now = new Date().toISOString();

    for (const typeEvenement of typeEvenements) {
      // Atomic UPSERT using ON CONFLICT - eliminates race condition
      await db.execute(
        `INSERT INTO type_evenements (
          id, nom_type, description, categorie, farm_id, is_system, sync_status, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'synced', 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nom_type = excluded.nom_type,
          description = excluded.description,
          categorie = excluded.categorie,
          farm_id = excluded.farm_id,
          is_system = excluded.is_system,
          sync_status = 'synced',
          updated_at = excluded.updated_at,
          version = version + 1`,
        [
          typeEvenement.id,
          typeEvenement.nom_type,
          typeEvenement.description || null,
          typeEvenement.categorie,
          typeEvenement.farm_id || null,
          typeEvenement.is_system || 0,
          typeEvenement.created_at || now,
          typeEvenement.updated_at || now,
        ]
      );
    }

    console.log(`[TypeEvenementRepository] Upserted ${typeEvenements.length} type_evenements atomically`);
  } catch (error) {
    console.error('[TypeEvenementRepository] Error upserting type_evenements:', error);
    throw error;
  }
}

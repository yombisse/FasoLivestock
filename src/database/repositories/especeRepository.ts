import { getDatabase } from '../connection';
import { createLocalRecord } from './baseRepository';
import { BatchStatement } from '../batchTypes';

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
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM especes WHERE deleted_at IS NULL`
  );

  if (!result) {
    return [];
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    return result.rows as Espece[];
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result as Espece[];
  }

  return [];
}

export async function getLocalEspeceById(id: string): Promise<Espece | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM especes WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  if (!result) {
    return null;
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    const rows = result.rows as Espece[];
    return rows.length > 0 ? rows[0] : null;
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }

  return null;
}

/**
 * Build batch statements for espece upserts (pure function, no DB execution)
 * Used with executeBatch for atomic operations
 * @param especes - Array of especes to upsert
 * @param now - Current timestamp string
 * @returns Array of [sql, params] tuples for batch execution
 */
export function buildEspeceUpsertStatements(especes: Espece[], now: string): BatchStatement[] {
  return especes.map((espece) => [
    `INSERT INTO especes (
      id, nom, description, sync_status, version, created_at, updated_at
    ) VALUES (?, ?, ?, 'synced', 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nom = excluded.nom,
      description = excluded.description,
      sync_status = 'synced',
      updated_at = excluded.updated_at,
      version = version + 1`,
    [
      espece.id,
      espece.nom,
      espece.description || null,
      espece.created_at || now,
      espece.updated_at || now,
    ],
  ]);
}

/**
 * Upsert especes (insert or update) - atomic using ON CONFLICT
 * Used during sync to store especes from backend
 * @param especes - Array of especes to upsert
 * @param tx - Optional transaction object for atomic operations
 */
export async function upsertEspeces(especes: Espece[], tx?: any): Promise<void> {
  try {
    const db = tx || (await getDatabase());
    const now = new Date().toISOString();

    for (const espece of especes) {
      // Atomic UPSERT using ON CONFLICT - eliminates race condition
      await db.execute(
        `INSERT INTO especes (
          id, nom, description, sync_status, version, created_at, updated_at
        ) VALUES (?, ?, ?, 'synced', 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nom = excluded.nom,
          description = excluded.description,
          sync_status = 'synced',
          updated_at = excluded.updated_at,
          version = version + 1`,
        [
          espece.id,
          espece.nom,
          espece.description || null,
          espece.created_at || now,
          espece.updated_at || now,
        ]
      );
    }

    console.log(`[EspeceRepository] Upserted ${especes.length} especes atomically`);
  } catch (error) {
    console.error('[EspeceRepository] Error upserting especes:', error);
    throw error;
  }
}

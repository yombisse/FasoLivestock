import { getDatabase } from '../connection';
import { createLocalRecord } from './baseRepository';

export interface Lot {
  id: string;
  farm_id: string;
  nom_lot: string;
  nombre: number;
  description?: string;
  espece_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalLots(farmId: string): Promise<Lot[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM lots WHERE farm_id = ? AND deleted_at IS NULL`,
    [farmId]
  );

  if (!result) {
    return [];
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    return result.rows as Lot[];
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result as Lot[];
  }

  return [];
}

export async function getLocalLotById(id: string): Promise<Lot | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM lots WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  if (!result) {
    return null;
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    const rows = result.rows as Lot[];
    return rows.length > 0 ? rows[0] : null;
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }

  return null;
}

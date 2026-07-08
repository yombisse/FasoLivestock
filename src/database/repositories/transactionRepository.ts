import { Transaction, CreateTransactionData, UpdateTransactionData } from '../../types/transaction.types';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord, restoreLocalRecord } from './baseRepository';
import { getDatabase } from '../connection';

/**
 * Validate if a string is a valid UUID (any version)
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Legacy invalid categorie values that should be rejected
 */
const INVALID_CATEGORIE_VALUES = ['VENTE_ANIMAL', 'ACHAT_ANIMAL', 'ALIMENTATION', 'SANTE', 'REPRODUCTION'];

export async function createTransaction(data: Omit<CreateTransactionData, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Transaction> {
  // Validate categorie_id
  if (!data.categorie_id) {
    throw new Error('categorie_id is required and cannot be null or undefined');
  }

  if (typeof data.categorie_id !== 'string') {
    throw new Error('categorie_id must be a string');
  }

  // Check for legacy invalid values
  if (INVALID_CATEGORIE_VALUES.includes(data.categorie_id)) {
    throw new Error(`Invalid categorie_id: ${data.categorie_id} is a legacy value. Use a valid UUID instead.`);
  }

  // Validate UUID format
  if (!isValidUUID(data.categorie_id)) {
    throw new Error(`Invalid categorie_id: ${data.categorie_id} is not a valid UUID`);
  }

  return createLocalRecord<Transaction>('transactions', data);
}

export async function updateTransaction(id: string, data: Partial<UpdateTransactionData>): Promise<Transaction> {
  return updateLocalRecord<Transaction>('transactions', id, data);
}

export async function deleteTransaction(id: string): Promise<void> {
  return softDeleteLocalRecord('transactions', id);
}

export async function restoreTransaction(id: string): Promise<Transaction> {
  return restoreLocalRecord<Transaction>('transactions', id);
}

export async function getLocalTransactions(farmId: string, filters?: {
  type_transaction?: string;
  animal_id?: string;
  categorie_id?: string;
  date_debut?: string;
  date_fin?: string;
  revenus?: boolean;
  charges?: boolean;
  deleted?: boolean;
}): Promise<Transaction[]> {
  const db = await getDatabase();

  let query = `SELECT * FROM transactions WHERE farm_id = ?`;
  const params: any[] = [farmId];

  if (!filters?.deleted) {
    query += ' AND deleted_at IS NULL';
  } else if (filters?.deleted === true) {
    query += ' AND deleted_at IS NOT NULL';
  }

  if (filters?.type_transaction) {
    query += ' AND type_transaction = ?';
    params.push(filters.type_transaction);
  }

  if (filters?.animal_id) {
    query += ' AND animal_id = ?';
    params.push(filters.animal_id);
  }

  if (filters?.categorie_id) {
    query += ' AND categorie_id = ?';
    params.push(filters.categorie_id);
  }

  if (filters?.date_debut) {
    query += ' AND date_transaction >= ?';
    params.push(filters.date_debut);
  }

  if (filters?.date_fin) {
    query += ' AND date_transaction <= ?';
    params.push(filters.date_fin);
  }

  if (filters?.revenus === true) {
    query += ' AND type_transaction = ?';
    params.push('ENTREE');
  }

  if (filters?.charges === true) {
    query += ' AND type_transaction = ?';
    params.push('SORTIE');
  }

  query += ' ORDER BY date_transaction DESC, created_at DESC';

  const result = await db.execute(query, params);

  if (!result) {
    return [];
  }

  if (result.rows) {
    return result.rows as Transaction[];
  }

  if (Array.isArray(result)) {
    return result as Transaction[];
  }

  return [];
}

export async function getLocalTransactionById(id: string): Promise<Transaction | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM transactions WHERE id = ?`,
    [id]
  );

  if (!result) {
    return null;
  }

  if (result.rows) {
    const rows = result.rows as Transaction[];
    return rows.length > 0 ? rows[0] : null;
  }

  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }

  return null;
}

export async function getLocalBilan(farmId: string, filters?: {
  date_debut?: string;
  date_fin?: string;
}): Promise<{
  total_revenus: number;
  total_charges: number;
  bilan: number;
  nombre_transactions: number;
}> {
  const transactions = await getLocalTransactions(farmId, {
    ...filters,
    deleted: false,
  });

  const total_revenus = transactions
    .filter(t => t.type_transaction === 'ENTREE')
    .reduce((sum, t) => sum + t.montant, 0);

  const total_charges = transactions
    .filter(t => t.type_transaction === 'SORTIE')
    .reduce((sum, t) => sum + t.montant, 0);

  return {
    total_revenus,
    total_charges,
    bilan: total_revenus - total_charges,
    nombre_transactions: transactions.length,
  };
}

/**
 * Get transactions for a specific animal with animal details
 */
export async function getTransactionsByAnimal(farmId: string, animalId: string): Promise<Transaction[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT t.*, a.nom as animal_nom, a.numero_identification as animal_numero
       FROM transactions t
       LEFT JOIN animals a ON t.animal_id = a.id
       WHERE t.farm_id = ? AND t.animal_id = ? AND t.deleted_at IS NULL
       ORDER BY t.date_transaction DESC`,
      [farmId, animalId]
    );

    // Helper to get rows from op-sqlite result
    const getRows = (result: any) => {
      if (!result) return [];
      if (result.rows) return result.rows as any[];
      if (Array.isArray(result)) return result as any[];
      return [];
    };

    const transactions = getRows(result) as Transaction[];
    return transactions;
  } catch (error) {
    console.error('[TransactionRepository] Error fetching transactions by animal:', error);
    throw error;
  }
}

/**
 * Clean up transactions with invalid categorie_id (non-UUID values or null)
 * This removes transactions created before the fix
 */
export async function cleanupInvalidCategoryTransactions(): Promise<void> {
  const db = await getDatabase();

  try {
    // Delete transactions where categorie_id is null or not a valid UUID (contains underscore or is a known invalid value)
    await db.execute(
      `DELETE FROM transactions WHERE categorie_id IS NULL OR categorie_id IN ('VENTE_ANIMAL', 'ACHAT_ANIMAL')`
    );

    // Also clean up sync queue entries for these transactions
    await db.execute(
      `DELETE FROM sync_queue WHERE table_name = 'transactions' AND (data LIKE '%VENTE_ANIMAL%' OR data LIKE '%ACHAT_ANIMAL%' OR data LIKE '%"categorie_id":null%')`
    );

    console.log('[TransactionRepository] Cleaned up invalid category transactions');
  } catch (error) {
    console.error('[TransactionRepository] Error cleaning up invalid category transactions:', error);
  }
}

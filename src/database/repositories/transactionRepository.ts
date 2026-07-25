import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord } from './baseRepository';

export interface Transaction {
  id: string;
  type_transaction: string;
  montant: number;
  date_transaction: string;
  description?: string;
  farm_id: string;
  animal_id?: string;
  evenement_id?: string;
  categorie_id: string;
  user_id: string;
  tiers?: string;
  numero_transaction?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function createTransaction(data: Omit<Transaction, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Transaction> {
  return createLocalRecord<Transaction>('transactions', data);
}

export async function getLocalTransactions(farmId: string, animalId?: string): Promise<Transaction[]> {
  if (animalId) {
    const transactions = await database.get('transactions')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId))
      .fetch();
    const result = transactions.map((t: any) => ({
      id: t.id,
      type_transaction: t.type_transaction,
      montant: t.montant,
      date_transaction: t.date_transaction,
      description: t.description,
      farm_id: t.farm_id,
      animal_id: t.animal_id,
      evenement_id: t.evenement_id,
      categorie_id: t.categorie_id,
      user_id: t.user_id,
      tiers: t.tiers,
      numero_transaction: t.numero_transaction,
      sync_status: t.sync_status,
      last_modified_by: t.last_modified_by,
      version: t.version,
      created_at: t.createdAt?.toISOString() || t.created_at,
      updated_at: t.updatedAt?.toISOString() || t.updated_at,
      deleted_at: t.deletedAt?.toISOString() || t.deleted_at,
    } as Transaction));
    console.log('[TransactionRepository] Loaded transactions for animal:', result.length);
    if (result.length > 0) {
      console.log('[TransactionRepository] Sample transaction montant:', result[0].montant, 'type:', typeof result[0].montant);
    }
    return result;
  } else {
    const transactions = await database.get('transactions')
      .query(Q.where('farm_id', farmId))
      .fetch();
    const result = transactions.map((t: any) => ({
      id: t.id,
      type_transaction: t.type_transaction,
      montant: t.montant,
      date_transaction: t.date_transaction,
      description: t.description,
      farm_id: t.farm_id,
      animal_id: t.animal_id,
      evenement_id: t.evenement_id,
      categorie_id: t.categorie_id,
      user_id: t.user_id,
      tiers: t.tiers,
      numero_transaction: t.numero_transaction,
      sync_status: t.sync_status,
      last_modified_by: t.last_modified_by,
      version: t.version,
      created_at: t.createdAt?.toISOString() || t.created_at,
      updated_at: t.updatedAt?.toISOString() || t.updated_at,
      deleted_at: t.deletedAt?.toISOString() || t.deleted_at,
    } as Transaction));
    console.log('[TransactionRepository] Loaded transactions for farm:', result.length);
    if (result.length > 0) {
      console.log('[TransactionRepository] Sample transaction montant:', result[0].montant, 'type:', typeof result[0].montant);
    }
    return result;
  }
}

export function observeLocalTransactions(farmId: string, animalId?: string) {
  if (animalId) {
    return database.get('transactions')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId))
      .observe();
  } else {
    return database.get('transactions')
      .query(Q.where('farm_id', farmId))
      .observe();
  }
}

export async function getLocalTransactionById(id: string): Promise<Transaction | null> {
  try {
    const transactions = await database.get('transactions')
      .query(Q.where('id', id))
      .fetch();
    
    if (transactions.length > 0) {
      return transactions[0] as unknown as Transaction;
    }
    return null;
  } catch (error) {
    console.error('[TransactionRepository] Error getting transaction by ID:', error);
    return null;
  }
}

export async function getTransactionSummary(farmId: string): Promise<{ventes: number, achats: number, ventes_count: number, achats_count: number}> {
  const transactions = await getLocalTransactions(farmId);
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  let ventes = 0;
  let achats = 0;
  let ventes_count = 0;
  let achats_count = 0;

  transactions.forEach(t => {
    const transactionDate = new Date(t.date_transaction);
    if (transactionDate >= thirtyDaysAgo && transactionDate <= today) {
      if (t.type_transaction === 'ENTREE') {
        ventes += t.montant || 0;
        ventes_count += 1;
      } else if (t.type_transaction === 'SORTIE') {
        achats += t.montant || 0;
        achats_count += 1;
      }
    }
  });

  return { ventes, achats, ventes_count, achats_count };
}

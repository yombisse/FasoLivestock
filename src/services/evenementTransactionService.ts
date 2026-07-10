import { createTransaction } from '../database/repositories/transactionRepository';
import { createLocalRecord } from '../database/repositories/baseRepository';
import { getLocalCategories } from '../database/repositories/categorieRepository';
import { getDatabase } from '../database/connection';

// Helper function to resolve category ID from name or UUID
async function resolveCategoryId(categorieIdOrName: string): Promise<string | null> {
  // Check if it's already a UUID (simple validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(categorieIdOrName)) {
    return categorieIdOrName;
  }

  // If not a UUID, try to resolve by name
  try {
    const categories = await getLocalCategories();
    const category = categories.find((cat: any) =>
      cat.nom_categorie.toLowerCase() === categorieIdOrName.toLowerCase()
    );
    return category?.id || null;
  } catch (error) {
    console.error('[EvenementTransactionService] Error resolving category ID:', error);
    return null;
  }
}

interface CreerTransactionDepuisEvenementParams {
  evenementId: string;
  farmId: string;
  animalId?: string;
  cout: number;
  dateEvenement: string;
  categorieId: string;
  userId?: string;
}

/**
 * Create a transaction automatically when an event with cost is created
 * This replicates the backend EvenementTransactionService logic for offline-first support
 * @param params - Parameters for creating the transaction
 */
export async function creerTransactionDepuisEvenement(
  params: CreerTransactionDepuisEvenementParams
): Promise<void> {
  const { evenementId, farmId, animalId, cout, dateEvenement, categorieId, userId } = params;

  // Only create transaction if cost > 0
  if (cout <= 0) {
    console.log('[EvenementTransactionService] Cost is 0 or negative, skipping transaction creation');
    return;
  }

  // Resolve category ID dynamically from local DB
  const resolvedCategoryId = await resolveCategoryId(categorieId);
  if (!resolvedCategoryId) {
    console.error(`[EvenementTransactionService] categorieId '${categorieId}' introuvable en local. Synchronisation requise.`);
    return;
  }

  try {
    await createTransaction({
      farm_id: farmId,
      animal_id: animalId,
      evenement_id: evenementId,
      type_transaction: 'SORTIE',
      montant: cout,
      categorie_id: resolvedCategoryId,
      date_transaction: dateEvenement,
      description: `Frais généré automatiquement`,
      user_id: userId,
    });

    console.log(`[EvenementTransactionService] Transaction créée pour l'événement ${evenementId} (${cout})`);
  } catch (error) {
    console.error('[EvenementTransactionService] Erreur lors de la création de la transaction:', error);
    // Don't throw - the event creation should not fail if transaction creation fails
    // The transaction can be created later during sync
  }
}

interface CreerEvenementDepuisTransactionParams {
  transactionId: string;
  farmId: string;
  animalId?: string;
  montant: number;
  dateTransaction: string;
  typeEvenementId: string;
  userId?: string;
}

/**
 * Create an event automatically when a transaction is created
 * This ensures bidirectional consistency between events and transactions
 * @param params - Parameters for creating the event
 */
export async function creerEvenementDepuisTransaction(
  params: CreerEvenementDepuisTransactionParams
): Promise<void> {
  const { transactionId, farmId, animalId, montant, dateTransaction, typeEvenementId, userId } = params;

  // Only create event if montant > 0
  if (montant <= 0) {
    console.log('[EvenementTransactionService] Montant is 0 or negative, skipping event creation');
    return;
  }

  if (!typeEvenementId) {
    console.error(`[EvenementTransactionService] typeEvenementId requis. Synchronisation requise.`);
    return;
  }

  if (!animalId) {
    console.error(`[EvenementTransactionService] animalId requis pour créer un événement. Synchronisation requise.`);
    return;
  }

  try {
    // Check if an event already exists for this transaction to avoid duplication
    const db = await getDatabase();
    const existingEvent = await db.execute(
      `SELECT id FROM evenements WHERE transaction_id = ? AND animal_id = ? LIMIT 1`,
      [transactionId, animalId]
    );

    if (existingEvent?.rows?.length > 0) {
      console.log(`[EvenementTransactionService] Event already exists for transaction ${transactionId}, skipping creation`);
      return;
    }

    await createLocalRecord('evenements', {
      farm_id: farmId,
      animal_id: animalId,
      type_evenement_id: typeEvenementId,
      date_evenement: dateTransaction,
      description: `Transaction générée automatiquement`,
      categorie: 'AUTRE',
      transaction_id: transactionId,
      cout: montant,
    });

    console.log(`[EvenementTransactionService] Événement créé pour la transaction ${transactionId} (${montant})`);
  } catch (error) {
    console.error('[EvenementTransactionService] Erreur lors de la création de l\'événement:', error);
    // Don't throw - the transaction creation should not fail if event creation fails
    // The event can be created later during sync
  }
}

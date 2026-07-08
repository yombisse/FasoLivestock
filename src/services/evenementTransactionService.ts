import { createTransaction } from '../database/repositories/transactionRepository';

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

  if (!categorieId) {
    console.error(`[EvenementTransactionService] categorieId requis. Synchronisation requise.`);
    return;
  }

  try {
    await createTransaction({
      farm_id: farmId,
      animal_id: animalId,
      evenement_id: evenementId,
      type_transaction: 'SORTIE',
      montant: cout,
      categorie_id: categorieId,
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

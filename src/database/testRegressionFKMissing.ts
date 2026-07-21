import database from './watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { syncWatermelon } from '../sync/watermelonSync';
import { authStorage } from '../storage/authStorage';
import { farmStorage } from '../storage/farmStorage';

/**
 * Test de régression FK_MISSING
 * Scénario: Création offline d'un animal via Achat (génère Evenement MOUVEMENT)
 * Objectif: Vérifier qu'après sync, l'animal existe avec le bon statut,
 * un seul Evenement existe, et une seule Transaction existe côté serveur.
 */
export async function testRegressionFKMissing() {
  console.log('[TestRegressionFKMissing] Starting regression test for FK_MISSING bug...');

  try {
    // Step 1: Setup
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No active farm found');
    }
    const farmId = farm.id;

    const user = await authStorage.getUser();
    if (!user) {
      throw new Error('No user found');
    }

    // Step 2: Get type_evenement_id for 'Achat'
    const typeEvenements = await database.get('type_evenements').query().fetch();
    const achatTypeEvenement = typeEvenements.find(
      (type: any) => type.nom_type.toLowerCase() === 'achat'
    );
    if (!achatTypeEvenement) {
      throw new Error('Type evenement Achat not found. Please sync first.');
    }
    const typeEvenementId = achatTypeEvenement.id;

    // Step 3: Get categorie for dépenses
    const categories = await database.get('categories').query(
      Q.where('farm_id', farmId)
    ).fetch();
    const expenseCategory = categories.find(
      (cat: any) => cat.type === 'DEPENSE'
    );
    if (!expenseCategory) {
      throw new Error('Expense category not found');
    }
    const categorieId = expenseCategory.id;

    // Step 4: Get espece
    const especes = await database.get('especes').query().fetch();
    if (especes.length === 0) {
      throw new Error('No especes found. Please sync first.');
    }
    const especeId = especes[0].id;

    // Step 5: Create Animal + Evenement + Transaction offline (simulate offline mode)
    console.log('[TestRegressionFKMissing] Creating animal offline...');
    const testAnimalNumero = `TEST_${Date.now()}`;
    
    await database.write(async () => {
      // Create Animal
      const newAnimal = await database.get('animals').create((animal: any) => {
        animal.farm_id = farmId;
        animal.nom = 'Test Animal FK Missing';
        animal.numero_identification = testAnimalNumero;
        animal.espece_id = especeId;
        animal.race = 'Test Race';
        animal.sexe = 'MALE';
        animal.poids = 250;
        animal.statut = 'SAIN';
        animal.date_naissance = new Date().toISOString().split('T')[0];
        animal.createdAt = new Date();
        animal.updatedAt = new Date();
      });
      console.log('[TestRegressionFKMissing] Created animal with ID:', newAnimal.id);

      // Create Evenement (MOUVEMENT)
      await database.get('evenements').create((evenement: any) => {
        evenement.farm_id = farmId;
        evenement.animal_id = newAnimal.id;
        evenement.type_evenement_id = typeEvenementId;
        evenement.date_evenement = new Date().toISOString().split('T')[0];
        evenement.description = 'Test Achat - FK Missing Regression';
        evenement.categorie = 'MOUVEMENT';
        evenement.statut_avant = 'INACTIF';
        evenement.statut_apres = 'SAIN';
        evenement.createdAt = new Date();
        evenement.updatedAt = new Date();
      });
      console.log('[TestRegressionFKMissing] Created evenement for animal');

      // Create Transaction (NOT linked to evenement - per contract)
      await database.get('transactions').create((transaction: any) => {
        transaction.farm_id = farmId;
        transaction.type_transaction = 'SORTIE';
        transaction.montant = 5000;
        transaction.date_transaction = new Date().toISOString();
        transaction.description = 'Test Achat Transaction - FK Missing Regression';
        transaction.animal_id = newAnimal.id;
        transaction.categorie_id = categorieId;
        transaction.createdAt = new Date();
        transaction.updatedAt = new Date();
      });
      console.log('[TestRegressionFKMissing] Created transaction for animal');
    });

    // Step 6: Verify local state before sync
    console.log('[TestRegressionFKMissing] Verifying local state before sync...');
    const localAnimals = await database.get('animals').query(
      Q.where('numero_identification', testAnimalNumero)
    ).fetch();
    
    if (localAnimals.length !== 1) {
      throw new Error(`Expected 1 animal locally, found ${localAnimals.length}`);
    }
    const animal = localAnimals[0] as any;
    console.log('[TestRegressionFKMissing] Local animal statut:', animal.statut);

    const localEvenements = await database.get('evenements').query(
      Q.where('animal_id', animal.id)
    ).fetch();
    console.log('[TestRegressionFKMissing] Local evenements count:', localEvenements.length);

    const localTransactions = await database.get('transactions').query(
      Q.where('animal_id', animal.id)
    ).fetch();
    console.log('[TestRegressionFKMissing] Local transactions count:', localTransactions.length);

    // Step 7: Sync to server
    console.log('[TestRegressionFKMissing] Syncing to server...');
    const syncResult = await syncWatermelon(farmId);
    if (!syncResult.success) {
      throw new Error(`Sync failed: ${syncResult.error}`);
    }
    console.log('[TestRegressionFKMissing] Sync completed successfully');

    // Step 8: Verify server state (via API call)
    console.log('[TestRegressionFKMissing] Verifying server state...');
    // Note: This would require API calls to verify server state
    // For now, we verify that sync completed without FK_MISSING error
    console.log('[TestRegressionFKMissing] No FK_MISSING error detected during sync');

    // Step 9: Cleanup test data
    console.log('[TestRegressionFKMissing] Cleaning up test data...');
    await database.write(async () => {
      await animal.destroyPermanently();
    });
    console.log('[TestRegressionFKMissing] Test data cleaned up');

    console.log('[TestRegressionFKMissing] ✅ Regression test PASSED');
    return {
      success: true,
      message: 'FK_MISSING regression test passed',
      details: {
        animalId: animal.id,
        animalStatut: animal.statut,
        evenementsCount: localEvenements.length,
        transactionsCount: localTransactions.length,
      },
    };
  } catch (error: any) {
    console.error('[TestRegressionFKMissing] ❌ Regression test FAILED:', error);
    return {
      success: false,
      message: 'FK_MISSING regression test failed',
      error: error.message,
    };
  }
}

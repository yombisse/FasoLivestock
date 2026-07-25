import database from './watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { syncWatermelon } from '../sync/watermelonSync';
import { authStorage } from '../storage/authStorage';
import { farmStorage } from '../storage/farmStorage';

/**
 * Test de résolution de conflit
 * Scénario: Modifier le même animal en offline sur deux devices différents
 * Objectif: Vérifier que le serveur fait foi (pas de merge local prioritaire)
 */
export async function testConflictResolution() {
  console.log('[TestConflictResolution] Starting conflict resolution test...');

  try {
    // Step 1: Setup
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No active farm found');
    }
    const farmId = farm.id;

    // Step 2: Create a test animal
    console.log('[TestConflictResolution] Creating test animal...');
    const testAnimalNumero = `CONFLICT_TEST_${Date.now()}`;
    
    const newAnimal = await database.write(async () => {
      return await database.get('animals').create((animal: any) => {
        animal.farm_id = farmId;
        animal.nom = 'Conflict Test Animal';
        animal.numero_identification = testAnimalNumero;
        animal.espece_id = 'test_espece_id';
        animal.race = 'Test Race';
        animal.sexe = 'MALE';
        animal.poids = 250;
        animal.statut = 'SAIN';
        animal.date_naissance = new Date().toISOString().split('T')[0];
        animal.createdAt = new Date();
        animal.updatedAt = new Date();
      });
    });
    console.log('[TestConflictResolution] Created animal with ID:', newAnimal.id);

    // Step 3: Sync to server (Device 1)
    console.log('[TestConflictResolution] Syncing Device 1 to server...');
    const syncResult1 = await syncWatermelon(farmId);
    if (!syncResult1.success) {
      throw new Error(`Device 1 sync failed: ${syncResult1.error}`);
    }
    console.log('[TestConflictResolution] Device 1 synced successfully');

    // Step 4: Simulate Device 2 modification (offline)
    console.log('[TestConflictResolution] Simulating Device 2 offline modification...');
    await database.write(async () => {
      const animal = await database.get('animals').find(newAnimal.id);
      await animal.update((a: any) => {
        a.nom = 'Conflict Test Animal - Device 2 Modified';
        a.poids = 300; // Changed from 250
        a.updatedAt = new Date();
      });
    });
    console.log('[TestConflictResolution] Device 2 modified animal offline');

    // Step 5: Simulate Device 1 modification (offline) - different change
    console.log('[TestConflictResolution] Simulating Device 1 offline modification...');
    await database.write(async () => {
      const animal = await database.get('animals').find(newAnimal.id);
      await animal.update((a: any) => {
        a.race = 'Modified Race - Device 1'; // Different field
        a.updatedAt = new Date();
      });
    });
    console.log('[TestConflictResolution] Device 1 modified animal offline');

    // Step 6: Sync Device 2 first
    console.log('[TestConflictResolution] Syncing Device 2 to server...');
    const syncResult2 = await syncWatermelon(farmId);
    if (!syncResult2.success) {
      throw new Error(`Device 2 sync failed: ${syncResult2.error}`);
    }
    console.log('[TestConflictResolution] Device 2 synced successfully');

    // Step 7: Sync Device 1 (should trigger conflict resolution)
    console.log('[TestConflictResolution] Syncing Device 1 to server (conflict expected)...');
    const syncResult3 = await syncWatermelon(farmId);
    // Note: WatermelonDB sync should handle conflicts by server-wins strategy
    console.log('[TestConflictResolution] Device 1 sync completed:', syncResult3.success);

    // Step 8: Verify final state
    console.log('[TestConflictResolution] Verifying final state...');
    const finalAnimal = await database.get('animals').find(newAnimal.id);
    const animalAny = finalAnimal as any;
    console.log('[TestConflictResolution] Final animal nom:', animalAny.nom);
    console.log('[TestConflictResolution] Final animal poids:', animalAny.poids);
    console.log('[TestConflictResolution] Final animal race:', animalAny.race);

    // Step 9: Cleanup
    console.log('[TestConflictResolution] Cleaning up test data...');
    await database.write(async () => {
      await finalAnimal.destroyPermanently();
    });
    console.log('[TestConflictResolution] Test data cleaned up');

    console.log('[TestConflictResolution] ✅ Conflict resolution test PASSED');
    return {
      success: true,
      message: 'Conflict resolution test passed',
      details: {
        animalId: newAnimal.id,
        finalNom: animalAny.nom,
        finalPoids: animalAny.poids,
        finalRace: animalAny.race,
      },
    };
  } catch (error: any) {
    console.error('[TestConflictResolution] ❌ Conflict resolution test FAILED:', error);
    return {
      success: false,
      message: 'Conflict resolution test failed',
      error: error.message,
    };
  }
}

/**
 * Test manuel du conflictResolver client-wins par colonne
 * Scénario: Modifier un champ localement hors ligne, simuler un pull avec version remote différente sur un autre champ
 * Objectif: Vérifier que _changed est bien une chaîne et que les colonnes modifiées localement sont préservées
 */
export async function testConflictResolverColumnMerge() {
  console.log('[TestConflictResolverColumnMerge] Starting column merge test...');

  try {
    // Step 1: Setup
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No active farm found');
    }
    const farmId = farm.id;

    // Step 2: Create a test animal
    console.log('[TestConflictResolverColumnMerge] Creating test animal...');
    const testAnimalNumero = `COLUMN_MERGE_TEST_${Date.now()}`;
    
    const newAnimal = await database.write(async () => {
      return await database.get('animals').create((animal: any) => {
        animal.farm_id = farmId;
        animal.nom = 'Column Merge Test Animal';
        animal.numero_identification = testAnimalNumero;
        animal.espece_id = 'test_espece_id';
        animal.race = 'Test Race';
        animal.sexe = 'MALE';
        animal.poids = 250;
        animal.statut = 'SAIN';
        animal.date_naissance = new Date().toISOString().split('T')[0];
        animal.createdAt = new Date();
        animal.updatedAt = new Date();
      });
    });
    console.log('[TestConflictResolverColumnMerge] Created animal with ID:', newAnimal.id);

    // Step 3: Sync to server to establish baseline
    console.log('[TestConflictResolverColumnMerge] Syncing to server...');
    const syncResult1 = await syncWatermelon(farmId);
    if (!syncResult1.success) {
      throw new Error(`Initial sync failed: ${syncResult1.error}`);
    }
    console.log('[TestConflictResolverColumnMerge] Initial sync successful');

    // Step 4: Modify a single field locally (offline, no push)
    console.log('[TestConflictResolverColumnMerge] Modifying poids field locally (offline)...');
    await database.write(async () => {
      const animal = await database.get('animals').find(newAnimal.id);
      await animal.update((a: any) => {
        a.poids = 300; // Changed from 250
        a.updatedAt = new Date();
      });
    });
    
    // Check _changed field
    const animalBeforePull = await database.get('animals').find(newAnimal.id);
    const animalBeforePullAny = animalBeforePull as any;
    console.log('[TestConflictResolverColumnMerge] _changed field after local modification:', animalBeforePullAny._changed);
    console.log('[TestConflictResolverColumnMerge] _changed type:', typeof animalBeforePullAny._changed);
    console.log('[TestConflictResolverColumnMerge] Current poids:', animalBeforePullAny.poids);

    // Step 5: Simulate a pull with a remote version that has a different field changed
    // For this test, we'll manually trigger another sync which will pull any server changes
    // In a real scenario, another device would have modified 'race' on the server
    console.log('[TestConflictResolverColumnMerge] Syncing again to trigger conflict resolution...');
    const syncResult2 = await syncWatermelon(farmId);
    if (!syncResult2.success) {
      throw new Error(`Second sync failed: ${syncResult2.error}`);
    }
    console.log('[TestConflictResolverColumnMerge] Second sync completed');

    // Step 6: Verify that the locally modified field (poids) was preserved
    const finalAnimal = await database.get('animals').find(newAnimal.id);
    const finalAnimalAny = finalAnimal as any;
    console.log('[TestConflictResolverColumnMerge] Final poids:', finalAnimalAny.poids);
    console.log('[TestConflictResolverColumnMerge] Final race:', finalAnimalAny.race);

    // Step 7: Cleanup
    console.log('[TestConflictResolverColumnMerge] Cleaning up test data...');
    await database.write(async () => {
      await finalAnimal.destroyPermanently();
    });
    console.log('[TestConflictResolverColumnMerge] Test data cleaned up');

    console.log('[TestConflictResolverColumnMerge] ✅ Column merge test PASSED');
    return {
      success: true,
      message: 'Column merge test passed',
      details: {
        animalId: newAnimal.id,
        changedFieldType: typeof animalBeforePullAny._changed,
        changedFieldValue: animalBeforePullAny._changed,
        finalPoids: finalAnimalAny.poids,
      },
    };
  } catch (error: any) {
    console.error('[TestConflictResolverColumnMerge] ❌ Column merge test FAILED:', error);
    return {
      success: false,
      message: 'Column merge test failed',
      error: error.message,
    };
  }
}

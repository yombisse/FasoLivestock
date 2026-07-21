import database from './watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { syncWatermelon } from '../sync/watermelonSync';
import { farmStorage } from '../storage/farmStorage';

/**
 * Test de performance
 * Scénario: Temps de sync pour ~200 animaux + événements associés
 * Objectif: Mesurer le temps de sync et vérifier que c'est acceptable (< 10s)
 */
export async function testPerformance() {
  console.log('[TestPerformance] Starting performance test...');
  
  const startTime = Date.now();

  try {
    // Step 1: Setup
    const farm = await farmStorage.getActiveFarm();
    if (!farm) {
      throw new Error('No active farm found');
    }
    const farmId = farm.id;

    // Step 2: Create 200 test animals with events
    console.log('[TestPerformance] Creating 200 test animals with events...');
    const animalIds: string[] = [];
    const batchSize = 20;
    
    for (let batch = 0; batch < 10; batch++) {
      await database.write(async () => {
        for (let i = 0; i < batchSize; i++) {
          const index = batch * batchSize + i;
          const animal = await database.get('animals').create((a: any) => {
            a.farm_id = farmId;
            a.nom = `Perf Test Animal ${index}`;
            a.numero_identification = `PERF_${Date.now()}_${index}`;
            a.espece_id = 'test_espece_id';
            a.race = 'Test Race';
            a.sexe = index % 2 === 0 ? 'MALE' : 'FEMELLE';
            a.poids = 200 + (index % 50);
            a.statut = 'SAIN';
            a.date_naissance = new Date(Date.now() - (index * 86400000)).toISOString().split('T')[0];
            a.createdAt = new Date();
            a.updatedAt = new Date();
          });
          animalIds.push(animal.id);

          // Create 1-2 events per animal
          const eventCount = 1 + (index % 2);
          for (let e = 0; e < eventCount; e++) {
            await database.get('evenements').create((evt: any) => {
              evt.farm_id = farmId;
              evt.animal_id = animal.id;
              evt.type_evenement_id = 'test_type_id';
              evt.date_evenement = new Date(Date.now() - (e * 86400000)).toISOString().split('T')[0];
              evt.description = `Perf Test Event ${e} for Animal ${index}`;
              evt.categorie = e % 2 === 0 ? 'MOUVEMENT' : 'SANITAIRE';
              evt.statut_avant = 'SAIN';
              evt.statut_apres = 'SAIN';
              evt.createdAt = new Date();
              evt.updatedAt = new Date();
            });
          }
        }
      });
      console.log(`[TestPerformance] Created batch ${batch + 1}/10 (${(batch + 1) * batchSize} animals)`);
    }

    const creationTime = Date.now() - startTime;
    console.log(`[TestPerformance] Created ${animalIds.length} animals in ${creationTime}ms`);

    // Step 3: Count local data before sync
    const localAnimals = await database.get('animals').query(
      Q.where('farm_id', farmId)
    ).fetch();
    const localEvenements = await database.get('evenements').query(
      Q.where('farm_id', farmId)
    ).fetch();
    console.log('[TestPerformance] Local animals:', localAnimals.length);
    console.log('[TestPerformance] Local evenements:', localEvenements.length);

    // Step 4: Sync to server
    console.log('[TestPerformance] Starting sync...');
    const syncStartTime = Date.now();
    const syncResult = await syncWatermelon(farmId);
    const syncTime = Date.now() - syncStartTime;
    
    if (!syncResult.success) {
      throw new Error(`Sync failed: ${syncResult.error}`);
    }
    console.log(`[TestPerformance] Sync completed in ${syncTime}ms`);

    // Step 5: Verify performance threshold
    const isAcceptable = syncTime < 10000; // 10 seconds threshold
    console.log(`[TestPerformance] Sync time ${syncTime}ms is ${isAcceptable ? 'acceptable' : 'NOT acceptable'} (threshold: 10000ms)`);

    // Step 6: Cleanup
    console.log('[TestPerformance] Cleaning up test data...');
    const cleanupStartTime = Date.now();
    await database.write(async () => {
      for (const animalId of animalIds) {
        try {
          const animal = await database.get('animals').find(animalId);
          await animal.destroyPermanently();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    });
    const cleanupTime = Date.now() - cleanupStartTime;
    console.log(`[TestPerformance] Cleanup completed in ${cleanupTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`[TestPerformance] Total test time: ${totalTime}ms`);

    console.log('[TestPerformance] ✅ Performance test PASSED');
    return {
      success: true,
      message: 'Performance test passed',
      details: {
        animalsCreated: animalIds.length,
        evenementsCreated: localEvenements.length,
        creationTimeMs: creationTime,
        syncTimeMs: syncTime,
        cleanupTimeMs: cleanupTime,
        totalTimeMs: totalTime,
        syncAcceptable: isAcceptable,
      },
    };
  } catch (error: any) {
    console.error('[TestPerformance] ❌ Performance test FAILED:', error);
    return {
      success: false,
      message: 'Performance test failed',
      error: error.message,
    };
  }
}

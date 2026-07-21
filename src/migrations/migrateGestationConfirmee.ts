import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

/**
 * Migration script: GESTATION_CONFIRMEE → GESTATION
 * 
 * This script migrates existing WatermelonDB records that may have
 * references to the old "Gestation confirmée" name in their metadata.
 * 
 * The type_evenement_id remains the same (HkGB81kowtR76VdLZqZO),
 * only the display name and metadata references need updating.
 */

export async function migrateGestationConfirmee(): Promise<void> {
  console.log('[Migration] Starting GESTATION_CONFIRMEE → GESTATION migration...');
  
  try {
    await database.write(async () => {
      // Find all events with the gestation type_evenement_id
      const evenements = await database
        .get('evenements')
        .query(Q.where('type_evenement_id', 'HkGB81kowtR76VdLZqZO'))
        .fetch();

      console.log(`[Migration] Found ${evenements.length} gestation events to check`);

      let updatedCount = 0;

      for (const evenement of evenements) {
        const metadonnees = (evenement as any).metadonnees;
        
        if (metadonnees && typeof metadonnees === 'string') {
          try {
            const metadata = JSON.parse(metadonnees);
            let needsUpdate = false;

            // Check and update typeEvenementNom if it has the old name
            if (metadata.typeEvenementNom === 'Gestation confirmée') {
              metadata.typeEvenementNom = 'Gestation';
              needsUpdate = true;
            }

            // Check and update any other potential references
            if (metadata.type_nom === 'Gestation confirmée') {
              metadata.type_nom = 'Gestation';
              needsUpdate = true;
            }

            if (metadata.description && metadata.description.includes('Gestation confirmée')) {
              metadata.description = metadata.description.replace('Gestation confirmée', 'Gestation');
              needsUpdate = true;
            }

            if (needsUpdate) {
              await evenement.update((ev: any) => {
                ev.metadonnees = JSON.stringify(metadata);
              });
              updatedCount++;
              console.log(`[Migration] Updated event ${evenement.id}`);
            }
          } catch (error) {
            console.error(`[Migration] Error parsing metadata for event ${evenement.id}:`, error);
          }
        }
      }

      console.log(`[Migration] Migration complete. Updated ${updatedCount} events.`);
    });
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    throw error;
  }
}

/**
 * Run this migration once to update existing data.
 * Call this from your app initialization or a dedicated migration screen.
 */
export async function runMigrationIfNeeded(): Promise<boolean> {
  const MIGRATION_KEY = 'GESTATION_CONFIRMEE_MIGRATED';
  
  try {
    // Check if migration has already run
    const hasMigrated = await database.get('migrations')
      .query(Q.where('key', MIGRATION_KEY))
      .fetch();

    if (hasMigrated.length > 0) {
      console.log('[Migration] Already migrated, skipping.');
      return false;
    }

    // Run the migration
    await migrateGestationConfirmee();

    // Mark migration as complete
    await database.write(async () => {
      await database.get('migrations').create((migration: any) => {
        migration.key = MIGRATION_KEY;
        migration.executed_at = new Date().toISOString();
      });
    });

    console.log('[Migration] Migration marked as complete.');
    return true;
  } catch (error) {
    console.error('[Migration] Error in runMigrationIfNeeded:', error);
    
    // If migrations table doesn't exist, just run the migration
    if ((error as any).message?.includes('no such table')) {
      console.log('[Migration] Migrations table not found, running migration anyway.');
      await migrateGestationConfirmee();
      return true;
    }
    
    throw error;
  }
}

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { schema } from './watermelonMigrations';
import { Q } from '@nozbe/watermelondb';
import { Animal } from './models/Animal';
import { Evenement } from './models/Evenement';
import { Transaction } from './models/Transaction';
import { Espece } from './models/Espece';
import { Categorie } from './models/Categorie';
import { TypeEvenement } from './models/TypeEvenement';
import { Lot } from './models/Lot';
import { Farm } from './models/Farm';
import { Naissance } from './models/Naissance';
import { Notification } from './models/Notification';
import { FarmUser } from './models/FarmUser';
import { SanteRappel } from './models/SanteRappel';
import { generateUUID } from '../utils/uuid';

// Configurer le générateur d'ID global pour WatermelonDB
// Génère des IDs de 20 caractères alphanumériques conformes au backend
setGenerator(generateUUID);

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'FasoLivestockWMDB', // New database name to force schema recreation
  jsi: false, // Disable JSI for dev mode (not available with remote debugger)
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
  usesExclusiveLocking: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Animal, Evenement, Transaction, Espece, Categorie, TypeEvenement, Lot, Farm, Naissance, Notification, FarmUser, SanteRappel],
});

// Clear all local data for clean sync
export async function clearLocalDatabase() {
  try {
    console.log('[WatermelonDB] Clearing local database...');
    
    await database.write(async () => {
      // Clear all tables
      const tables = ['transactions', 'evenements', 'animals', 'naissances', 'notifications', 'farm_user'];
      
      for (const tableName of tables) {
        const records = await database.get(tableName).query().fetch();
        for (const record of records) {
          await record.destroyPermanently();
        }
        console.log(`[WatermelonDB] Cleared ${records.length} records from ${tableName}`);
      }
    });
    
    console.log('[WatermelonDB] Local database cleared successfully');
  } catch (error) {
    console.error('[WatermelonDB] Error clearing local database:', error);
    throw error;
  }
}

// Clean up any existing dummy records that might cause sync errors
export async function cleanupDummyRecords() {
  try {
    console.log('[WatermelonDB] Cleaning up dummy records...');
    
    await database.write(async () => {
      // Clean up dummy animals
      const dummyAnimals = await database.get('animals').query(Q.where('numero_identification', '__dummy__')).fetch();
      for (const animal of dummyAnimals) {
        await animal.destroyPermanently();
      }
      console.log(`[WatermelonDB] Cleaned up ${dummyAnimals.length} dummy animal records`);
      
      // Clean up any records with dummy farm_id
      const tables = ['animals', 'evenements', 'transactions', 'naissances'];
      for (const tableName of tables) {
        const dummyFarmRecords = await database.get(tableName).query(Q.where('farm_id', '__dummy__')).fetch();
        for (const record of dummyFarmRecords) {
          await record.destroyPermanently();
        }
        if (dummyFarmRecords.length > 0) {
          console.log(`[WatermelonDB] Cleaned up ${dummyFarmRecords.length} dummy farm_id records from ${tableName}`);
        }
      }
    });
    
    console.log('[WatermelonDB] Dummy records cleanup completed');
  } catch (error) {
    console.error('[WatermelonDB] Error cleaning up dummy records:', error);
    throw error;
  }
}

// Reset database completely (for debugging sync issues)
export async function resetDatabase() {
  console.log('[WatermelonDB] Resetting database...');
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log('[WatermelonDB] Database reset successfully');
  } catch (error) {
    console.error('[WatermelonDB] Error resetting database:', error);
    throw error;
  }
}

export default database;

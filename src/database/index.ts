import database, { cleanupDummyRecords, resetDatabase } from './watermelonIndex';

export async function initDatabase() {
  // WatermelonDB database is already initialized in watermelonIndex.ts
  // This function is kept for compatibility with existing code
  console.log('[Database] WatermelonDB initialized');
  return database;
}

export function getDatabase() {
  return database;
}

export { cleanupDummyRecords, resetDatabase };

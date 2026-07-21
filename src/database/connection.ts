// STUB FILE - Legacy connection for non-migrated screens
// This file provides compatibility for screens still using the old repository system
// Migrated screens should use watermelonIndex.ts directly

import database from './watermelonIndex';

export async function initDatabase() {
  console.log('[Connection] Legacy initDatabase called - using WatermelonDB');
  return database;
}

export function getDatabase() {
  return database;
}

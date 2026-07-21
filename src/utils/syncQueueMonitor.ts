import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

const SYNC_QUEUE_THRESHOLD = 50; // Seuil d'alerte

export async function getSyncQueueSize(): Promise<number> {
  const tables = ['animals', 'evenements', 'transactions', 'naissances'];
  let totalPending = 0;
  
  for (const table of tables) {
    try {
      const pending = await database.get(table)
        .query(Q.where('_status', Q.oneOf(['created', 'updated', 'deleted'])))
        .fetch();
      totalPending += pending.length;
    } catch (error) {
      console.error(`[SyncQueueMonitor] Error checking table ${table}:`, error);
    }
  }
  
  return totalPending;
}

export async function getSyncQueueDetails(): Promise<{ table: string; count: number }[]> {
  const tables = ['animals', 'evenements', 'transactions', 'naissances'];
  const details: { table: string; count: number }[] = [];
  
  for (const table of tables) {
    try {
      const pending = await database.get(table)
        .query(Q.where('_status', Q.oneOf(['created', 'updated', 'deleted'])))
        .fetch();
      details.push({ table, count: pending.length });
    } catch (error) {
      console.error(`[SyncQueueMonitor] Error checking table ${table}:`, error);
      details.push({ table, count: 0 });
    }
  }
  
  return details;
}

export async function checkSyncQueueHealth(): Promise<{ healthy: boolean; size: number; message: string; details: { table: string; count: number }[] }> {
  const size = await getSyncQueueSize();
  const details = await getSyncQueueDetails();
  const healthy = size < SYNC_QUEUE_THRESHOLD;
  
  return {
    healthy,
    size,
    details,
    message: healthy 
      ? `Sync queue healthy: ${size} pending records`
      : `⚠️ Sync queue large: ${size} pending records (threshold: ${SYNC_QUEUE_THRESHOLD})`
  };
}

export function startSyncQueueMonitoring(intervalMs: number = 60000): () => void {
  console.log('[SyncQueueMonitor] Starting monitoring with interval:', intervalMs);
  
  const intervalId = setInterval(async () => {
    try {
      const health = await checkSyncQueueHealth();
      
      if (!health.healthy) {
        console.warn('[SyncQueueMonitor]', health.message);
        console.warn('[SyncQueueMonitor] Details:', health.details);
        // TODO: Afficher une alerte à l'utilisateur via un système de notification
        // Pour l'instant, on log seulement
      } else {
        console.log('[SyncQueueMonitor]', health.message);
      }
    } catch (error) {
      console.error('[SyncQueueMonitor] Error checking sync queue health:', error);
    }
  }, intervalMs);
  
  // Retourne une fonction pour arrêter le monitoring
  return () => {
    clearInterval(intervalId);
    console.log('[SyncQueueMonitor] Stopped monitoring');
  };
}

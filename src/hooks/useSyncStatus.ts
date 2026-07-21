import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  isLoading: boolean;
}

/**
 * Hook to count unsynchronized records in the local database.
 * Records with sync_status !== 'synced' are considered pending sync.
 * This uses the business-level sync_status field instead of WatermelonDB's internal _status.
 */
export function useSyncStatus(farmId: string): SyncStatus {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!farmId) {
      setPendingCount(0);
      setFailedCount(0);
      setIsLoading(false);
      return;
    }

    const loadPendingCount = async () => {
      try {
        setIsLoading(true);
        
        // Tables to check for unsynced records
        const tables = ['animals', 'evenements', 'transactions', 'naissances', 'notifications'];
        let totalPending = 0;
        let totalFailed = 0;

        for (const tableName of tables) {
          try {
            // Query records that are not synced using business-level sync_status field
            // sync_status can be: 'synced', 'pending', 'conflict', 'failed'
            const collection = database.get(tableName);
            
            // Count pending and conflict records
            const pendingRecords = await collection
              .query(Q.where('sync_status', Q.oneOf(['pending', 'conflict'])))
              .fetch();
            totalPending += pendingRecords.length;
            
            // Count failed records
            const failedRecords = await collection
              .query(Q.where('sync_status', 'failed'))
              .fetch();
            totalFailed += failedRecords.length;
          } catch (error) {
            // Table might not have sync_status column yet (migration not applied), skip it
            console.warn(`[useSyncStatus] Error checking table ${tableName}:`, error);
          }
        }

        setPendingCount(totalPending);
        setFailedCount(totalFailed);
      } catch (error) {
        console.error('[useSyncStatus] Error loading pending count:', error);
        setPendingCount(0);
        setFailedCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingCount();

    // Refresh count every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);

    return () => clearInterval(interval);
  }, [farmId]);

  return { pendingCount, failedCount, isLoading };
}

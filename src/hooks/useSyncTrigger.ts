import { useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { fullSync } from '../sync/syncService';
import { farmStorage } from '../storage/farmStorage';
import { getDatabase } from '../database/connection';

const NETWORK_DELAY_MS = 2000; // 2 seconds delay after network restoration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

export const useSyncTrigger = () => {
  const isConnected = useNetworkStatus();
  const previousConnectionRef = useRef<boolean | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);

  const hasPendingItems = async (): Promise<boolean> => {
    try {
      const db = await getDatabase();
      const result = await db.execute(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending' OR status = 'failed'`
      );
      const count = result?.rows?.[0]?.count || 0;
      return count > 0;
    } catch (error) {
      console.error('[useSyncTrigger] Error checking pending items:', error);
      return false;
    }
  };

  useEffect(() => {
    // Skip first render (no previous state to compare)
    if (previousConnectionRef.current === null) {
      previousConnectionRef.current = isConnected;
      return;
    }

    // Detect transition from offline to online
    if (!previousConnectionRef.current && isConnected) {
      console.log('[useSyncTrigger] Network restored, checking for pending items...');

      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Reset retry count on new network restoration
      retryCountRef.current = 0;

      // Schedule sync with delay if there are pending items
      syncTimeoutRef.current = setTimeout(async () => {
        const hasItems = await hasPendingItems();
        if (hasItems) {
          console.log('[useSyncTrigger] Pending items found, starting sync');
          const farm = await farmStorage.getActiveFarm();
          if (farm) {
            await attemptSyncWithRetry(farm.id);
          } else {
            console.warn('[useSyncTrigger] No active farm, skipping sync');
          }
        } else {
          console.log('[useSyncTrigger] No pending items, skipping sync');
        }
      }, NETWORK_DELAY_MS);
    }

    // Update previous state
    previousConnectionRef.current = isConnected;

    // Cleanup on unmount
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isConnected]);

  const attemptSyncWithRetry = async (farmId: string) => {
    try {
      console.log(`[useSyncTrigger] Attempting sync (retry ${retryCountRef.current + 1}/${MAX_RETRIES})`);
      await fullSync(farmId);
      console.log('[useSyncTrigger] Sync completed successfully');
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error: any) {
      console.error('[useSyncTrigger] Sync failed:', error);

      // Check if error is network-related
      const isNetworkError = error.message?.includes('connexion') ||
                             error.message?.includes('network') ||
                             error.message?.includes('Network');

      if (isNetworkError && retryCountRef.current < MAX_RETRIES - 1) {
        retryCountRef.current++;
        console.log(`[useSyncTrigger] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        setTimeout(() => {
          attemptSyncWithRetry(farmId);
        }, RETRY_DELAY_MS);
      } else {
        console.error('[useSyncTrigger] Max retries reached or non-network error, giving up');
        retryCountRef.current = 0;
      }
    }
  };
};

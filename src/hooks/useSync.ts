import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncWatermelon, SyncResult } from '../sync/watermelonSync';

interface UseSyncOptions {
  farmId: string;
  intervalMs?: number;
  autoSync?: boolean;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastError: string | null;
  isOnline: boolean;
}

// Global singleton to prevent concurrent syncs across multiple hook instances
let globalSyncInProgress = false;
let globalSyncPromise: Promise<SyncResult> | null = null;
let syncQueue: Array<() => void> = [];

export function useSync({ farmId, intervalMs = 60000, autoSync = true }: UseSyncOptions) {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncedAt: null,
    lastError: null,
    isOnline: true,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performSync = useCallback(async () => {
    // If sync is already in progress, queue this request
    if (globalSyncInProgress) {
      console.log('[useSync] Sync already in progress, queuing request');
      return new Promise((resolve) => {
        syncQueue.push(() => {
          performSync().then(resolve);
        });
      });
    }

    globalSyncInProgress = true;
    setSyncState(prev => ({ ...prev, isSyncing: true, lastError: null }));

    try {
      const syncPromise = syncWatermelon(farmId);
      globalSyncPromise = syncPromise;
      
      const result: SyncResult = await syncPromise;
      
      if (result.success) {
        setSyncState({
          isSyncing: false,
          lastSyncedAt: new Date(),
          lastError: null,
          isOnline: true,
        });
        console.log('[useSync] Sync completed successfully');
      } else {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastError: result.error || 'Unknown sync error',
        }));
        console.error('[useSync] Sync failed:', result.error);
      }
      
      // Process queued sync requests
      if (syncQueue.length > 0) {
        console.log('[useSync] Processing queued sync requests:', syncQueue.length);
        const nextSync = syncQueue.shift();
        globalSyncInProgress = false;
        globalSyncPromise = null;
        if (nextSync) nextSync();
        return result;
      }
      
      return result;
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastError: error.message || 'Sync error',
      }));
      console.error('[useSync] Sync error:', error);
      
      // Process queued sync requests even on error
      if (syncQueue.length > 0) {
        console.log('[useSync] Processing queued sync requests after error:', syncQueue.length);
        const nextSync = syncQueue.shift();
        globalSyncInProgress = false;
        globalSyncPromise = null;
        if (nextSync) nextSync();
      }
      
      return { success: false, error: error.message };
    } finally {
      if (syncQueue.length === 0) {
        globalSyncInProgress = false;
        globalSyncPromise = null;
      }
    }
  }, [farmId]);

  const manualSync = useCallback(() => {
    console.log('[useSync] Manual sync triggered');
    performSync();
  }, [performSync]);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      console.log('[useSync] Network state changed:', isOnline);
      
      setSyncState(prev => ({ ...prev, isOnline: isOnline || false }));
      
      // Auto-sync when coming back online
      if (isOnline && autoSync && !globalSyncInProgress) {
        performSync();
      }
      
    });

    // Set up auto-sync interval
    if (autoSync) {
      intervalRef.current = setInterval(() => {
        // Check current network state instead of relying on closure
        NetInfo.fetch().then(state => {
          const isOnline = state.isConnected && state.isInternetReachable;
          if (isOnline && !globalSyncInProgress) {
            performSync();
          }
        });
      }, intervalMs);
    }
    
    // Initial sync - check current network state
    if (autoSync) {
      NetInfo.fetch().then(state => {
        const isOnline = state.isConnected && state.isInternetReachable;
        if (isOnline && !globalSyncInProgress) {
          performSync();
        }
      });
    }
    
    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSync, intervalMs, performSync]);

  return {
    ...syncState,
    manualSync,
  };
}

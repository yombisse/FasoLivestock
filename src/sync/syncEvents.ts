/**
 * Sync Event Bus
 * Simple pub-sub mechanism for sync-related events
 * Allows screens to react to sync completion regardless of who triggered it
 */

type SyncEventType = 'sync:initial:completed' | 'sync:full:completed' | 'sync:pull:completed';

class SyncEventBus {
  private listeners: Map<SyncEventType, Set<() => void>> = new Map();

  subscribe(event: SyncEventType, callback: () => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: SyncEventType): void {
    this.listeners.get(event)?.forEach(cb => cb());
  }
}

export const syncEvents = new SyncEventBus();

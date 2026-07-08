/**
 * Sync Dependency Sorting Utilities
 * Handles ordering of sync queue items to satisfy foreign key constraints
 */

export interface SyncQueueItem {
  id: number;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  data: string;
  status: 'pending' | 'synced' | 'failed';
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

/**
 * Table priority for sync ordering
 * Lower numbers = sync first (no dependencies)
 * Higher numbers = sync later (depend on lower-priority tables)
 */
export const TABLE_PRIORITY: Record<string, number> = {
  // Priority 0: Base entities (no dependencies)
  animals: 0,
  especes: 1,
  categories: 1,
  type_evenements: 1,
  lots: 1,
  // Priority 2: Events (depend on animals and reference tables)
  evenements: 2,
  // Priority 3: Transactions (depend on events via evenement_id)
  transactions: 3,
  // Priority 4: Other dependent entities
  naissances: 2,
  notifications: 3,
};

/**
 * Sort pending sync queue items by dependency order
 * 
 * Rules:
 * 1. Items are sorted by TABLE_PRIORITY (lower priority = sync first)
 * 2. Within same priority, items are sorted chronologically by created_at
 * 3. Unknown tables default to priority 2 (same as events)
 * 
 * This ensures foreign key constraints are satisfied:
 * - Animals sync before events that reference them
 * - Events sync before transactions that reference them
 * - Reference tables (categories, types) sync before dependent tables
 * 
 * @param items - Array of sync queue items to sort
 * @returns Sorted array of sync queue items
 */
export function sortPendingItemsByDependency(items: SyncQueueItem[]): SyncQueueItem[] {
  return [...items].sort((a, b) => {
    const priorityA = TABLE_PRIORITY[a.table_name] ?? 2;
    const priorityB = TABLE_PRIORITY[b.table_name] ?? 2;
    
    // Sort by priority first
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // Within same priority, sort chronologically
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

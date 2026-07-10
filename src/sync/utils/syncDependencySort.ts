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
  retry_count?: number;
  last_retry_at?: string;
  sync_request_id?: string;
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
 * 1. Items are grouped by dependencies (animal_id, evenement_id, mother_id, farm_id)
 * 2. Within each dependency group, items are sorted by TABLE_PRIORITY
 * 3. Within same priority, items are sorted chronologically by created_at
 * 4. Unknown tables default to priority 2 (same as events)
 *
 * This ensures foreign key constraints are satisfied:
 * - Animals sync before events that reference them
 * - Events sync before transactions that reference them
 * - Reference tables (categories, types) sync before dependent tables
 * - Dependent items stay in the same chunk as their dependencies
 *
 * @param items - Array of sync queue items to sort
 * @returns Sorted array of sync queue items
 */
export function sortPendingItemsByDependency(items: SyncQueueItem[]): SyncQueueItem[] {
  // Grouper les items par dépendances (animal_id, evenement_id, etc.)
  const dependencyGroups = new Map<string, SyncQueueItem[]>();

  for (const item of items) {
    try {
      const data = JSON.parse(item.data);

      // Déterminer la clé de dépendance principale
      // Pour les événements et transactions, grouper par animal_id pour s'assurer
      // que l'animal et ses dépendants sont dans le même chunk
      let dependencyKey: string;
      if (item.table_name === 'animals') {
        dependencyKey = data.id || 'independent';
      } else if (item.table_name === 'evenements' || item.table_name === 'transactions') {
        dependencyKey = data.animal_id || data.id || 'independent';
      } else {
        dependencyKey = data.animal_id ||
                        data.evenement_id ||
                        data.mother_id ||
                        data.farm_id ||
                        'independent';
      }

      if (!dependencyGroups.has(dependencyKey)) {
        dependencyGroups.set(dependencyKey, []);
      }
      dependencyGroups.get(dependencyKey)!.push(item);
    } catch (error) {
      console.error('[SyncDependencySort] Failed to parse item data:', error);
      // Items avec data invalide vont dans le groupe independent
      if (!dependencyGroups.has('invalid')) {
        dependencyGroups.set('invalid', []);
      }
      dependencyGroups.get('invalid')!.push(item);
    }
  }

  // Trier chaque groupe par priorité de table puis chronologiquement
  const sortedItems: SyncQueueItem[] = [];
  for (const [key, group] of dependencyGroups) {
    console.log(`[SyncDependencySort] Group key: ${key}, items: ${group.length}`);
    for (const item of group) {
      const data = JSON.parse(item.data);
      console.log(`[SyncDependencySort]   - ${item.table_name}/${item.record_id}, animal_id=${data.animal_id}, id=${data.id}`);
    }

    // Trier chaque groupe par priorité de table puis chronologiquement
    const sortedGroup = group.sort((a, b) => {
      const priorityA = TABLE_PRIORITY[a.table_name] ?? 2;
      const priorityB = TABLE_PRIORITY[b.table_name] ?? 2;

      if (priorityA !== priorityB) return priorityA - priorityB;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    sortedItems.push(...sortedGroup);
  }

  console.log(`[SyncDependencySort] Grouped ${items.length} items into ${dependencyGroups.size} dependency groups`);
  return sortedItems;
}

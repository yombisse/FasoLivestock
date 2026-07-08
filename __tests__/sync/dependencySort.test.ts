/**
 * Tests for Sync Dependency Sorting
 * Phase 1: Tests for TABLE_PRIORITY and sortPendingItemsByDependency
 * 
 * These tests ensure that sync queue items are ordered correctly
 * to satisfy foreign key constraints and prevent FK_MISSING errors.
 */

import { sortPendingItemsByDependency, TABLE_PRIORITY, SyncQueueItem } from '../../src/sync/utils/syncDependencySort';

describe('TABLE_PRIORITY', () => {
  it('should have animals at priority 0 (lowest)', () => {
    expect(TABLE_PRIORITY.animals).toBe(0);
  });

  it('should have reference tables at priority 1', () => {
    expect(TABLE_PRIORITY.especes).toBe(1);
    expect(TABLE_PRIORITY.categories).toBe(1);
    expect(TABLE_PRIORITY.type_evenements).toBe(1);
    expect(TABLE_PRIORITY.lots).toBe(1);
  });

  it('should have evenements at priority 2', () => {
    expect(TABLE_PRIORITY.evenements).toBe(2);
  });

  it('should have transactions at priority 3 (highest)', () => {
    expect(TABLE_PRIORITY.transactions).toBe(3);
  });

  it('should have naissances at priority 2 (same as evenements)', () => {
    expect(TABLE_PRIORITY.naissances).toBe(2);
  });

  it('should have notifications at priority 3 (same as transactions)', () => {
    expect(TABLE_PRIORITY.notifications).toBe(3);
  });
});

describe('sortPendingItemsByDependency', () => {
  const createMockItem = (table: string, createdAt: string, id: number = 1): SyncQueueItem => ({
    id,
    table_name: table,
    record_id: `record-${id}`,
    action: 'create',
    data: '{}',
    status: 'pending',
    created_at: createdAt,
  });

  it('should sort animals before evenements', () => {
    const items = [
      createMockItem('evenements', '2024-01-02T10:00:00Z', 1),
      createMockItem('animals', '2024-01-01T10:00:00Z', 2),
    ];

    const sorted = sortPendingItemsByDependency(items);

    expect(sorted[0].table_name).toBe('animals');
    expect(sorted[1].table_name).toBe('evenements');
  });

  it('should sort evenements before transactions', () => {
    const items = [
      createMockItem('transactions', '2024-01-02T10:00:00Z', 1),
      createMockItem('evenements', '2024-01-01T10:00:00Z', 2),
    ];

    const sorted = sortPendingItemsByDependency(items);

    expect(sorted[0].table_name).toBe('evenements');
    expect(sorted[1].table_name).toBe('transactions');
  });

  it('should sort animals before transactions (transitive dependency)', () => {
    const items = [
      createMockItem('transactions', '2024-01-03T10:00:00Z', 1),
      createMockItem('animals', '2024-01-01T10:00:00Z', 2),
    ];

    const sorted = sortPendingItemsByDependency(items);

    expect(sorted[0].table_name).toBe('animals');
    expect(sorted[1].table_name).toBe('transactions');
  });

  it('should sort reference tables before evenements', () => {
    const items = [
      createMockItem('evenements', '2024-01-02T10:00:00Z', 1),
      createMockItem('categories', '2024-01-01T10:00:00Z', 2),
      createMockItem('type_evenements', '2024-01-01T11:00:00Z', 3),
    ];

    const sorted = sortPendingItemsByDependency(items);

    expect(sorted[0].table_name).toBe('categories');
    expect(sorted[1].table_name).toBe('type_evenements');
    expect(sorted[2].table_name).toBe('evenements');
  });

  it('should sort items chronologically within same priority', () => {
    const items = [
      createMockItem('categories', '2024-01-03T10:00:00Z', 1),
      createMockItem('categories', '2024-01-01T10:00:00Z', 2),
      createMockItem('categories', '2024-01-02T10:00:00Z', 3),
    ];

    const sorted = sortPendingItemsByDependency(items);

    expect(sorted[0].created_at).toBe('2024-01-01T10:00:00Z');
    expect(sorted[1].created_at).toBe('2024-01-02T10:00:00Z');
    expect(sorted[2].created_at).toBe('2024-01-03T10:00:00Z');
  });

  it('should handle complex scenario: animals + evenements + transactions', () => {
    const items = [
      createMockItem('transactions', '2024-01-04T10:00:00Z', 1),
      createMockItem('animals', '2024-01-01T10:00:00Z', 2),
      createMockItem('evenements', '2024-01-03T10:00:00Z', 3),
      createMockItem('categories', '2024-01-02T10:00:00Z', 4),
    ];

    const sorted = sortPendingItemsByDependency(items);

    // Expected order: animals (0) → categories (1) → evenements (2) → transactions (3)
    expect(sorted[0].table_name).toBe('animals');
    expect(sorted[1].table_name).toBe('categories');
    expect(sorted[2].table_name).toBe('evenements');
    expect(sorted[3].table_name).toBe('transactions');
  });

  it('should handle unknown tables with default priority 2', () => {
    const items = [
      createMockItem('unknown_table', '2024-01-02T10:00:00Z', 1),
      createMockItem('animals', '2024-01-01T10:00:00Z', 2),
    ];

    const sorted = sortPendingItemsByDependency(items);

    // animals (0) should come before unknown_table (default 2)
    expect(sorted[0].table_name).toBe('animals');
    expect(sorted[1].table_name).toBe('unknown_table');
  });

  it('should not mutate the original array', () => {
    const items = [
      createMockItem('transactions', '2024-01-02T10:00:00Z', 1),
      createMockItem('animals', '2024-01-01T10:00:00Z', 2),
    ];

    const originalOrder = items.map(item => item.table_name);
    sortPendingItemsByDependency(items);

    expect(items.map(item => item.table_name)).toEqual(originalOrder);
  });

  it('should handle empty array', () => {
    const sorted = sortPendingItemsByDependency([]);
    expect(sorted).toEqual([]);
  });

  it('should handle single item', () => {
    const items = [createMockItem('animals', '2024-01-01T10:00:00Z', 1)];
    const sorted = sortPendingItemsByDependency(items);
    
    expect(sorted).toHaveLength(1);
    expect(sorted[0].table_name).toBe('animals');
  });

  it('should maintain priority order over chronological order', () => {
    const items = [
      createMockItem('transactions', '2024-01-01T10:00:00Z', 1), // Priority 3, earliest date
      createMockItem('animals', '2024-01-03T10:00:00Z', 2),     // Priority 0, latest date
    ];

    const sorted = sortPendingItemsByDependency(items);

    // Priority should override date
    expect(sorted[0].table_name).toBe('animals');
    expect(sorted[1].table_name).toBe('transactions');
  });
});

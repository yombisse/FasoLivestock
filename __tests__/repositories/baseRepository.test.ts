/**
 * Tests for Base Repository
 * Phase 4: Tests for repositories (baseRepository)
 * 
 * These tests ensure that base CRUD operations work correctly
 * and sync_queue entries are created properly.
 */

// Mock the database connection
jest.mock('../../src/database/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('Base Repository', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      execute: jest.fn(),
    };
    const { getDatabase } = require('../../src/database/connection');
    getDatabase.mockResolvedValue(mockDb);
  });

  describe('createLocalRecord', () => {
    it('should insert record and create sync_queue entry', async () => {
      const { createLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      mockDb.execute
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockResolvedValueOnce({}) // Get version
        .mockResolvedValueOnce({}) // INSERT record
        .mockResolvedValueOnce({}) // INSERT sync_queue
        .mockResolvedValueOnce({}); // COMMIT

      const data = {
        id: 'test-123',
        farm_id: 'farm-123',
        nom: 'Test Animal',
      };

      await createLocalRecord('animals', data);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO animals'),
        expect.any(Array)
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining([expect.any(String), 'test-123', 'create'])
      );
    });

    it('should handle transaction rollback on error', async () => {
      const { createLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      mockDb.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Error

      const data = {
        id: 'test-123',
        farm_id: 'farm-123',
        nom: 'Test Animal',
      };

      await expect(createLocalRecord('animals', data)).rejects.toThrow();
    });
  });

  describe('softDeleteLocalRecord', () => {
    it('should set deleted_at and create sync_queue entry', async () => {
      const { softDeleteLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      mockDb.execute
        .mockResolvedValueOnce({ rows: [{ version: 1 }] }) // Get version
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE with deleted_at
        .mockResolvedValueOnce({ rows: [{ id: 'test-123', nom: 'Test' }] }) // Get full record
        .mockResolvedValueOnce({}) // INSERT sync_queue with delete action
        .mockResolvedValueOnce({}); // COMMIT

      await softDeleteLocalRecord('animals', 'test-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE animals'),
        expect.arrayContaining([expect.any(String), expect.any(Number), expect.any(String), 'test-123'])
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining([expect.any(String), 'test-123', 'delete'])
      );
    });

    it('should increment version on soft delete', async () => {
      const { softDeleteLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      mockDb.execute
        .mockResolvedValueOnce({ rows: [{ version: 1 }] }) // Current version 1
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [{ id: 'test-123' }] })
        .mockResolvedValueOnce({}) // INSERT sync_queue
        .mockResolvedValueOnce({}); // COMMIT

      await softDeleteLocalRecord('animals', 'test-123');

      // Version should be incremented to 2
      const updateCall = mockDb.execute.mock.calls.find((call: any[]) => 
        call[0].includes('UPDATE animals')
      );
      // The version is at index 1 in the params array
      expect(updateCall[1]).toBeDefined();
    });
  });

  describe('updateLocalRecord', () => {
    it('should update record and create sync_queue entry', async () => {
      const { updateLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      mockDb.execute
        .mockResolvedValueOnce({ rows: [{ version: 1 }] }) // Get version
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE record
        .mockResolvedValueOnce({ rows: [{ id: 'test-123', nom: 'Updated' }] }) // Get full record
        .mockResolvedValueOnce({}) // INSERT sync_queue with update action
        .mockResolvedValueOnce({}); // COMMIT

      const updateData = { nom: 'Updated Name' };

      await updateLocalRecord('animals', 'test-123', updateData);

      // Verify that UPDATE was called
      const updateCall = mockDb.execute.mock.calls.find((call: any[]) => 
        call[0].includes('UPDATE animals')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain('Updated Name');
    });
  });
});

/**
 * Tests for Transaction Repository
 * Phase 2: Tests for data validation (categorie_id, FK)
 * 
 * These tests ensure that transactions are created with valid data
 * to prevent NOT NULL constraint violations during sync.
 */

import { createTransaction } from '../../src/database/repositories/transactionRepository';

// Mock the database connection
jest.mock('../../src/database/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('Transaction Repository - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should reject if categorie_id is null', async () => {
      const { getDatabase } = require('../../src/database/connection');
      const mockDb = {
        execute: jest.fn(),
      };
      getDatabase.mockResolvedValue(mockDb);

      const transactionData = {
        farm_id: 'farm-123',
        type_transaction: 'SORTIE',
        montant: 1000,
        date_transaction: '2024-01-01',
        categorie_id: null, // Invalid: null categorie_id
      };

      await expect(createTransaction(transactionData as any)).rejects.toThrow();
    });

    it('should reject if categorie_id is undefined', async () => {
      const { getDatabase } = require('../../src/database/connection');
      const mockDb = {
        execute: jest.fn(),
      };
      getDatabase.mockResolvedValue(mockDb);

      const transactionData = {
        farm_id: 'farm-123',
        type_transaction: 'SORTIE',
        montant: 1000,
        date_transaction: '2024-01-01',
        // categorie_id missing
      };

      await expect(createTransaction(transactionData as any)).rejects.toThrow();
    });

    it('should reject if categorie_id is not a valid UUID', async () => {
      const { getDatabase } = require('../../src/database/connection');
      const mockDb = {
        execute: jest.fn(),
      };
      getDatabase.mockResolvedValue(mockDb);

      const transactionData = {
        farm_id: 'farm-123',
        type_transaction: 'SORTIE',
        montant: 1000,
        date_transaction: '2024-01-01',
        categorie_id: 'ACHAT_ANIMAL', // Invalid: not a UUID
      };

      await expect(createTransaction(transactionData as any)).rejects.toThrow();
    });

    it('should reject if categorie_id is VENTE_ANIMAL (legacy invalid value)', async () => {
      const { getDatabase } = require('../../src/database/connection');
      const mockDb = {
        execute: jest.fn(),
      };
      getDatabase.mockResolvedValue(mockDb);

      const transactionData = {
        farm_id: 'farm-123',
        type_transaction: 'ENTREE',
        montant: 1000,
        date_transaction: '2024-01-01',
        categorie_id: 'VENTE_ANIMAL', // Invalid: legacy value
      };

      await expect(createTransaction(transactionData as any)).rejects.toThrow();
    });

    it('should accept valid UUID categorie_id', async () => {
      const { getDatabase } = require('../../src/database/connection');
      const mockDb = {
        execute: jest.fn().mockResolvedValue({ rows: [{ id: 'trx-123' }] }),
      };
      getDatabase.mockResolvedValue(mockDb);

      const transactionData = {
        farm_id: 'farm-123',
        type_transaction: 'SORTIE',
        montant: 1000,
        date_transaction: '2024-01-01',
        categorie_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      };

      const result = await createTransaction(transactionData as any);
      expect(result).toBeDefined();
    });

    it('should accept valid UUID v4 format', async () => {
      const { getDatabase } = require('../../src/database/connection');
      const mockDb = {
        execute: jest.fn().mockResolvedValue({ rows: [{ id: 'trx-123' }] }),
      };
      getDatabase.mockResolvedValue(mockDb);

      const transactionData = {
        farm_id: 'farm-123',
        type_transaction: 'SORTIE',
        montant: 1000,
        date_transaction: '2024-01-01',
        categorie_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID v4
      };

      const result = await createTransaction(transactionData as any);
      expect(result).toBeDefined();
    });
  });
});

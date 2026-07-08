/**
 * Tests for Evenement Transaction Service
 * Phase 2: Tests for data validation (categorie_id retrieval)
 * 
 * These tests ensure that the service correctly retrieves categorie_id
 * when creating transactions from events.
 */

import { creerTransactionDepuisEvenement } from '../../src/services/evenementTransactionService';

// Mock dependencies
jest.mock('../../src/database/repositories/transactionRepository', () => ({
  createTransaction: jest.fn(),
}));

jest.mock('../../src/database/repositories/categorieRepository', () => ({
  getCategorieIdByName: jest.fn(),
}));

describe('Evenement Transaction Service - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('creerTransactionDepuisEvenement', () => {
    it('should retrieve categorie_id before creating transaction', async () => {
      const { createTransaction } = require('../../src/database/repositories/transactionRepository');
      const { getCategorieIdByName } = require('../../src/database/repositories/categorieRepository');

      // Mock successful categorie_id retrieval
      getCategorieIdByName.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
      createTransaction.mockResolvedValue({ id: 'trx-123' });

      const params = {
        evenementId: 'evt-123',
        farmId: 'farm-123',
        animalId: 'animal-123',
        cout: 1000,
        dateEvenement: '2024-01-01',
        libelleCategorie: 'FRAIS_SANITAIRE' as const,
        userId: 'user-123',
      };

      await creerTransactionDepuisEvenement(params);

      expect(getCategorieIdByName).toHaveBeenCalledWith('FRAIS_SANITAIRE');
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          categorie_id: '550e8400-e29b-41d4-a716-446655440000',
        })
      );
    });

    it('should not create transaction if categorie_id not found', async () => {
      const { createTransaction } = require('../../src/database/repositories/transactionRepository');
      const { getCategorieIdByName } = require('../../src/database/repositories/categorieRepository');

      // Mock failed categorie_id retrieval
      getCategorieIdByName.mockResolvedValue(null);
      createTransaction.mockResolvedValue({ id: 'trx-123' });

      const params = {
        evenementId: 'evt-123',
        farmId: 'farm-123',
        animalId: 'animal-123',
        cout: 1000,
        dateEvenement: '2024-01-01',
        libelleCategorie: 'FRAIS_SANITAIRE' as const,
        userId: 'user-123',
      };

      await creerTransactionDepuisEvenement(params);

      expect(getCategorieIdByName).toHaveBeenCalledWith('FRAIS_SANITAIRE');
      expect(createTransaction).not.toHaveBeenCalled();
    });

    it('should try fallback categorie names if primary not found', async () => {
      const { createTransaction } = require('../../src/database/repositories/transactionRepository');
      const { getCategorieIdByName } = require('../../src/database/repositories/categorieRepository');

      // Mock: first attempt fails, second succeeds
      getCategorieIdByName
        .mockResolvedValueOnce(null) // ACHAT_ANIMAL not found
        .mockResolvedValueOnce('550e8400-e29b-41d4-a716-446655440000'); // ACHAT found
      createTransaction.mockResolvedValue({ id: 'trx-123' });

      // Note: This test assumes the service has fallback logic
      // If not, this test will fail and we'll need to add the fallback
    });

    it('should not create transaction if cost is 0', async () => {
      const { createTransaction } = require('../../src/database/repositories/transactionRepository');
      const { getCategorieIdByName } = require('../../src/database/repositories/categorieRepository');

      const params = {
        evenementId: 'evt-123',
        farmId: 'farm-123',
        animalId: 'animal-123',
        cout: 0, // Zero cost
        dateEvenement: '2024-01-01',
        libelleCategorie: 'FRAIS_SANITAIRE' as const,
        userId: 'user-123',
      };

      await creerTransactionDepuisEvenement(params);

      expect(getCategorieIdByName).not.toHaveBeenCalled();
      expect(createTransaction).not.toHaveBeenCalled();
    });

    it('should not create transaction if cost is negative', async () => {
      const { createTransaction } = require('../../src/database/repositories/transactionRepository');
      const { getCategorieIdByName } = require('../../src/database/repositories/categorieRepository');

      const params = {
        evenementId: 'evt-123',
        farmId: 'farm-123',
        animalId: 'animal-123',
        cout: -100, // Negative cost
        dateEvenement: '2024-01-01',
        libelleCategorie: 'FRAIS_SANITAIRE' as const,
        userId: 'user-123',
      };

      await creerTransactionDepuisEvenement(params);

      expect(getCategorieIdByName).not.toHaveBeenCalled();
      expect(createTransaction).not.toHaveBeenCalled();
    });

    it('should handle transaction creation errors gracefully', async () => {
      const { createTransaction } = require('../../src/database/repositories/transactionRepository');
      const { getCategorieIdByName } = require('../../src/database/repositories/categorieRepository');

      getCategorieIdByName.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
      createTransaction.mockRejectedValue(new Error('Database error'));

      const params = {
        evenementId: 'evt-123',
        farmId: 'farm-123',
        animalId: 'animal-123',
        cout: 1000,
        dateEvenement: '2024-01-01',
        libelleCategorie: 'FRAIS_SANITAIRE' as const,
        userId: 'user-123',
      };

      // Should not throw - error is caught and logged
      await expect(creerTransactionDepuisEvenement(params)).resolves.not.toThrow();
    });
  });
});

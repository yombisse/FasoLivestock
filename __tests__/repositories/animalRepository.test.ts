/**
 * Tests for Animal Repository
 * Phase 4: Tests for repositories (animalRepository)
 * 
 * These tests ensure that animals are created correctly
 * with optional fields handled properly.
 */

// Mock the database connection and baseRepository
jest.mock('../../src/database/connection', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../../src/database/repositories/baseRepository', () => ({
  createLocalRecord: jest.fn(),
  updateLocalRecord: jest.fn(),
  softDeleteLocalRecord: jest.fn(),
}));

describe('Animal Repository', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      execute: jest.fn(),
    };
    const { getDatabase } = require('../../src/database/connection');
    getDatabase.mockResolvedValue(mockDb);
  });

  describe('createAnimal', () => {
    it('should accept animal with optional nom', async () => {
      const { createAnimal } = require('../../src/database/repositories/animalRepository');
      const { createLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      createLocalRecord.mockResolvedValue({ id: 'animal-123' });

      const animalData = {
        farm_id: 'farm-123',
        nom: undefined, // Optional field
        numero_identification: 'ANIMAL-001',
        espece_id: 'espece-123',
        sexe: 'male' as const,
        statut: 'ACTIF',
      };

      const result = await createAnimal(animalData);

      expect(result).toBeDefined();
      expect(createLocalRecord).toHaveBeenCalledWith('animals', animalData);
    });

    it('should accept animal with null race', async () => {
      const { createAnimal } = require('../../src/database/repositories/animalRepository');
      const { createLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      createLocalRecord.mockResolvedValue({ id: 'animal-123' });

      const animalData = {
        farm_id: 'farm-123',
        nom: 'Test Animal',
        numero_identification: 'ANIMAL-001',
        espece_id: 'espece-123',
        race: undefined, // Optional field
        sexe: 'male' as const,
        statut: 'ACTIF',
      };

      const result = await createAnimal(animalData);

      expect(result).toBeDefined();
      expect(createLocalRecord).toHaveBeenCalledWith('animals', animalData);
    });

    it('should accept animal with null poids', async () => {
      const { createAnimal } = require('../../src/database/repositories/animalRepository');
      const { createLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      createLocalRecord.mockResolvedValue({ id: 'animal-123' });

      const animalData = {
        farm_id: 'farm-123',
        nom: 'Test Animal',
        numero_identification: 'ANIMAL-001',
        espece_id: 'espece-123',
        sexe: 'male' as const,
        poids: undefined, // Optional field
        statut: 'ACTIF',
      };

      const result = await createAnimal(animalData);

      expect(result).toBeDefined();
      expect(createLocalRecord).toHaveBeenCalledWith('animals', animalData);
    });

    it('should accept animal with all optional fields', async () => {
      const { createAnimal } = require('../../src/database/repositories/animalRepository');
      const { createLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      createLocalRecord.mockResolvedValue({ id: 'animal-123' });

      const animalData = {
        farm_id: 'farm-123',
        nom: 'Test Animal',
        numero_identification: 'ANIMAL-001',
        espece_id: 'espece-123',
        race: 'Bos taurus',
        sexe: 'male' as const,
        poids: 500,
        statut: 'ACTIF',
      };

      const result = await createAnimal(animalData);

      expect(result).toBeDefined();
      expect(createLocalRecord).toHaveBeenCalledWith('animals', animalData);
    });
  });

  describe('deleteAnimal', () => {
    it('should call softDeleteLocalRecord', async () => {
      const { deleteAnimal } = require('../../src/database/repositories/animalRepository');
      const { softDeleteLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      softDeleteLocalRecord.mockResolvedValue(undefined);

      await deleteAnimal('animal-123');

      expect(softDeleteLocalRecord).toHaveBeenCalledWith('animals', 'animal-123');
    });
  });

  describe('updateAnimal', () => {
    it('should call updateLocalRecord', async () => {
      const { updateAnimal } = require('../../src/database/repositories/animalRepository');
      const { updateLocalRecord } = require('../../src/database/repositories/baseRepository');
      
      updateLocalRecord.mockResolvedValue({ id: 'animal-123' });

      const updateData = { nom: 'Updated Name' };

      await updateAnimal('animal-123', updateData);

      expect(updateLocalRecord).toHaveBeenCalledWith('animals', 'animal-123', updateData);
    });
  });
});

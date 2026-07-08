/**
 * Tests for Sante Evenements Repository
 * Phase 4: Tests for repositories (santeEvenementsRepository)
 * 
 * These tests ensure that health events are created correctly
 * with proper metadata serialization.
 */

// Mock the database connection
jest.mock('../../src/database/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('Sante Evenements Repository', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      execute: jest.fn(),
    };
    const { getDatabase } = require('../../src/database/connection');
    getDatabase.mockResolvedValue(mockDb);
  });

  describe('createEvenementSanitaire', () => {
    it('should serialize metadonnees to JSON string', async () => {
      const { createEvenementSanitaire } = require('../../src/database/repositories/santeEvenementsRepository');
      
      mockDb.execute.mockResolvedValue({ rows: [{ id: 'evt-123' }] });

      const metadata = {
        nom_vaccin: 'Rabies',
        dosage: '5ml',
        veterinaire: 'Dr. Smith',
      };

      const eventData = {
        farm_id: 'farm-123',
        type_evenement_id: 'type-123',
        animal_id: 'animal-123',
        date_evenement: '2024-01-01',
        metadonnees: JSON.stringify(metadata),
      };

      await createEvenementSanitaire(eventData as any);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evenements'),
        expect.arrayContaining([expect.any(String), JSON.stringify(metadata)])
      );
    });

    it('should handle null metadonnees', async () => {
      const { createEvenementSanitaire } = require('../../src/database/repositories/santeEvenementsRepository');
      
      mockDb.execute.mockResolvedValue({ rows: [{ id: 'evt-123' }] });

      const eventData = {
        farm_id: 'farm-123',
        type_evenement_id: 'type-123',
        animal_id: 'animal-123',
        date_evenement: '2024-01-01',
        metadonnees: null,
      };

      await createEvenementSanitaire(eventData as any);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evenements'),
        expect.arrayContaining([expect.any(String), null])
      );
    });

    it('should not include type field in INSERT', async () => {
      const { createEvenementSanitaire } = require('../../src/database/repositories/santeEvenementsRepository');
      
      mockDb.execute.mockResolvedValue({ rows: [{ id: 'evt-123' }] });

      const eventData = {
        farm_id: 'farm-123',
        type_evenement_id: 'type-123',
        animal_id: 'animal-123',
        date_evenement: '2024-01-01',
      };

      await createEvenementSanitaire(eventData as any);

      const insertCall = mockDb.execute.mock.calls.find((call: any[]) => 
        call[0].includes('INSERT INTO evenements')
      );
      
      // Verify that 'type' is not in the column list
      expect(insertCall[0]).not.toMatch(/,\s*type\s*,/i);
    });
  });
});

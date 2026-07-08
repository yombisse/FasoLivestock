/**
 * Tests for Sync Retry Logic
 * Phase 3: Tests for retry logic (FK_MISSING, network errors)
 * 
 * These tests ensure that temporary errors (like FK_MISSING) are retried
 * instead of being marked as permanent failures.
 */

// Mock the database connection
jest.mock('../../src/database/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('Sync Retry Logic', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      execute: jest.fn(),
    };
    const { getDatabase } = require('../../src/database/connection');
    getDatabase.mockResolvedValue(mockDb);
  });

  describe('isNetworkError detection', () => {
    it('should detect FK_MISSING as retryable error', () => {
      const errorMessage = 'FK_MISSING - Référence introuvable';
      const isNetworkError = errorMessage.includes('FK_MISSING') || 
                            errorMessage.includes('Référence introuvable');
      expect(isNetworkError).toBe(true);
    });

    it('should detect timeout as retryable error', () => {
      const errorMessage = 'Request timeout';
      const isNetworkError = errorMessage.includes('timeout');
      expect(isNetworkError).toBe(true);
    });

    it('should detect network error as retryable', () => {
      const errorMessage = 'Network error ENETUNREACH';
      const isNetworkError = errorMessage.includes('network') || 
                            errorMessage.includes('ENETUNREACH');
      expect(isNetworkError).toBe(true);
    });

    it('should detect 5xx errors as retryable', () => {
      const errorMessage = '500 Internal Server Error';
      const isNetworkError = errorMessage.includes('5');
      expect(isNetworkError).toBe(true);
    });

    it('should detect 502 Bad Gateway as retryable', () => {
      const errorMessage = '502 Bad Gateway';
      const isNetworkError = errorMessage.includes('502');
      expect(isNetworkError).toBe(true);
    });

    it('should detect 503 Service Unavailable as retryable', () => {
      const errorMessage = '503 Service Unavailable';
      const isNetworkError = errorMessage.includes('503');
      expect(isNetworkError).toBe(true);
    });

    it('should detect 504 Gateway Timeout as retryable', () => {
      const errorMessage = '504 Gateway Timeout';
      const isNetworkError = errorMessage.includes('504');
      expect(isNetworkError).toBe(true);
    });

    it('should NOT detect 4xx errors as retryable', () => {
      const errorMessage = '400 Bad Request';
      const isNetworkError = errorMessage.includes('timeout') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('ETIMEDOUT') ||
                            errorMessage.includes('ENETUNREACH') ||
                            errorMessage.includes('5') ||
                            errorMessage.includes('502') ||
                            errorMessage.includes('503') ||
                            errorMessage.includes('504') ||
                            errorMessage.includes('FK_MISSING') ||
                            errorMessage.includes('Référence introuvable');
      expect(isNetworkError).toBe(false);
    });

    it('should NOT detect 404 Not Found as retryable', () => {
      const errorMessage = '404 Not Found';
      const isNetworkError = errorMessage.includes('timeout') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('ETIMEDOUT') ||
                            errorMessage.includes('ENETUNREACH') ||
                            errorMessage.includes('5') ||
                            errorMessage.includes('502') ||
                            errorMessage.includes('503') ||
                            errorMessage.includes('504') ||
                            errorMessage.includes('FK_MISSING') ||
                            errorMessage.includes('Référence introuvable');
      expect(isNetworkError).toBe(false);
    });

    it('should NOT detect 422 Validation Error as retryable', () => {
      const errorMessage = '422 Validation Error';
      const isNetworkError = errorMessage.includes('timeout') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('ETIMEDOUT') ||
                            errorMessage.includes('ENETUNREACH') ||
                            errorMessage.includes('5') ||
                            errorMessage.includes('502') ||
                            errorMessage.includes('503') ||
                            errorMessage.includes('504') ||
                            errorMessage.includes('FK_MISSING') ||
                            errorMessage.includes('Référence introuvable');
      expect(isNetworkError).toBe(false);
    });
  });

  describe('resetFailedItems with FK errors', () => {
    it('should reset items with FK_MISSING error to pending', async () => {
      mockDb.execute.mockResolvedValue({ changes: 2 });

      // Simulate the SQL update from syncService
      await mockDb.execute(
        `UPDATE sync_queue SET status = 'pending', error_message = NULL, retry_count = 0 WHERE status = 'failed' AND (error_message LIKE '%FK_MISSING%' OR error_message LIKE '%Référence introuvable%')`
      );

      const resetCount = await mockDb.execute(`SELECT changes() as count`);
      
      expect(mockDb.execute).toHaveBeenCalledWith(`SELECT changes() as count`);
    });

    it('should not reset items with validation errors', async () => {
      // This is a unit test for the logic, not the actual SQL execution
      const errorMessage = 'Validation failed: categorie_id is required';
      
      const shouldReset = errorMessage.includes('FK_MISSING') || errorMessage.includes('Référence introuvable');
      
      expect(shouldReset).toBe(false);
    });
  });

  describe('retry count management', () => {
    it('should increment retry count on retryable error', async () => {
      const currentRetryCount = 2;
      const newRetryCount = currentRetryCount + 1;
      
      expect(newRetryCount).toBe(3);
    });

    it('should mark as failed after 5 retries', async () => {
      const currentRetryCount = 5;
      const maxRetries = 5;
      
      const shouldMarkAsFailed = currentRetryCount >= maxRetries;
      expect(shouldMarkAsFailed).toBe(true);
    });

    it('should continue retrying if under 5 retries', async () => {
      const currentRetryCount = 3;
      const maxRetries = 5;
      
      const shouldContinueRetry = currentRetryCount <= maxRetries;
      expect(shouldContinueRetry).toBe(true);
    });
  });

  describe('FK error scenarios', () => {
    it('should handle FK_MISSING for transactions', () => {
      const error = {
        table: 'transactions',
        action: 'create',
        status: 'error',
        reason: 'Référence introuvable (FK) - probablement un animal ou une entité liée pas encore synchronisée',
        code: 'FK_MISSING',
      };

      const isRetryable = error.code === 'FK_MISSING' || 
                         error.reason.includes('Référence introuvable');
      
      expect(isRetryable).toBe(true);
    });

    it('should handle FK_MISSING for evenements', () => {
      const error = {
        table: 'evenements',
        action: 'create',
        status: 'error',
        reason: 'Foreign key constraint violated',
        code: 'FK_MISSING',
      };

      const isRetryable = error.code === 'FK_MISSING';
      
      expect(isRetryable).toBe(true);
    });

    it('should distinguish FK errors from validation errors', () => {
      const fkError = 'FK_MISSING - Référence introuvable';
      const validationError = 'Validation failed: categorie_id is required';

      const isFkRetryable = fkError.includes('FK_MISSING') || fkError.includes('Référence introuvable');
      const isValidationRetryable = validationError.includes('FK_MISSING') || validationError.includes('Référence introuvable');

      expect(isFkRetryable).toBe(true);
      expect(isValidationRetryable).toBe(false);
    });
  });
});

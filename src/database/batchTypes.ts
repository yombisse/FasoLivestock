/**
 * Type definitions for batch operations with op-sqlite
 * Used to prepare SQL statements for atomic execution via executeBatch()
 * op-sqlite v17.0.0 expects array of tuples [sql, params] format
 */

export type BatchStatement = [sql: string, params: any[]];

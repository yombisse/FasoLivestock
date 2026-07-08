import { getDatabase } from '../connection';

export interface ConflictSummary {
  table_name: string;
  id: string;
  label: string;
  updated_at: string;
}

export interface ConflictDetail {
  table_name: string;
  record_id: string;
  local_data: Record<string, any>;
  server_data: Record<string, any>;
  error_message: string;
}

const BUSINESS_TABLES = ['animals', 'transactions', 'evenements', 'lots', 'notifications', 'naissances'] as const;

const TABLE_LABEL_FIELDS: Record<string, string> = {
  animals: 'nom',
  transactions: 'description',
  evenements: 'description',
  lots: 'nom_lot',
  notifications: 'message',
  naissances: 'observation',
};

export async function getConflicts(): Promise<ConflictSummary[]> {
  const db = await getDatabase();
  const conflicts: ConflictSummary[] = [];

  for (const tableName of BUSINESS_TABLES) {
    try {
      const labelField = TABLE_LABEL_FIELDS[tableName];
      const result = await db.execute(
        `SELECT id, ${labelField}, updated_at FROM ${tableName} WHERE sync_status = 'conflict' AND deleted_at IS NULL`
      );

      if (result && Array.isArray(result)) {
        for (const row of result) {
          conflicts.push({
            table_name: tableName,
            id: row.id,
            label: row[labelField] || `#${row.id.substring(0, 8)}`,
            updated_at: row.updated_at,
          });
        }
      }
    } catch (error) {
      console.error(`[ConflictRepository] Error querying conflicts for ${tableName}:`, error);
    }
  }

  return conflicts;
}

export async function forceKeepLocal(tableName: string, id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Begin transaction
    await db.execute('BEGIN TRANSACTION');

    // Get current version
    const versionResult = await db.execute(`SELECT version FROM ${tableName} WHERE id = ?`, [id]);
    const currentVersion = versionResult?.[0]?.version || 0;
    const newVersion = currentVersion + 1;

    // Update record to pending status with incremented version
    const updateSQL = `
      UPDATE ${tableName}
      SET sync_status = 'pending', version = ?, updated_at = ?
      WHERE id = ?
    `;
    await db.execute(updateSQL, [newVersion, now, id]);

    // Get full record for sync_queue
    const fullRecordResult = await db.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    const fullRecord = fullRecordResult?.[0];

    // Insert into sync_queue as update action
    const syncQueueSQL = `
      INSERT INTO sync_queue (table_name, record_id, action, data, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(syncQueueSQL, [
      tableName,
      id,
      'update',
      JSON.stringify(fullRecord),
      'pending',
      now,
    ]);

    // Commit transaction
    await db.execute('COMMIT');
  } catch (error) {
    // Rollback on error
    await db.execute('ROLLBACK');
    console.error(`[ConflictRepository] Error forcing keep local for ${tableName}:`, error);
    throw error;
  }
}

/**
 * Get conflict details from sync_queue for a specific record
 * @param tableName - Table name
 * @param recordId - Record ID
 * @returns Conflict detail with local and server data, or null if not found
 */
export async function getConflictDetail(tableName: string, recordId: string): Promise<ConflictDetail | null> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT table_name, record_id, conflict_local_data, conflict_server_data, error_message 
       FROM sync_queue 
       WHERE table_name = ? AND record_id = ? AND status = 'failed' AND error_message LIKE 'Conflict:%'`,
      [tableName, recordId]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      table_name: row.table_name,
      record_id: row.record_id,
      local_data: row.conflict_local_data ? JSON.parse(row.conflict_local_data) : {},
      server_data: row.conflict_server_data ? JSON.parse(row.conflict_server_data) : {},
      error_message: row.error_message,
    };
  } catch (error) {
    console.error(`[ConflictRepository] Error getting conflict detail for ${tableName}:${recordId}:`, error);
    return null;
  }
}

/**
 * Accept server version for a conflict
 * Applies server data locally and marks as synced
 * @param tableName - Table name
 * @param recordId - Record ID
 */
export async function acceptServerVersion(tableName: string, recordId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Get conflict detail
    const conflict = await getConflictDetail(tableName, recordId);
    if (!conflict) {
      throw new Error(`Conflict not found for ${tableName}:${recordId}`);
    }

    // Begin transaction
    await db.execute('BEGIN TRANSACTION');

    // Apply server data to local record
    const serverData = conflict.server_data;
    const updateFields: string[] = [];
    const values: any[] = [];

    // Build dynamic update statement based on server data
    for (const [key, value] of Object.entries(serverData)) {
      if (key !== 'id' && key !== 'sync_status' && key !== 'version' && key !== 'created_at') {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      await db.execute('ROLLBACK');
      return;
    }

    updateFields.push('sync_status = ?');
    values.push('synced');
    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(recordId);

    await db.execute(
      `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    // Delete the sync_queue item
    await db.execute(
      `DELETE FROM sync_queue WHERE table_name = ? AND record_id = ? AND status = 'failed'`,
      [tableName, recordId]
    );

    // Commit transaction
    await db.execute('COMMIT');

    console.log(`[ConflictRepository] Accepted server version for ${tableName}:${recordId}`);
  } catch (error) {
    // Rollback on error
    await db.execute('ROLLBACK');
    console.error(`[ConflictRepository] Error accepting server version for ${tableName}:`, error);
    throw error;
  }
}

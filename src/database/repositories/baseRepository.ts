import { getDatabase } from '../connection';
import { generateUUID } from '../../utils/uuid';

export async function createLocalRecord<T extends Record<string, any>>(
  tableName: string,
  data: Partial<T>
): Promise<T> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = data.id || generateUUID();

  const recordToInsert = {
    ...data,
    id,
    sync_status: 'pending',
    version: 1,
    created_at: now,
    updated_at: now,
  };

  try {
    // Begin transaction
    await db.execute('BEGIN TRANSACTION');

    // Check if record already exists (by ID)
    const existingRecord = await db.execute(`SELECT id FROM ${tableName} WHERE id = ?`, [id]);
    if (existingRecord?.rows && existingRecord.rows.length > 0) {
      await db.execute('ROLLBACK');
      throw new Error(`Record with id ${id} already exists in ${tableName}. Duplicate insertion prevented.`);
    }

    // Insert into table using INSERT OR IGNORE to handle UNIQUE constraints
    const columns = Object.keys(recordToInsert);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(recordToInsert);
    
    const insertSQL = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    await db.execute(insertSQL, values);

    // Check if insertion was successful
    const insertedRecord = await db.execute(`SELECT id FROM ${tableName} WHERE id = ?`, [id]);
    if (!insertedRecord?.rows || insertedRecord.rows.length === 0) {
      await db.execute('ROLLBACK');
      throw new Error(`Failed to insert record in ${tableName}. Possible UNIQUE constraint violation.`);
    }

    // Insert into sync_queue
    const syncQueueSQL = `
      INSERT INTO sync_queue (table_name, record_id, action, data, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(syncQueueSQL, [
      tableName,
      id,
      'create',
      JSON.stringify(recordToInsert),
      'pending',
      now,
    ]);

    console.log(`[BaseRepository] Created sync_queue entry for ${tableName}/${id} with status pending`);

    // Commit transaction
    await db.execute('COMMIT');

    return recordToInsert as unknown as T;
  } catch (error) {
    // Rollback on error
    await db.execute('ROLLBACK');
    console.error(`[BaseRepository] Error creating record in ${tableName}:`, error);
    throw error;
  }
}

export async function updateLocalRecord<T extends Record<string, any>>(
  tableName: string,
  id: string,
  data: Partial<T>
): Promise<T> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Begin transaction
    await db.execute('BEGIN TRANSACTION');

    // Get current version
    const versionResult = await db.execute(`SELECT version FROM ${tableName} WHERE id = ?`, [id]);
    let currentVersion = 0;
    if (versionResult?.rows) {
      currentVersion = versionResult.rows[0]?.version || 0;
    } else if (Array.isArray(versionResult) && versionResult.length > 0) {
      currentVersion = versionResult[0]?.version || 0;
    }
    const newVersion = currentVersion + 1;

    // Build update statement
    const updateData = {
      ...data,
      sync_status: 'pending',
      version: newVersion,
      updated_at: now,
    };
    
    const columns = Object.keys(updateData);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updateData), id];

    const updateSQL = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    await db.execute(updateSQL, values);

    // Get full record for sync_queue
    const fullRecordResult = await db.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    let fullRecord = null;
    if (fullRecordResult?.rows) {
      fullRecord = fullRecordResult.rows[0];
    } else if (Array.isArray(fullRecordResult) && fullRecordResult.length > 0) {
      fullRecord = fullRecordResult[0];
    }

    if (!fullRecord) {
      throw new Error(`Record ${id} not found in ${tableName}`);
    }

    // Insert into sync_queue
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

    return fullRecord as unknown as T;
  } catch (error) {
    // Rollback on error
    await db.execute('ROLLBACK');
    console.error(`[BaseRepository] Error updating record in ${tableName}:`, error);
    throw error;
  }
}

export async function softDeleteLocalRecord(
  tableName: string,
  id: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Begin transaction
    await db.execute('BEGIN TRANSACTION');

    // Get current version
    const versionResult = await db.execute(`SELECT version FROM ${tableName} WHERE id = ?`, [id]);
    let currentVersion = 0;
    if (versionResult?.rows) {
      currentVersion = versionResult.rows[0]?.version || 0;
    } else if (Array.isArray(versionResult) && versionResult.length > 0) {
      currentVersion = versionResult[0]?.version || 0;
    }
    const newVersion = currentVersion + 1;

    // Soft delete
    const updateSQL = `
      UPDATE ${tableName}
      SET deleted_at = ?, sync_status = 'pending', version = ?, updated_at = ?
      WHERE id = ?
    `;
    await db.execute(updateSQL, [now, newVersion, now, id]);

    // Get full record for sync_queue
    const fullRecordResult = await db.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    let fullRecord = null;
    if (fullRecordResult?.rows) {
      fullRecord = fullRecordResult.rows[0];
    } else if (Array.isArray(fullRecordResult) && fullRecordResult.length > 0) {
      fullRecord = fullRecordResult[0];
    }

    if (!fullRecord) {
      throw new Error(`Record ${id} not found in ${tableName}`);
    }

    // Insert into sync_queue
    const syncQueueSQL = `
      INSERT INTO sync_queue (table_name, record_id, action, data, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(syncQueueSQL, [
      tableName,
      id,
      'delete',
      JSON.stringify(fullRecord),
      'pending',
      now,
    ]);

    // Commit transaction
    await db.execute('COMMIT');
  } catch (error) {
    // Rollback on error
    await db.execute('ROLLBACK');
    console.error(`[BaseRepository] Error soft deleting record in ${tableName}:`, error);
    throw error;
  }
}

export async function restoreLocalRecord<T extends Record<string, any>>(
  tableName: string,
  id: string
): Promise<T> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Begin transaction
    await db.execute('BEGIN TRANSACTION');

    // Get current version
    const versionResult = await db.execute(`SELECT version FROM ${tableName} WHERE id = ?`, [id]);
    let currentVersion = 0;
    if (versionResult?.rows) {
      currentVersion = versionResult.rows[0]?.version || 0;
    } else if (Array.isArray(versionResult) && versionResult.length > 0) {
      currentVersion = versionResult[0]?.version || 0;
    }
    const newVersion = currentVersion + 1;

    // Restore by setting deleted_at to NULL
    const updateSQL = `
      UPDATE ${tableName}
      SET deleted_at = NULL, sync_status = 'pending', version = ?, updated_at = ?
      WHERE id = ?
    `;
    await db.execute(updateSQL, [newVersion, now, id]);

    // Get full record for sync_queue
    const fullRecordResult = await db.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    let fullRecord = null;
    if (fullRecordResult?.rows) {
      fullRecord = fullRecordResult.rows[0];
    } else if (Array.isArray(fullRecordResult) && fullRecordResult.length > 0) {
      fullRecord = fullRecordResult[0];
    }

    if (!fullRecord) {
      throw new Error(`Record ${id} not found in ${tableName}`);
    }

    // Insert into sync_queue with 'update' action (restore is mapped to update)
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

    return fullRecord as unknown as T;
  } catch (error) {
    // Rollback on error
    await db.execute('ROLLBACK');
    console.error(`[BaseRepository] Error restoring record in ${tableName}:`, error);
    throw error;
  }
}

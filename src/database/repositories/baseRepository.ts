import database from '../watermelonIndex';

/**
 * Create a local record in WatermelonDB
 * @param tableName - The name of the table/collection
 * @param data - The data to insert
 * @returns The created record
 */
export async function createLocalRecord<T>(tableName: string, data: any): Promise<T> {
  return await database.write(async () => {
    const collection = database.get(tableName);
    const record = await collection.create((record: any) => {
      Object.keys(data).forEach(key => {
        record[key] = data[key];
      });
      
      // Set default values for specific tables
      if (tableName === 'animals') {
        if (!data.statut) record.statut = 'SAIN';
      }
      
      // Set sync_status to pending for all new records
      if (!data.sync_status) record.sync_status = 'pending';
      
      // Set version to 1 for new records
      if (!data.version) record.version = 1;
    });
    console.log(`[BaseRepository] Created record in ${tableName}:`, {
      id: record.id,
      _status: (record as any)._status,
      _changed: (record as any)._changed,
      sync_status: (record as any).sync_status,
      statut: (record as any).statut,
    });
    return record as T;
  });
}

/**
 * Update a local record in WatermelonDB
 * @param tableName - The name of the table/collection
 * @param id - The ID of the record to update
 * @param data - The data to update
 * @returns The updated record
 */
export async function updateLocalRecord<T>(tableName: string, id: string, data: any): Promise<T> {
  return await database.write(async () => {
    const collection = database.get(tableName);
    const record = await collection.find(id);
    
    // Get current version for increment
    const currentVersion = (record as any).version || 0;
    
    await record.update((record: any) => {
      Object.keys(data).forEach(key => {
        record[key] = data[key];
      });
      
      // Increment version for sync tracking
      record.version = currentVersion + 1;
      
      // Set sync_status to pending after modification
      record.sync_status = 'pending';
    });
    
    console.log(`[BaseRepository] Updated record in ${tableName}:`, {
      id: record.id,
      _status: (record as any)._status,
      _changed: (record as any)._changed,
      sync_status: (record as any).sync_status,
      version: (record as any).version,
    });
    
    return record as T;
  });
}

/**
 * Soft delete a local record in WatermelonDB
 * @param tableName - The name of the table/collection
 * @param id - The ID of the record to delete
 */
export async function softDeleteLocalRecord(tableName: string, id: string): Promise<void> {
  return await database.write(async () => {
    const collection = database.get(tableName);
    const record = await collection.find(id);
    
    // Get current version for increment
    const currentVersion = (record as any).version || 0;
    
    await record.update((record: any) => {
      // Pour WatermelonDB, utiliser set pour les champs date
      (record as any).deletedAt = new Date();
      record.sync_status = 'pending';
      record.version = currentVersion + 1;
    });
    
    console.log(`[BaseRepository] Soft deleted record in ${tableName}:`, {
      id: record.id,
      _status: (record as any)._status,
      sync_status: (record as any).sync_status,
      version: (record as any).version,
      deleted_at: (record as any).deletedAt,
      deleted_at_raw: (record as any).deleted_at,
    });
  });
}

/**
 * Restore a soft-deleted local record in WatermelonDB
 * @param tableName - The name of the table/collection
 * @param id - The ID of the record to restore
 */
export async function restoreLocalRecord(tableName: string, id: string): Promise<void> {
  return await database.write(async () => {
    const collection = database.get(tableName);
    const record = await collection.find(id);
    await record.update((record: any) => {
      record.deleted_at = null;
    });
  });
}

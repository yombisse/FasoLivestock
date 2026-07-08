import { open } from '@op-engineering/op-sqlite';
import { SCHEMA_STATEMENTS } from './schema';

let dbInstance: any = null;
let dbInstanceId = Math.random().toString(36).substring(7);

export async function getDatabase(): Promise<any> {
  if (dbInstance) {
    console.log('[Connection] Returning cached DB instance, ID:', dbInstanceId);
    return dbInstance;
  }

  console.log('[Connection] Opening new DB connection');
  dbInstance = await open({ name: 'fasolivestock.db' });
  dbInstanceId = Math.random().toString(36).substring(7);
  console.log('[Connection] New DB instance created, ID:', dbInstanceId);
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  try {
    const db = await getDatabase();

    // Performance PRAGMA settings - reduce SQLITE_BUSY during concurrent writes
    await db.execute('PRAGMA journal_mode = WAL');
    await db.execute('PRAGMA synchronous = NORMAL');

    // Create schema_migrations table to track applied migrations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);

    // Execute all schema statements (CREATE TABLE IF NOT EXISTS is idempotent)
    for (const statement of SCHEMA_STATEMENTS) {
      try {
        await db.execute(statement);
        if (__DEV__) {
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
          if (tableName) {
            console.log(`[SQLite] Table/index created: ${tableName}`);
          }
        }
      } catch (error) {
        // Ignore errors for existing tables/indexes (IF NOT EXISTS should handle this)
        if (__DEV__) {
          console.warn('[SQLite] Statement execution warning:', error);
        }
      }
    }

    // Run migrations to update existing database schema
    await runMigrations(db);

    // Initialize sync_metadata row if not exists (idempotent)
    try {
      // Use INSERT OR IGNORE to handle existing row gracefully
      await db.execute(
        `INSERT OR IGNORE INTO sync_metadata (id, last_sync_at, last_push_at, last_pull_at, farm_id, user_id, sync_token) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [1, null, null, null, '', '', null]
      );
      if (__DEV__) {
        console.log('[SQLite] sync_metadata initialized (or already exists)');
      }
    } catch (error) {
      console.error('[SQLite] Failed to initialize sync_metadata:', error);
      // Don't throw - allow app to continue even if sync_metadata init fails
    }

    if (__DEV__) {
      console.log('[SQLite] Database initialization completed');
    }
  } catch (error) {
    console.error('[SQLite] Database initialization failed:', error);
    throw error;
  }
}

async function runMigrations(db: any): Promise<void> {
  try {
    // Helper function to check if migration was already applied
    const isMigrationApplied = async (version: number): Promise<boolean> => {
      const result = await db.execute(
        `SELECT version FROM schema_migrations WHERE version = ?`,
        [version]
      );
      return (result.rows?._array || []).length > 0;
    };

    // Helper function to mark migration as applied
    const markMigrationApplied = async (version: number): Promise<void> => {
      await db.execute(
        `INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
        [version, new Date().toISOString()]
      );
    };

    // Migration 1: Add date_fin column to evenements
    if (!(await isMigrationApplied(1))) {
      try {
        await db.execute(`ALTER TABLE evenements ADD COLUMN date_fin TEXT`);
        console.log('[SQLite Migration] Added date_fin column to evenements');
        await markMigrationApplied(1);
      } catch (error: any) {
        // Column might already exist, ignore error
        if (!error.message?.includes('duplicate column')) {
          console.warn('[SQLite Migration] Failed to add date_fin column:', error);
        } else {
          // Mark as applied even if column already exists
          await markMigrationApplied(1);
        }
      }
    }

    // Migration 2: Add version column to especes
    if (!(await isMigrationApplied(2))) {
      try {
        await db.execute(`ALTER TABLE especes ADD COLUMN version INTEGER DEFAULT 1`);
        console.log('[SQLite Migration] Added version column to especes');
        await markMigrationApplied(2);
      } catch (error: any) {
        // Column might already exist, ignore error
        if (!error.message?.includes('duplicate column')) {
          console.warn('[SQLite Migration] Failed to add version column:', error);
        } else {
          // Mark as applied even if column already exists
          await markMigrationApplied(2);
        }
      }
    }

    // Migration 3: Remove CHECK constraint on origine (requires recreating table)
    // SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate
    if (!(await isMigrationApplied(3))) {
      try {
        const tableInfo = await db.execute(`PRAGMA table_info(animals)`);
        const hasOrigineCheck = tableInfo.some((col: any) => col.name === 'origine');

        if (hasOrigineCheck) {
          console.log('[SQLite Migration] Removing CHECK constraint on origine (recreating animals table)');

          // Create new table without CHECK constraint
          await db.execute(`
            CREATE TABLE animals_new (
              id TEXT PRIMARY KEY,
              farm_id TEXT NOT NULL,
              nom TEXT,
              race TEXT,
              sexe TEXT CHECK(sexe IN ('male', 'femelle')),
              date_naissance TEXT,
              poids REAL,
              statut TEXT CHECK(statut IN ('ACTIF', 'VENDU', 'MORT', 'PERDU')) DEFAULT 'ACTIF',
              espece_id TEXT NOT NULL,
              lot_id TEXT,
              mother_id TEXT,
              numero_identification TEXT,
              photo TEXT,
              naissance_id TEXT,
              origine TEXT,
              etat_sante TEXT CHECK(etat_sante IN ('SAIN', 'MALADE', 'QUARANTAINE')) DEFAULT 'SAIN',
              farm_source_id TEXT,
              sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
              last_modified_by TEXT,
              version INTEGER DEFAULT 1,
              created_at TEXT,
              updated_at TEXT,
              deleted_at TEXT
            )
          `);

          // Copy data
          await db.execute(`
            INSERT INTO animals_new SELECT * FROM animals
          `);

          // Drop old table
          await db.execute(`DROP TABLE animals`);

          // Rename new table
          await db.execute(`ALTER TABLE animals_new RENAME TO animals`);

          // Recreate indexes
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_farm_id ON animals(farm_id)`);
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_espece_id ON animals(espece_id)`);
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_lot_id ON animals(lot_id)`);
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_mother_id ON animals(mother_id)`);
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_statut ON animals(statut)`);
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_sync_status ON animals(sync_status)`);
          await db.execute(`CREATE INDEX IF NOT EXISTS idx_animals_version ON animals(version)`);
          await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_animals_farm_identification ON animals(farm_id, numero_identification)`);

          console.log('[SQLite Migration] Successfully recreated animals table without origine CHECK constraint');
        }
        await markMigrationApplied(3);
      } catch (error) {
        console.warn('[SQLite Migration] Failed to recreate animals table:', error);
        // Mark as applied to prevent retry even if it failed
        await markMigrationApplied(3);
      }
    }

    // Migration 4: Add numero_transaction column to transactions table
    if (!(await isMigrationApplied(4))) {
      try {
        await db.execute(`ALTER TABLE transactions ADD COLUMN numero_transaction TEXT`);
        console.log('[SQLite Migration] Added numero_transaction column to transactions');
        await markMigrationApplied(4);
      } catch (error: any) {
        // Column might already exist, ignore error
        if (!error.message?.includes('duplicate column')) {
          console.warn('[SQLite Migration] Failed to add numero_transaction column to transactions:', error);
        } else {
          // Mark as applied even if column already exists
          await markMigrationApplied(4);
        }
      }
    }

    // Migration 5: Add conflict columns to sync_queue for conflict resolution
    if (!(await isMigrationApplied(5))) {
      try {
        await db.execute(`ALTER TABLE sync_queue ADD COLUMN conflict_local_data TEXT`);
        await db.execute(`ALTER TABLE sync_queue ADD COLUMN conflict_server_data TEXT`);
        console.log('[SQLite Migration] Added conflict_local_data and conflict_server_data columns to sync_queue');
        await markMigrationApplied(5);
      } catch (error: any) {
        // Column might already exist, ignore error
        if (!error.message?.includes('duplicate column')) {
          console.warn('[SQLite Migration] Failed to add conflict columns to sync_queue:', error);
        } else {
          // Mark as applied even if column already exists
          await markMigrationApplied(5);
        }
      }
    }

    // Migration 6: Add retry_count column to sync_queue for intelligent retry
    if (!(await isMigrationApplied(6))) {
      try {
        await db.execute(`ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER DEFAULT 0`);
        console.log('[SQLite Migration] Added retry_count column to sync_queue');
        await markMigrationApplied(6);
      } catch (error: any) {
        // Column might already exist, ignore error
        if (!error.message?.includes('duplicate column')) {
          console.warn('[SQLite Migration] Failed to add retry_count column to sync_queue:', error);
        } else {
          // Mark as applied even if column already exists
          await markMigrationApplied(6);
        }
      }
    }

    console.log('[SQLite] Migrations completed');
  } catch (error) {
    console.error('[SQLite] Migrations failed:', error);
    // Don't throw - allow app to continue even if migrations fail
  }
}

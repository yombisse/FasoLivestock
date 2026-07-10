import { getDatabase } from '../connection';
import { BatchStatement } from '../batchTypes';
import { createLocalRecord } from './baseRepository';

export interface Categorie {
  id: string;
  nom_categorie: string;
  type: 'REVENU' | 'DEPENSE';
  description?: string;
  farm_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function createCategorie(data: Omit<Categorie, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Categorie> {
  const db = await getDatabase();
  
  // Check for duplicate nom_categorie
  if (data.nom_categorie) {
    const existingCategorie = await db.execute(
      `SELECT id FROM categories WHERE nom_categorie = ? AND deleted_at IS NULL`,
      [data.nom_categorie]
    );
    if (existingCategorie?.rows && existingCategorie.rows.length > 0) {
      throw new Error(`Une catégorie avec le nom "${data.nom_categorie}" existe déjà.`);
    }
  }
  
  return createLocalRecord<Categorie>('categories', data);
}

export async function getLocalCategories(): Promise<Categorie[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM categories WHERE deleted_at IS NULL`
  );

  if (!result) {
    return [];
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    return result.rows as Categorie[];
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result as Categorie[];
  }

  return [];
}

export async function getLocalCategorieById(id: string): Promise<Categorie | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  if (!result) {
    return null;
  }

  // op-sqlite returns { rows: [...] }
  if (result.rows) {
    const rows = result.rows as Categorie[];
    return rows.length > 0 ? rows[0] : null;
  }

  // Fallback if result is directly an array
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }

  return null;
}

/**
 * Build batch statements for categorie upserts (pure function, no DB execution)
 * Used with executeBatch for atomic operations
 * @param categories - Array of categories to upsert
 * @param now - Current timestamp string
 * @returns Array of [sql, params] tuples for batch execution
 */
export function buildCategorieUpsertStatements(categories: any[], now: string): BatchStatement[] {
  return categories.map((categorie) => [
    `INSERT INTO categories (
      id, nom_categorie, type, description, farm_id, sync_status, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'synced', 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nom_categorie = excluded.nom_categorie,
      type = excluded.type,
      description = excluded.description,
      farm_id = excluded.farm_id,
      sync_status = 'synced',
      updated_at = excluded.updated_at,
      version = version + 1`,
    [
      categorie.id,
      categorie.nom_categorie,
      categorie.type,
      categorie.description || null,
      categorie.farm_id || null,
      categorie.created_at || now,
      categorie.updated_at || now,
    ],
  ]);
}

/**
 * Upsert categories (insert or update) - atomic using ON CONFLICT
 * Used during sync to store categories from backend
 * @param categories - Array of categories to upsert
 * @param tx - Optional transaction object for atomic operations
 */
export async function upsertCategories(categories: Categorie[], tx?: any): Promise<void> {
  try {
    const db = tx || (await getDatabase());
    const now = new Date().toISOString();

    for (const categorie of categories) {
      // Atomic UPSERT using ON CONFLICT - eliminates race condition
      await db.execute(
        `INSERT INTO categories (
          id, nom_categorie, type, description, farm_id, sync_status, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'synced', 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nom_categorie = excluded.nom_categorie,
          type = excluded.type,
          description = excluded.description,
          farm_id = excluded.farm_id,
          sync_status = 'synced',
          updated_at = excluded.updated_at,
          version = version + 1`,
        [
          categorie.id,
          categorie.nom_categorie,
          categorie.type,
          categorie.description || null,
          categorie.farm_id || null,
          categorie.created_at || now,
          categorie.updated_at || now,
        ]
      );
    }

    console.log(`[CategorieRepository] Upserted ${categories.length} categories atomically`);
  } catch (error) {
    console.error('[CategorieRepository] Error upserting categories:', error);
    throw error;
  }
}

/**
 * Get category ID by name (case-insensitive, accent-insensitive)
 * Used to resolve category names to UUIDs for offline-first operations
 * @param name - Category name to search for
 * @returns Category UUID or null if not found
 */
export async function getCategorieIdByName(name: string): Promise<string | null> {
  try {
    const db = await getDatabase();

    // Normalize the search term: remove accents and convert to uppercase
    const normalizeString = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toUpperCase();
    };

    const normalizedName = normalizeString(name);

    const result = await db.execute(
      `SELECT id, nom_categorie FROM categories WHERE deleted_at IS NULL`
    );

    if (!result || !result.rows) {
      return null;
    }

    const categories = result.rows as Categorie[];

    // Find matching category by normalized name
    for (const categorie of categories) {
      const normalizedCategorieName = normalizeString(categorie.nom_categorie);
      if (normalizedCategorieName === normalizedName) {
        console.log(`[CategorieRepository] Found match: ${name} -> ${categorie.id}`);
        return categorie.id;
      }
    }

    console.log(`[CategorieRepository] No match found for: ${name}`);
    return null;
  } catch (error) {
    console.error('[CategorieRepository] Error getting category by name:', error);
    return null;
  }
}

/**
 * Ensure default categories exist in local database
 * Creates critical categories if they don't exist
 * NOTE: This function is a FALLBACK - these categories should be
 * retrieved from the backend via /sync/initial (they are in the seeder).
 * This function can be called manually if needed for testing or emergency fallback.
 * 
 * IMPORTANT: This function generates UUIDs locally as fallback. The backend
 * will override these with proper UUIDs during sync.
 */
export async function ensureDefaultCategoriesExist(): Promise<void> {
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // Only create critical categories needed for app functionality
    const criticalCategories = [
      {
        nom_categorie: 'Achat d\'animaux',
        type: 'DEPENSE' as const,
        description: 'Dépenses pour l\'achat d\'animaux',
      },
      {
        nom_categorie: 'FRAIS_SANITAIRE',
        type: 'DEPENSE' as const,
        description: 'Frais sanitaires générés automatiquement (vaccinations, traitements, consultations)',
      },
      {
        nom_categorie: 'FRAIS_REPRODUCTION',
        type: 'DEPENSE' as const,
        description: 'Frais de reproduction générés automatiquement (saillie, insémination, gestation, mise bas)',
      },
    ];

    for (const category of criticalCategories) {
      // Check if category already exists
      const existing = await db.execute(
        `SELECT id FROM categories WHERE nom_categorie = ? AND deleted_at IS NULL`,
        [category.nom_categorie]
      );

      if (!existing?.rows || existing.rows.length === 0) {
        // Generate a random UUID as fallback (will be replaced by backend during sync)
        const fallbackId = 'fallback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Create the category
        await db.execute(
          `INSERT INTO categories (id, nom_categorie, type, description, sync_status, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'synced', 1, ?, ?)`,
          [fallbackId, category.nom_categorie, category.type, category.description, now, now]
        );
        console.log(`[CategorieRepository] Created fallback category: ${category.nom_categorie} (will be replaced by backend during sync)`);
      }
    }
  } catch (error) {
    console.error('[CategorieRepository] Error ensuring default categories exist:', error);
  }
}

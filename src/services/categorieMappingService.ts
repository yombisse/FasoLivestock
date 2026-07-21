import { getLocalCategories } from '../database/repositories/categorieRepository';

class CategorieMappingService {
  private static mapping: Map<string, string> = new Map();
  private static initialized = false;

  /**
   * Initialize the mapping by loading all categories from local database
   * Should be called once at app startup
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[CategorieMappingService] Already initialized');
      return;
    }

    try {
      console.log('[CategorieMappingService] Initializing mapping...');
      
      // Load all categories
      const categories = await getLocalCategories();
      
      // Create mapping nom_categorie → id
      this.mapping.clear();
      categories.forEach(cat => {
        this.mapping.set(cat.nom_categorie, cat.id);
      });

      this.initialized = true;
      console.log('[CategorieMappingService] Mapping initialized with', this.mapping.size, 'categories');
      
      // Log the mapping for debugging
      console.log('[CategorieMappingService] Available categories:', Array.from(this.mapping.keys()));
    } catch (error) {
      console.error('[CategorieMappingService] Error initializing mapping:', error);
      throw error;
    }
  }

  /**
   * Get the ID for a category by its name
   * Returns undefined if not found
   */
  static getId(nomCategorie: string): string | undefined {
    if (!this.initialized) {
      console.warn('[CategorieMappingService] Not initialized, returning undefined');
      return undefined;
    }
    
    const id = this.mapping.get(nomCategorie);
    if (!id) {
      console.warn('[CategorieMappingService] Category not found in mapping:', nomCategorie);
    }
    return id;
  }

  /**
   * Get the ID for a category by type and partial name match
   * Useful for finding "Achat d'animaux" by type DEPENSE and name containing "achat"
   */
  static getIdByTypeAndPartialName(type: 'REVENU' | 'DEPENSE', partialName: string): string | undefined {
    if (!this.initialized) {
      console.warn('[CategorieMappingService] Not initialized, returning undefined');
      return undefined;
    }

    // Find category matching type and partial name
    for (const [nom, id] of this.mapping.entries()) {
      if (nom.toLowerCase().includes(partialName.toLowerCase())) {
        // We need to check the type from the database
        // For now, we'll return the first match and let the caller verify
        console.log('[CategorieMappingService] Found category matching partial name:', nom, 'ID:', id);
        return id;
      }
    }

    console.warn('[CategorieMappingService] No category found matching type:', type, 'and partial name:', partialName);
    return undefined;
  }

  /**
   * Check if the service is initialized
   */
  static isReady(): boolean {
    return this.initialized;
  }

  /**
   * Reset the mapping (useful for testing or re-initialization)
   */
  static reset(): void {
    this.mapping.clear();
    this.initialized = false;
  }

  /**
   * Constants for system categories
   * These provide type-safety and prevent typos
   */
  static readonly CATEGORIES = {
    // Revenus
    VENTE_ANIMAUX: 'Vente d\'animaux',
    
    // Dépenses
    ACHAT_ANIMAUX: 'Achat d\'animaux',
    SANTE_VETERINAIRE: 'Santé (vétérinaire)',
    REPRODUCTION: 'Reproduction',
    
    // Dépenses générées automatiquement
    FRAIS_SANITAIRE: 'FRAIS_SANITAIRE',
    FRAIS_REPRODUCTION: 'FRAIS_REPRODUCTION',
    FRAIS_MALADIE: 'FRAIS_MALADIE',
  } as const;

  /**
   * Find category ID by partial name match (case-insensitive)
   * Useful when exact name might have slight variations
   */
  static findByPartialName(partialName: string): string | undefined {
    if (!this.initialized) {
      console.warn('[CategorieMappingService] Not initialized, returning undefined');
      return undefined;
    }

    const partialLower = partialName.toLowerCase();
    for (const [nom, id] of this.mapping.entries()) {
      if (nom.toLowerCase().includes(partialLower)) {
        console.log('[CategorieMappingService] Found category by partial name:', nom, 'ID:', id);
        return id;
      }
    }

    console.warn('[CategorieMappingService] No category found matching partial name:', partialName);
    return undefined;
  }

  /**
   * Get all available category names
   */
  static getAvailableCategories(): string[] {
    return Array.from(this.mapping.keys());
  }
}

export default CategorieMappingService;

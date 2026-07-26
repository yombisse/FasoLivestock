import { Animal } from '../../types/animal.types';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export async function createAnimal(data: Omit<Animal, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Animal> {
  // Check for duplicate numero_identification within the same farm
  if (data.farm_id && data.numero_identification) {
    const existingAnimals = await database.get('animals')
      .query(Q.where('farm_id', data.farm_id), Q.where('numero_identification', data.numero_identification))
      .fetch();
    
    if (existingAnimals.length > 0) {
      throw new Error(`Un animal avec le numéro d'identification "${data.numero_identification}" existe déjà dans cette ferme.`);
    }
  }

  try {
    const result = await createLocalRecord<Animal>('animals', data);
    console.log('[AnimalRepository] Animal created successfully with sync_status pending, ID:', result.id);
    console.log('[AUDIT] Animal creation details:', {
      local_id: result.id,
      farm_id: (result as any).farm_id,
      sync_status: (result as any).sync_status,
      _status: (result as any)._status,
      version: (result as any).version,
      statut: (result as any).statut,
    });
    
    // Check WatermelonDB sync queue status
    const pendingAnimals = await database.get('animals')
      .query(Q.where('_status', 'created'))
      .fetch();
    console.log('[AUDIT] WatermelonDB sync queue - pending animals count:', pendingAnimals.length);
    
    return result;
  } catch (error) {
    console.error('[AnimalRepository] Failed to create animal:', error);
    throw error;
  }
}

export async function updateAnimal(id: string, data: Partial<Animal>): Promise<Animal> {
  return updateLocalRecord<Animal>('animals', id, data);
}

export async function deleteAnimal(id: string): Promise<void> {
  return softDeleteLocalRecord('animals', id);
}

export async function getLocalAnimals(farmId: string): Promise<Animal[]> {
  const animals = await database.get('animals')
    .query(Q.where('farm_id', farmId))
    .fetch();
  return animals as unknown as Animal[];
}

/**
 * Get only alive and present animals (exclude MORT, VENDU, PERDU) for event creation
 */
export async function getLocalActiveAnimals(farmId: string): Promise<Animal[]> {
  const animals = await database.get('animals')
    .query(Q.where('farm_id', farmId))
    .fetch();
  // Filter out dead, sold, or lost animals
  const activeAnimals = animals.filter((animal: any) => {
    const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
    return !excludedStatuses.includes(animal._raw.statut || '');
  });
  return activeAnimals as unknown as Animal[];
}

export async function getLocalAnimalById(id: string): Promise<Animal | null> {
  try {
    const animals = await database.get('animals')
      .query(Q.where('id', id))
      .fetch();
    
    if (animals.length > 0) {
      return animals[0] as unknown as Animal;
    }
    return null;
  } catch (error) {
    console.error('[AnimalRepository] Error getting animal by ID:', error);
    return null;
  }
}

/**
 * Check if an animal with the given numero_identification already exists in the farm
 */
export async function getLocalAnimalByNumeroIdentification(farmId: string, numeroIdentification: string): Promise<Animal | null> {
  try {
    const animals = await database.get('animals')
      .query(Q.where('farm_id', farmId), Q.where('numero_identification', numeroIdentification))
      .fetch();

    if (animals.length > 0) {
      return animals[0] as unknown as Animal;
    }
    return null;
  } catch (error) {
    console.error('[AnimalRepository] Error getting animal by numero_identification:', error);
    return null;
  }
}

/**
 * Get animals by lot_id
 */
export async function getAnimalsByLot(lotId: string): Promise<Animal[]> {
  try {
    const animals = await database.get('animals')
      .query(Q.where('lot_id', lotId))
      .fetch();
    return animals as unknown as Animal[];
  } catch (error) {
    console.error('[AnimalRepository] Error getting animals by lot:', error);
    return [];
  }
}

/**
 * Get active females with espece relation loaded (alive and present only)
 */
export async function getLocalActiveFemales(farmId: string): Promise<Animal[]> {
  const animals = await database.get('animals')
    .query(Q.where('farm_id', farmId), Q.where('sexe', 'femelle'))
    .fetch();

  // Filter out dead, sold, or lost animals
  const activeAnimals = animals.filter((animal: any) => {
    const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
    return !excludedStatuses.includes(animal._raw.statut || '');
  });

  // Load espece relations and extract properties correctly
  const animalsWithSpecies = await Promise.all(
    activeAnimals.map(async (animal: any) => {
      let especeData = { id: '', nom: 'Non défini' };
      try {
        if (animal.espece) {
          const espece = await animal.espece.fetch();
          especeData = espece._raw ? { id: espece._raw.id, nom: espece._raw.nom } : { id: espece.id, nom: espece.nom };
        }
      } catch (e) {
        console.warn('[getLocalActiveFemales] Failed to load espece for animal:', animal._raw.id, e);
      }
      return {
        id: animal._raw.id,
        farm_id: animal._raw.farm_id,
        nom: animal._raw.nom,
        race: animal._raw.race,
        sexe: animal._raw.sexe,
        date_naissance: animal._raw.date_naissance,
        poids: animal._raw.poids,
        espece_id: animal._raw.espece_id,
        lot_id: animal._raw.lot_id,
        mother_id: animal._raw.mother_id,
        statut: animal._raw.statut,
        numero_identification: animal._raw.numero_identification,
        photo: animal._raw.photo,
        naissance_id: animal._raw.naissance_id,
        origine: animal._raw.origine,
        etat_sante: animal._raw.etat_sante,
        farm_source_id: animal._raw.farm_source_id,
        sync_status: animal._raw._status,
        last_modified_by: animal._raw.last_modified_by,
        version: animal._raw.version,
        deleted_at: animal._raw.deleted_at,
        created_at: animal._raw.created_at,
        updated_at: animal._raw.updated_at,
        espece: especeData,
      };
    })
  );

  return animalsWithSpecies as unknown as Animal[];
}

/**
 * Get active males with espece relation loaded (alive and present only)
 */
export async function getLocalActiveMales(farmId: string): Promise<Animal[]> {
  const animals = await database.get('animals')
    .query(Q.where('farm_id', farmId), Q.where('sexe', 'male'))
    .fetch();

  // Filter out dead, sold, or lost animals
  const activeAnimals = animals.filter((animal: any) => {
    const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
    return !excludedStatuses.includes(animal._raw.statut || '');
  });

  // Load espece relations and extract properties correctly
  const animalsWithSpecies = await Promise.all(
    activeAnimals.map(async (animal: any) => {
      const espece = await animal.espece.fetch();
      const especeData = espece._raw ? { id: espece._raw.id, nom: espece._raw.nom } : { id: espece.id, nom: espece.nom };
      return {
        id: animal._raw.id,
        farm_id: animal._raw.farm_id,
        nom: animal._raw.nom,
        race: animal._raw.race,
        sexe: animal._raw.sexe,
        date_naissance: animal._raw.date_naissance,
        poids: animal._raw.poids,
        espece_id: animal._raw.espece_id,
        lot_id: animal._raw.lot_id,
        mother_id: animal._raw.mother_id,
        statut: animal._raw.statut,
        numero_identification: animal._raw.numero_identification,
        photo: animal._raw.photo,
        naissance_id: animal._raw.naissance_id,
        origine: animal._raw.origine,
        etat_sante: animal._raw.etat_sante,
        farm_source_id: animal._raw.farm_source_id,
        sync_status: animal._raw._status,
        last_modified_by: animal._raw.last_modified_by,
        version: animal._raw.version,
        deleted_at: animal._raw.deleted_at,
        created_at: animal._raw.created_at,
        updated_at: animal._raw.updated_at,
        espece: especeData,
      };
    })
  );

  return animalsWithSpecies as unknown as Animal[];
}

// ============================================================================
// FONCTIONS UTILITAIRES DE FILTRE D'ÉLIGIBILITÉ (Règles backend offline-first)
// ============================================================================

/**
 * Filtre les animaux éligibles aux événements sanitaires
 * Règles backend (calcul local pour mobile offline-first) :
 * - VACCINATION : Animaux vivants (statut = 'SAIN' ou 'MALADE')
 * - TRAITEMENT : Animaux malades (statut = 'MALADE')
 * - CONTRÔLE/MALADIE/SURVEILLANCE : Animaux vivants (statut = 'SAIN' ou 'MALADE')
 * 
 * @param animals - Liste des animaux à filtrer
 * @param typeEvenement - Type d'événement sanitaire ('VACCINATION', 'TRAITMENT', 'CONTRÔLE', 'MALADIE', 'SURVEILLANCE')
 * @returns Animaux éligibles
 */
export function filterAnimalsForSanitaire(animals: any[], typeEvenement?: string): any[] {
  return animals.filter((a: any) => {
    const statut = a.statut || '';
    
    // Exclure les animaux morts, vendus ou perdus
    if (['MORT', 'VENDU', 'PERDU'].includes(statut)) {
      return false;
    }

    // Règle spécifique pour TRAITEMENT : uniquement les animaux malades
    if (typeEvenement === 'TRAITMENT' || typeEvenement === 'TRAITEMENT') {
      return statut === 'MALADE';
    }

    // Pour VACCINATION, CONTRÔLE, MALADIE et SURVEILLANCE : animaux vivants (SAIN ou MALADE)
    return ['SAIN', 'MALADE'].includes(statut);
  });
}

/**
 * Filtre les animaux éligibles aux événements de mouvement
 * Règles backend (calcul local pour mobile offline-first) :
 * - VENTE/TRANSFERT/DECES/PERTE/ABATTAGE : Animaux vivants (statut = 'SAIN' ou 'MALADE')
 * 
 * @param animals - Liste des animaux à filtrer
 * @param typeMouvement - Type de mouvement (non utilisé dans le filtre actuel mais inclus pour cohérence)
 * @returns Animaux éligibles
 */
export function filterAnimalsForMouvement(animals: any[], typeMouvement?: string): any[] {
  return animals.filter((a: any) => {
    const statut = a.statut || '';
    
    // Exclure les animaux morts, vendus ou perdus
    if (['MORT', 'VENDU', 'PERDU'].includes(statut)) {
      return false;
    }

    // Pour tous les types de mouvement : animaux vivants (SAIN ou MALADE)
    return ['SAIN', 'MALADE'].includes(statut);
  });
}


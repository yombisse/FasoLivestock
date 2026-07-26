import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord } from './baseRepository';
import { getStadeReproduction } from '../../utils/reproductionState';

export interface EvenementReproductif {
  id: string;
  animal_id: string;
  date_evenement: string;
  type_evenement_id: string;
  categorie: string;
  description?: string;
  veterinaire?: string;
  cout?: number;
  metadonnees?: string;
  farm_id: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function createReproductionEvent(data: Omit<EvenementReproductif, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<EvenementReproductif> {
  console.log('[AUDIT-PROMPT2] Creating reproduction event with categorie value:', {
    categorie: data.categorie,
    categorie_type: typeof data.categorie,
    categorie_length: data.categorie?.length,
    categorie_trimmed: data.categorie?.trim(),
    categorie_upper: data.categorie?.toUpperCase(),
  });
  const result = await createLocalRecord<EvenementReproductif>('evenements', data);
  console.log('[AUDIT] Reproduction event created:', {
    local_id: result.id,
    farm_id: result.farm_id,
    animal_id: result.animal_id,
    type_evenement_id: result.type_evenement_id,
    categorie: result.categorie,
    date_evenement: result.date_evenement,
    metadonnees: result.metadonnees,
    sync_status: (result as any).sync_status,
    _status: (result as any)._status,
  });
  return result;
}

export async function getReproductionEvents(farmId: string, animalId?: string): Promise<EvenementReproductif[]> {
  if (animalId) {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId), Q.where('categorie', 'REPRODUCTION'))
      .fetch();
    return evenements as unknown as EvenementReproductif[];
  } else {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('categorie', 'REPRODUCTION'))
      .fetch();
    return evenements as unknown as EvenementReproductif[];
  }
}

export async function getEvenementReproductifById(id: string): Promise<EvenementReproductif | null> {
  try {
    const evenements = await database.get('evenements')
      .query(Q.where('id', id))
      .fetch();
    
    if (evenements.length > 0) {
      return evenements[0] as unknown as EvenementReproductif;
    }
    return null;
  } catch (error) {
    console.error('[ReproductionRepository] Error getting evenement reproductif by ID:', error);
    return null;
  }
}

export async function getActiveGestations(farmId: string): Promise<EvenementReproductif[]> {
  // Get all reproduction events
  const evenements = await getReproductionEvents(farmId);

  // Get unique animal IDs from reproduction events
  const animalIds = [...new Set(evenements.map(e => e.animal_id))];

  // Check reproduction stage for each animal
  const gestationAnimals: string[] = [];
  for (const animalId of animalIds) {
    try {
      const stage = await getStadeReproduction(animalId);
      if (stage === 'GESTATION') {
        gestationAnimals.push(animalId);
      }
    } catch (error) {
      console.error('[getActiveGestations] Error getting stage for animal', animalId, error);
    }
  }

  // Filter events for animals with GESTATION stage
  const gestationEvents = evenements.filter(e => gestationAnimals.includes(e.animal_id));

  // Sort by date (oldest first) to show those about to give birth
  gestationEvents.sort((a, b) => {
    const dateA = new Date(a.date_evenement).getTime();
    const dateB = new Date(b.date_evenement).getTime();
    return dateA - dateB;
  });

  // Limit to 5 (will be further limited to 2 in HomeScreen)
  return gestationEvents.slice(0, 5);
}

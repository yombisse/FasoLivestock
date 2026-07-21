import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export interface MouvementEvent {
  id: string;
  farm_id: string;
  animal_id: string;
  type_evenement_id: string;
  date_evenement: string;
  description?: string;
  categorie: string;
  statut_avant?: string;
  statut_apres?: string;
  farm_destination_id?: string;
  cout?: number;
  transaction_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Get movement events for a specific animal
 * Filters events with categorie = 'MOUVEMENT'
 */
export async function getMouvementEvents(farmId: string, animalId?: string): Promise<MouvementEvent[]> {
  try {
    const whereConditions = [
      Q.where('farm_id', farmId),
      Q.where('categorie', 'MOUVEMENT'),
    ];

    if (animalId) {
      whereConditions.push(Q.where('animal_id', animalId));
    }

    const events = await database.get('evenements')
      .query(...whereConditions)
      .fetch();
    return events as unknown as MouvementEvent[];
  } catch (error) {
    console.error('[MouvementRepository] Error getting mouvement events:', error);
    return [];
  }
}

/**
 * Get movement events with observable for reactivity
 */
export function observeMouvementEvents(farmId: string, animalId?: string) {
  const whereConditions = [
    Q.where('farm_id', farmId),
    Q.where('categorie', 'MOUVEMENT'),
  ];

  if (animalId) {
    whereConditions.push(Q.where('animal_id', animalId));
  }

  return database.get('evenements')
    .query(...whereConditions)
    .observe();
}

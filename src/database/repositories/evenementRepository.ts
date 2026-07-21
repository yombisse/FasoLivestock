import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { updateAnimalStatusOnEvent } from '../../services/animalStatusService';

export interface Evenement {
  id: string;
  farm_id: string;
  animal_id?: string;
  type_evenement_id: string;
  date_evenement: string;
  description?: string;
  categorie: string;
  statut_avant?: string;
  statut_apres?: string;
  metadonnees?: string;
  cout?: number;
  evenement_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function createEvenement(data: Omit<Evenement, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Evenement> {
  const result = await createLocalRecord<Evenement>('evenements', data);
  console.log('[EvenementRepository] Evenement created successfully with sync_status pending, ID:', result.id);
  console.log('[AUDIT] Evenement creation details:', {
    local_id: result.id,
    farm_id: result.farm_id,
    animal_id: result.animal_id,
    type_evenement_id: result.type_evenement_id,
    categorie: result.categorie,
    date_evenement: result.date_evenement,
    sync_status: (result as any).sync_status,
    _status: (result as any)._status,
    version: (result as any).version,
  });

  // Mettre à jour automatiquement le statut de l'animal si applicable
  if (data.animal_id) {
    try {
      await updateAnimalStatusOnEvent(data.animal_id, data.type_evenement_id);
      console.log('[EvenementRepository] Animal status updated automatically for event type:', data.type_evenement_id);
    } catch (error) {
      console.error('[EvenementRepository] Error updating animal status:', error);
      // Ne pas bloquer la création de l'événement si la mise à jour du statut échoue
    }
  }

  return result;
}

export async function updateEvenement(id: string, data: Partial<Evenement>): Promise<Evenement> {
  return updateLocalRecord<Evenement>('evenements', id, data);
}

export async function deleteEvenement(id: string): Promise<void> {
  return softDeleteLocalRecord('evenements', id);
}

export async function getLocalEvenements(farmId: string, animalId?: string): Promise<Evenement[]> {
  if (animalId) {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId))
      .fetch();
    return evenements as unknown as Evenement[];
  } else {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId))
      .fetch();
    return evenements as unknown as Evenement[];
  }
}

export async function getLocalEvenementById(id: string): Promise<Evenement | null> {
  try {
    const evenements = await database.get('evenements')
      .query(Q.where('id', id))
      .fetch();
    
    if (evenements.length > 0) {
      return evenements[0] as unknown as Evenement;
    }
    return null;
  } catch (error) {
    console.error('[EvenementRepository] Error getting evenement by ID:', error);
    return null;
  }
}

export async function getLocalEvenementsByType(farmId: string, typeEvenementId: string): Promise<Evenement[]> {
  const evenements = await database.get('evenements')
    .query(Q.where('farm_id', farmId), Q.where('type_evenement_id', typeEvenementId))
    .fetch();
  return evenements as unknown as Evenement[];
}

export async function getLocalEvenementsByCategorie(farmId: string, categorie: string): Promise<Evenement[]> {
  const evenements = await database.get('evenements')
    .query(Q.where('farm_id', farmId), Q.where('categorie', categorie))
    .fetch();
  return evenements as unknown as Evenement[];
}

export function observeLocalEvenements(farmId: string, animalId?: string) {
  if (animalId) {
    return database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId))
      .observe();
  } else {
    return database.get('evenements')
      .query(Q.where('farm_id', farmId))
      .observe();
  }
}

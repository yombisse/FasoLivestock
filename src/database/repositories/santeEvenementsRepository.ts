import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord, updateLocalRecord, softDeleteLocalRecord } from './baseRepository';
import { authStorage } from '../../storage/authStorage';
import { TypeEvenementSanitaire } from '../../types/sante.types';
import { updateAnimalStatusOnEvent } from '../../services/animalStatusService';

export interface EvenementSanitaire {
  id: string;
  farm_id: string;
  type_evenement_id: string;
  animal_id: string;
  date_evenement: string;
  description?: string;
  cout?: number;
  categorie: 'SANITAIRE';
  type: TypeEvenementSanitaire;
  metadonnees?: string;
  statut_avant?: 'SAIN' | 'VENDU' | 'MORT' | 'PERDU';
  statut_apres?: 'SAIN' | 'VENDU' | 'MORT' | 'PERDU';
  transaction_id?: string;
  statut?: string;
  date_fin?: string;
  sync_status: 'pending' | 'synced' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export async function getEvenementsSanitaires(farmId: string, animalId?: string): Promise<EvenementSanitaire[]> {
  if (animalId) {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId), Q.where('categorie', 'SANITAIRE'))
      .fetch();
    return evenements as unknown as EvenementSanitaire[];
  } else {
    const evenements = await database.get('evenements')
      .query(Q.where('farm_id', farmId), Q.where('categorie', 'SANITAIRE'))
      .fetch();
    return evenements as unknown as EvenementSanitaire[];
  }
}

export async function getEvenementSanitaireById(id: string): Promise<EvenementSanitaire | null> {
  try {
    const evenements = await database.get('evenements')
      .query(Q.where('id', id))
      .fetch();
    
    if (evenements.length > 0) {
      return evenements[0] as unknown as EvenementSanitaire;
    }
    return null;
  } catch (error) {
    console.error('[SanteEvenementsRepository] Error getting evenement sanitaire by ID:', error);
    return null;
  }
}

export async function getActiveHealthAlerts(farmId: string): Promise<(EvenementSanitaire & { animal_nom?: string; type_nom?: string })[]> {
  const evenements = await getEvenementsSanitaires(farmId);
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentEvents = evenements.filter(e => {
    const eventDate = new Date(e.date_evenement);
    return eventDate >= thirtyDaysAgo && eventDate <= today;
  }).slice(0, 5);
  
  // Load type evenements for name mapping
  const typeEvenements = await database.get('type_evenements').query().fetch();
  
  // Load animal names and type names for each event
  const eventsWithDetails = await Promise.all(
    recentEvents.map(async (event) => {
      // Skip events with invalid animal_id
      if (!event.animal_id || event.animal_id === 'undefined') {
        const typeEvenement = typeEvenements.find((t: any) => t.id === event.type_evenement_id);
        return {
          ...event,
          animal_nom: 'Animal inconnu (ID manquant)',
          type_nom: (typeEvenement as any)?.nom_type || event.type,
        };
      }
      
      let animalNom = 'Animal inconnu';
      try {
        const animal = await database.get('animals').find(event.animal_id);
        animalNom = (animal as any).nom || 'Animal inconnu';
      } catch {
        animalNom = 'Animal inconnu';
      }
      
      const typeEvenement = typeEvenements.find((t: any) => t.id === event.type_evenement_id);
      
      return {
        ...event,
        animal_nom: animalNom,
        type_nom: (typeEvenement as any)?.nom_type || event.type,
      };
    })
  );
  
  return eventsWithDetails;
}

export async function createEvenementSanitaire(data: Omit<EvenementSanitaire, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<EvenementSanitaire> {
  const userId = await authStorage.getUserId();
  const result = await createLocalRecord('evenements', {
    ...data,
    categorie: 'SANITAIRE',
    last_modified_by: data.last_modified_by || userId,
  });

  console.log('[AUDIT] Santé event created:', {
    local_id: (result as any).id,
    farm_id: (result as any).farm_id,
    animal_id: (result as any).animal_id,
    type_evenement_id: (result as any).type_evenement,
    categorie: 'SANITAIRE',
    date_evenement: (result as any).date_evenement,
    sync_status: (result as any).sync_status,
    _status: (result as any)._status,
    version: (result as any).version,
  });

  // Mettre à jour automatiquement le statut de l'animal si applicable
  try {
    await updateAnimalStatusOnEvent(data.animal_id, data.type_evenement_id);
    console.log('[SanteEvenementsRepository] Animal status updated automatically for event type:', data.type_evenement_id);
  } catch (error) {
    console.error('[SanteEvenementsRepository] Error updating animal status:', error);
    // Ne pas bloquer la création de l'événement si la mise à jour du statut échoue
  }

  return result as unknown as EvenementSanitaire;
}

export async function updateEvenementSanitaire(id: string, data: Partial<EvenementSanitaire>): Promise<EvenementSanitaire> {
  return updateLocalRecord<EvenementSanitaire>('evenements', id, data);
}

export async function deleteEvenementSanitaire(id: string): Promise<void> {
  return softDeleteLocalRecord('evenements', id);
}

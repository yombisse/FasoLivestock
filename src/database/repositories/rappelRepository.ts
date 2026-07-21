import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { createLocalRecord } from './baseRepository';

export interface Rappel {
  id: string;
  farm_id: string;
  animal_id: string;
  type_rappel: 'VACCINATION' | 'TRAITEMENT' | 'CONTROLE' | 'MISE_BAS' | 'CHALEUR';
  date_prevue: string;
  date_realisee?: string;
  statut: 'EN_ATTENTE' | 'REALISE' | 'EN_RETARD';
  note?: string;
  evenement_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export async function getRappels(farmId: string, animalId?: string): Promise<Rappel[]> {
  if (animalId) {
    const rappels = await database.get('sante_rappels')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId), Q.where('deleted_at', null))
      .fetch();
    return rappels as unknown as Rappel[];
  } else {
    const rappels = await database.get('sante_rappels')
      .query(Q.where('farm_id', farmId), Q.where('deleted_at', null))
      .fetch();
    return rappels as unknown as Rappel[];
  }
}

export async function getRappelsByStatut(farmId: string, statut: 'EN_ATTENTE' | 'REALISE' | 'EN_RETARD'): Promise<Rappel[]> {
  const rappels = await database.get('sante_rappels')
    .query(Q.where('farm_id', farmId), Q.where('statut', statut), Q.where('deleted_at', null))
    .fetch();
  return rappels as unknown as Rappel[];
}

export async function getRappelsByType(farmId: string, typeRappel: string): Promise<Rappel[]> {
  const rappels = await database.get('sante_rappels')
    .query(Q.where('farm_id', farmId), Q.where('type_rappel', typeRappel), Q.where('deleted_at', null))
    .fetch();
  return rappels as unknown as Rappel[];
}

export async function getRappelsEnRetard(farmId: string): Promise<Rappel[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const rappels = await database.get('sante_rappels')
    .query(
      Q.where('farm_id', farmId),
      Q.where('statut', 'EN_ATTENTE'),
      Q.where('date_prevue', Q.lt(todayStr)),
      Q.where('deleted_at', null)
    )
    .fetch();
  
  // Update status to EN_RETARD locally
  await database.write(async () => {
    for (const rappel of rappels) {
      await rappel.update((r: any) => {
        r.statut = 'EN_RETARD';
      });
    }
  });
  
  return rappels as unknown as Rappel[];
}

export async function getRappelsAVenir(farmId: string, jours: number = 7): Promise<Rappel[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const futureDate = new Date(today.getTime() + jours * 24 * 60 * 60 * 1000);
  const futureStr = futureDate.toISOString().split('T')[0];
  
  const rappels = await database.get('sante_rappels')
    .query(
      Q.where('farm_id', farmId),
      Q.where('statut', 'EN_ATTENTE'),
      Q.where('date_prevue', Q.gte(todayStr)),
      Q.where('date_prevue', Q.lte(futureStr)),
      Q.where('deleted_at', null)
    )
    .fetch();
    
  return rappels as unknown as Rappel[];
}

export async function getRappelById(id: string): Promise<Rappel | null> {
  try {
    const rappels = await database.get('sante_rappels')
      .query(Q.where('id', id), Q.where('deleted_at', null))
      .fetch();
    
    if (rappels.length > 0) {
      return rappels[0] as unknown as Rappel;
    }
    return null;
  } catch (error) {
    console.error('[RappelRepository] Error getting rappel by ID:', error);
    return null;
  }
}

export async function createRappel(data: Omit<Rappel, 'id' | 'sync_status' | 'version' | 'created_at' | 'updated_at'>): Promise<Rappel> {
  return createLocalRecord<Rappel>('sante_rappels', data);
}

export async function updateRappelStatut(rappelId: string, statut: 'EN_ATTENTE' | 'REALISE' | 'EN_RETARD', dateRealisee?: string, evenementId?: string): Promise<void> {
  await database.write(async () => {
    const rappel = await database.get('sante_rappels').find(rappelId);
    await rappel.update((r: any) => {
      r.statut = statut;
      if (dateRealisee) {
        r.date_realisee = dateRealisee;
      }
      if (evenementId) {
        r.evenement_id = evenementId;
      }
      r.version = r.version + 1;
    });
  });
}

export async function reprogrammerRappel(rappelId: string, nouvelleDate: string): Promise<void> {
  await database.write(async () => {
    const rappel = await database.get('sante_rappels').find(rappelId);
    await rappel.update((r: any) => {
      r.date_prevue = nouvelleDate;
      r.statut = 'EN_ATTENTE'; // Repasse à EN_ATTENTE si c'était EN_RETARD
      r.version = r.version + 1;
    });
  });
}

export async function deleteRappel(rappelId: string): Promise<void> {
  await database.write(async () => {
    const rappel = await database.get('sante_rappels').find(rappelId);
    await rappel.update((r: any) => {
      r.deleted_at = new Date().getTime();
    });
  });
}

// Helper function to calculate days remaining
export function calculateJoursRestants(datePrevue: string): number {
  const today = new Date();
  const date = new Date(datePrevue);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper function to calculate days overdue
export function calculateJoursRetard(datePrevue: string): number {
  const today = new Date();
  const date = new Date(datePrevue);
  return Math.ceil((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper function to get urgency color
export function getUrgenceColor(rappel: Rappel): string {
  if (rappel.statut === 'EN_RETARD') return '#D32F2F'; // red
  const jours = calculateJoursRestants(rappel.date_prevue);
  if (jours <= 3) return '#F57C00'; // orange
  if (jours <= 7) return '#FBC02D'; // yellow
  return '#2E7D32'; // green
}

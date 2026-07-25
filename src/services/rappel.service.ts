import api from './api';
import database from '../database/watermelonIndex';
import { updateRappelStatut, reprogrammerRappel } from '../database/repositories/rappelRepository';
import { createLocalRecord } from '../database/repositories/baseRepository';

export interface MarquerRealiseRequest {
  farm_id: string;
  animal_id: string;
  type_evenement_id: string;
  date_evenement?: string;
  description?: string;
  cout?: number;
}

export interface ReprogrammerRequest {
  nouvelle_date: string;
}

/**
 * Marque un rappel comme réalisé en créant un événement sanitaire localement
 * et en mettant à jour le rappel avec l'ID de l'événement.
 * Conforme offline-first : les modifications seront poussées via /sync/push.
 */
export async function marquerRappelRealise(rappelId: string, data: MarquerRealiseRequest, userId?: string) {
  try {
    // 1. Créer l'événement sanitaire localement (le backend ne le recréera pas)
    const evenement = await createLocalRecord('evenements', {
      farm_id: data.farm_id,
      animal_id: data.animal_id,
      type_evenement_id: data.type_evenement_id,
      categorie: 'SANITAIRE',
      date_evenement: data.date_evenement || new Date().toISOString().split('T')[0],
      description: data.description || 'Réalisation du rappel',
      cout: data.cout || 0,
      sync_status: 'pending',
      version: 1,
      last_modified_by: userId,
    });

    // 2. Mettre à jour le rappel avec l'ID de l'événement créé
    await database.write(async () => {
      const rappel = await database.get('sante_rappels').find(rappelId);
      await rappel.update((r: any) => {
        r.statut = 'REALISE';
        r.date_realisee = data.date_evenement || new Date().toISOString().split('T')[0];
        r.evenement_id = evenement.id; // Lier à l'événement créé localement
        r.sync_status = 'pending';
        r.version = r.version + 1;
        r.last_modified_by = userId;
      });
    });

    console.log('[RappelService] Rappel marked as realized (offline-first):', rappelId, 'event:', evenement.id);
    return { success: true, rappelId, evenementId: evenement.id };
  } catch (error) {
    console.error('[RappelService] Error marking rappel as realized:', error);
    throw error;
  }
}

/**
 * Reprogramme un rappel à une nouvelle date.
 * Conforme offline-first : la modification sera poussée via /sync/push.
 * Le backend recalculera automatiquement le statut (EN_ATTENTE ou EN_RETARD).
 */
export async function reprogrammerRappelAPI(rappelId: string, nouvelleDate: string, userId?: string) {
  try {
    // Mettre à jour date_prevue localement
    // Le backend recalculera automatiquement le statut (EN_ATTENTE ou EN_RETARD)
    await database.write(async () => {
      const rappel = await database.get('sante_rappels').find(rappelId);
      await rappel.update((r: any) => {
        r.date_prevue = nouvelleDate;
        r.statut = 'EN_ATTENTE'; // Le backend recalculera si la date est passée
        r.sync_status = 'pending';
        r.version = r.version + 1;
        r.last_modified_by = userId;
      });
    });

    console.log('[RappelService] Rappel rescheduled (offline-first):', rappelId, nouvelleDate);
    return { success: true, rappelId, nouvelleDate };
  } catch (error) {
    console.error('[RappelService] Error rescheduling rappel:', error);
    throw error;
  }
}

// NOTE: Les fonctions getRappelsAPI, getRappelsAVenirAPI et getRappelsEnRetardAPI ont été supprimées
// car les rappels sont synchronisés via /sync/pull et doivent être lus localement depuis WatermelonDB.
// Utilisez les fonctions de rappelRepository.ts à la place :
// - getRappels()
// - getRappelsByStatut()
// - getRappelsByType()
// - getRappelsEnRetard()
// - getRappelsAVenir()

/**
 * Supprime (soft delete) un rappel sanitaire.
 * Conforme offline-first : la suppression sera poussée via /sync/push.
 * L'événement associé (si existant) n'est PAS supprimé automatiquement.
 */
export async function deleteRappelAPI(rappelId: string, userId?: string) {
  try {
    // Soft delete local avec sync_status='pending' et version incrémenté
    await database.write(async () => {
      const rappel = await database.get('sante_rappels').find(rappelId);
      await rappel.update((r: any) => {
        r.deleted_at = new Date(); // Soft delete
        r.sync_status = 'pending';
        r.version = r.version + 1;
        r.last_modified_by = userId;
      });
    });

    console.log('[RappelService] Rappel soft-deleted (offline-first):', rappelId);
    return { success: true, rappelId };
  } catch (error) {
    console.error('[RappelService] Error deleting rappel:', error);
    throw error;
  }
}

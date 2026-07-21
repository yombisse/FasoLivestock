import api from './api';
import database from '../database/watermelonIndex';
import { updateRappelStatut, reprogrammerRappel } from '../database/repositories/rappelRepository';

export interface MarquerRealiseRequest {
  type_evenement_id: string;
  date_evenement?: string;
  description?: string;
  cout?: number;
}

export interface ReprogrammerRequest {
  nouvelle_date: string;
}

export async function marquerRappelRealise(rappelId: string, data: MarquerRealiseRequest) {
  try {
    const response = await api.post(`/sante/rappels/${rappelId}/marquer-realise`, {
      type_evenement_id: data.type_evenement_id,
      date_evenement: data.date_evenement || new Date().toISOString().split('T')[0],
      description: data.description || 'Réalisation du rappel',
      cout: data.cout || 0,
    });

    // Update local rappel
    await updateRappelStatut(
      rappelId,
      'REALISE',
      data.date_evenement || new Date().toISOString().split('T')[0],
      response.data.data.evenement.id
    );

    return response.data;
  } catch (error) {
    console.error('[RappelService] Error marking rappel as realized:', error);
    throw error;
  }
}

export async function reprogrammerRappelAPI(rappelId: string, nouvelleDate: string) {
  try {
    const response = await api.post(`/sante/rappels/${rappelId}/reprogrammer`, {
      nouvelle_date: nouvelleDate,
    });

    // Update local rappel
    await reprogrammerRappel(rappelId, nouvelleDate);

    return response.data;
  } catch (error) {
    console.error('[RappelService] Error rescheduling rappel:', error);
    throw error;
  }
}

export async function getRappelsAPI(params?: {
  animal_id?: string;
  type_rappel?: string;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
  en_retard?: boolean;
  per_page?: number;
}) {
  try {
    const response = await api.get('/sante/rappels', { params });
    return response.data;
  } catch (error) {
    console.error('[RappelService] Error fetching rappels:', error);
    throw error;
  }
}

export async function getRappelsAVenirAPI(jours: number = 7) {
  try {
    const response = await api.get('/sante/rappels/a-venir', { params: { jours } });
    return response.data;
  } catch (error) {
    console.error('[RappelService] Error fetching upcoming rappels:', error);
    throw error;
  }
}

export async function getRappelsEnRetardAPI() {
  try {
    const response = await api.get('/sante/rappels/en-retard');
    return response.data;
  } catch (error) {
    console.error('[RappelService] Error fetching overdue rappels:', error);
    throw error;
  }
}

export async function deleteRappelAPI(rappelId: string) {
  try {
    const response = await api.delete(`/sante/rappels/${rappelId}`);
    
    // Soft delete local rappel
    await database.write(async () => {
      const rappel = await database.get('sante_rappels').find(rappelId);
      await rappel.update((r: any) => {
        r.deleted_at = new Date().getTime();
      });
    });

    return response.data;
  } catch (error) {
    console.error('[RappelService] Error deleting rappel:', error);
    throw error;
  }
}

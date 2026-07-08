import { getDatabase } from '../connection';

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
  type_nom?: string;
  animal_nom?: string;
  animal_numero?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get movement events for a specific animal (category = MOUVEMENT only)
 */
export async function getMouvementEvents(farmId: string, animalId: string): Promise<MouvementEvent[]> {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      `SELECT e.*, te.nom_type as type_nom, a.nom as animal_nom, a.numero_identification as animal_numero 
       FROM evenements e 
       LEFT JOIN type_evenements te ON e.type_evenement_id = te.id 
       LEFT JOIN animals a ON e.animal_id = a.id 
       WHERE e.farm_id = ? AND e.animal_id = ? AND e.categorie = 'MOUVEMENT' AND e.deleted_at IS NULL 
       ORDER BY e.date_evenement DESC`,
      [farmId, animalId]
    );

    // Helper to get rows from op-sqlite result
    const getRows = (result: any) => {
      if (!result) return [];
      if (result.rows) return result.rows as any[];
      if (Array.isArray(result)) return result as any[];
      return [];
    };

    const events = getRows(result) as MouvementEvent[];
    return events;
  } catch (error) {
    console.error('[MouvementRepository] Error fetching mouvement events:', error);
    throw error;
  }
}

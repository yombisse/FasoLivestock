import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export type StadeReproduction = 'LIBRE' | 'SAILLIE' | 'GESTATION';

/**
 * Détermine le stade de reproduction d'un animal basé sur son dernier événement reproductif
 * @param animalId - ID de l'animal
 * @returns Stade de reproduction : LIBRE, SAILLIE, ou GESTATION
 */
export async function getStadeReproduction(animalId: string): Promise<StadeReproduction> {
  try {
    // Récupérer TOUS les événements reproductifs de l'animal pour audit
    const allEvents = await database.get('evenements')
      .query(
        Q.where('animal_id', animalId),
        Q.where('categorie', 'REPRODUCTION'),
        Q.sortBy('date_evenement', Q.desc),
        Q.sortBy('created_at', Q.desc)
      )
      .fetch();

    console.log('[getStadeReproduction] Animal ID:', animalId, 'All reproduction events:', allEvents.length);
    allEvents.forEach((e: any, idx: number) => {
      console.log(`[getStadeReproduction] Event ${idx}: ID=${e.id}, type_evenement_id=${e.type_evenement_id}, date_evenement=${e.date_evenement}, created_at=${e.created_at}, categorie=${e.categorie}`);
    });

    // Récupérer le dernier événement reproductif de l'animal
    // Tri par date_evenement DESC, puis par created_at DESC pour gérer les événements avec même date
    const events = await database.get('evenements')
      .query(
        Q.where('animal_id', animalId),
        Q.where('categorie', 'REPRODUCTION'),
        Q.sortBy('date_evenement', Q.desc),
        Q.sortBy('created_at', Q.desc),
        Q.take(1)
      )
      .fetch();

    if (events.length === 0) {
      console.log('[getStadeReproduction] No reproduction events, returning LIBRE');
      return 'LIBRE';
    }

    const lastEvent = events[0];
    const typeEvenementId = lastEvent.type_evenement_id;
    const categorieValue = (lastEvent as any).categorie;

    console.log('[AUDIT-PROMPT2] Reading categorie from database in getStadeReproduction:', {
      categorie: categorieValue,
      categorie_type: typeof categorieValue,
      categorie_length: categorieValue?.length,
      categorie_trimmed: categorieValue?.trim(),
      categorie_upper: categorieValue?.toUpperCase(),
      event_id: lastEvent.id,
    });

    // Charger les types d'événements pour mapper l'ID au nom
    const typeEvenements = await database.get('type_evenements').query().fetch();
    const typeMap = new Map(typeEvenements.map((t: any) => [t.id, t.nom_type]));

    const typeName = typeMap.get(typeEvenementId) || '';

    console.log('[getStadeReproduction] Last event type ID:', typeEvenementId, 'Type name:', typeName);
    console.log('[getStadeReproduction] All available type names:', Array.from(typeMap.values()));

    // Déterminer le stade selon le type du dernier événement
    // Normaliser la casse pour éviter les problèmes de comparaison
    const normalizedTypeName = typeof typeName === 'string' ? typeName.toLowerCase().trim() : '';

    console.log('[getStadeReproduction] Normalized type name:', normalizedTypeName);

    if (normalizedTypeName === 'saillie') {
      console.log('[getStadeReproduction] Returning SAILLIE');
      return 'SAILLIE';
    } else if (normalizedTypeName === 'gestation' || normalizedTypeName === 'gestation') {
      console.log('[getStadeReproduction] Returning GESTATION');
      return 'GESTATION';
    } else if (normalizedTypeName === 'mise bas' || normalizedTypeName === 'mise_bas' || normalizedTypeName === 'mise-bas') {
      console.log('[getStadeReproduction] Mise bas detected, returning LIBRE');
      return 'LIBRE'; // Après une mise bas, l'animal est libre
    } else {
      console.log('[getStadeReproduction] Unknown type:', normalizedTypeName, 'returning LIBRE');
      return 'LIBRE'; // Autres types reproductifs = LIBRE
    }
  } catch (error) {
    console.error('[getStadeReproduction] Error:', error);
    return 'LIBRE'; // En cas d'erreur, considérer l'animal comme LIBRE
  }
}

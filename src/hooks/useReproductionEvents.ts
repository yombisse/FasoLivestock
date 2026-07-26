import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { EvenementReproductif } from '../types/reproduction.types';
import { TypeEvenementIds } from '../constants/typeEvenements';

export function useReproductionEvents(farmId: string, animalId?: string) {
  const [events, setEvents] = useState<EvenementReproductif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useReproductionEvents] useEffect called with farmId:', farmId, 'animalId:', animalId);
    if (!farmId) {
      console.log('[useReproductionEvents] No farmId provided');
      setLoading(false);
      return;
    }

    if (!animalId) {
      console.log('[useReproductionEvents] No animalId provided, returning empty');
      setEvents([]);
      setLoading(false);
      return;
    }

    // Filter by type_evenement_id (reproduction types)
    const reproductionTypeIds = [
      TypeEvenementIds.CHALEUR,
      TypeEvenementIds.SAILLIE,
      TypeEvenementIds.GESTATION,
      TypeEvenementIds.MISE_BAS,
      TypeEvenementIds.NAISSANCE,
    ];
    
    const query = database.get('evenements').query(
      Q.where('farm_id', farmId),
      Q.where('type_evenement_id', Q.oneOf(reproductionTypeIds)),
      Q.where('animal_id', animalId)
    );

    // DEBUG: Check all events in database
    database.get('evenements').query().fetch().then(allEvents => {
      console.log('[useReproductionEvents] DEBUG - Total events in DB:', allEvents.length);
      console.log('[useReproductionEvents] DEBUG - Events by categorie:', allEvents.reduce((acc, e) => {
        const cat = (e as any).categorie;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useReproductionEvents] DEBUG - Events by farm_id:', allEvents.reduce((acc, e) => {
        const fid = (e as any).farm_id;
        acc[fid] = (acc[fid] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useReproductionEvents] DEBUG - Sample event categories:', allEvents.slice(0, 5).map(e => ({
        id: e.id,
        categorie: (e as any).categorie,
        type_evenement_id: (e as any).type_evenement_id
      })));
    });

    const subscription = query.observe().subscribe(async (collection) => {
      console.log('[useReproductionEvents] Collection updated:', {
        farmId: farmId,
        animalId: animalId,
        count: collection.length,
        timestamp: new Date().toISOString(),
      });

      // Load animal names for all events
      const eventsWithAnimalNames = await Promise.all(
        collection.map(async (event: any) => {
          let animalName = 'Animal inconnu';
          try {
            const animal = await database.get('animals').find(event.animal_id);
            animalName = (animal as any).nom || 'Animal inconnu';
          } catch (error) {
            console.log('[useReproductionEvents] Animal not found:', event.animal_id);
          }

          return {
            id: event.id,
            animal_id: event.animal_id,
            animal_nom: animalName,
            male_id: (event as any).male_id,
            date_evenement: event.date_evenement,
            type_evenement_id: event.type_evenement_id,
            categorie: event.categorie,
            description: event.description,
            cout: event.cout,
            metadonnees: event.metadonnees,
            farm_id: event.farm_id,
            sync_status: event.sync_status as 'synced' | 'pending' | 'conflict',
            last_modified_by: event.last_modified_by,
            version: event.version,
            created_at: event.createdAt?.toISOString() || event.created_at,
            updated_at: event.updatedAt?.toISOString() || event.updated_at,
            deleted_at: event.deletedAt?.toISOString() || event.deleted_at,
          };
        })
      );

      // Remove duplicates based on id
      const uniqueEvents = eventsWithAnimalNames.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      console.log('[useReproductionEvents] Unique events count:', uniqueEvents.length, 'out of', eventsWithAnimalNames.length);

      setEvents(uniqueEvents);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [farmId, animalId]);

  return { events, loading };
}

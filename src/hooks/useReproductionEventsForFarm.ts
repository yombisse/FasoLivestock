import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { TypeEvenementIds } from '../constants/typeEvenements';

/**
 * Hook for fetching ALL reproduction events for a farm (all animals combined).
 * Used in farm-wide screens like ReproductionScreen (bottom tab).
 * 
 * For per-animal history screens, use useReproductionEvents instead.
 */
export function useReproductionEventsForFarm(farmId: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useReproductionEventsForFarm] useEffect called with farmId:', farmId);
    if (!farmId) {
      console.log('[useReproductionEventsForFarm] No farmId provided');
      setLoading(false);
      return;
    }

    // Filter by type_evenement_id (reproduction types) - no animal_id filter
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
      Q.sortBy('date_evenement', Q.desc)
    );

    // DEBUG: Check all events in database
    database.get('evenements').query().fetch().then(allEvents => {
      console.log('[useReproductionEventsForFarm] DEBUG - Total events in DB:', allEvents.length);
      console.log('[useReproductionEventsForFarm] DEBUG - Events by categorie:', allEvents.reduce((acc, e) => {
        const cat = (e as any).categorie;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useReproductionEventsForFarm] DEBUG - Events by farm_id:', allEvents.reduce((acc, e) => {
        const fid = (e as any).farm_id;
        acc[fid] = (acc[fid] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useReproductionEventsForFarm] DEBUG - Sample event categories:', allEvents.slice(0, 5).map(e => ({
        id: e.id,
        categorie: (e as any).categorie,
        type_evenement_id: (e as any).type_evenement_id
      })));
    });

    const subscription = query.observe().subscribe((collection) => {
      console.log('[useReproductionEventsForFarm] Collection updated:', {
        farmId: farmId,
        count: collection.length,
        timestamp: new Date().toISOString(),
      });

      // Convert WatermelonDB Evenement to TypeScript EvenementReproductif type
      const convertedEvents = collection.map((event) => ({
        id: event.id,
        animal_id: (event as any).animal_id,
        male_id: (event as any).male_id,
        date_evenement: (event as any).date_evenement,
        type_evenement_id: (event as any).type_evenement_id,
        categorie: (event as any).categorie,
        description: (event as any).description,
        cout: (event as any).cout,
        metadonnees: (event as any).metadonnees,
        farm_id: (event as any).farm_id,
        sync_status: (event as any).sync_status as 'synced' | 'pending' | 'conflict',
        last_modified_by: (event as any).last_modified_by,
        version: (event as any).version,
        created_at: (event as any).createdAt?.toISOString() || (event as any).created_at,
        updated_at: (event as any).updatedAt?.toISOString() || (event as any).updated_at,
        deleted_at: (event as any).deletedAt ? (event as any).deletedAt.toISOString() : (event as any).deleted_at,
      }));

      // Remove duplicates based on id
      const uniqueEvents = convertedEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      console.log('[useReproductionEventsForFarm] Unique events count:', uniqueEvents.length, 'out of', convertedEvents.length);

      setEvents(uniqueEvents);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { events, loading };
}

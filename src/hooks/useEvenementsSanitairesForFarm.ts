import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { EvenementSanitaire } from '../types/sante.types';

/**
 * Hook for fetching ALL sanitary events for a farm (all animals combined).
 * Used in farm-wide screens like SanteScreen (bottom tab).
 * 
 * For per-animal history screens, use useEvenementsSanitaires instead.
 */
export function useEvenementsSanitairesForFarm(farmId: string) {
  const [events, setEvents] = useState<EvenementSanitaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useEvenementsSanitairesForFarm] useEffect called with farmId:', farmId);
    if (!farmId) {
      console.log('[useEvenementsSanitairesForFarm] No farmId provided');
      setLoading(false);
      return;
    }

    // Filter by farm_id and categorie only - no animal_id filter
    const query = database.get('evenements').query(
      Q.where('farm_id', farmId),
      Q.where('categorie', 'SANITAIRE'),
      Q.sortBy('date_evenement', Q.desc)
    );

    // DEBUG: Check all events in database
    database.get('evenements').query().fetch().then(allEvents => {
      console.log('[useEvenementsSanitairesForFarm] DEBUG - Total events in DB:', allEvents.length);
      console.log('[useEvenementsSanitairesForFarm] DEBUG - Events by categorie:', allEvents.reduce((acc, e) => {
        const cat = (e as any).categorie;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useEvenementsSanitairesForFarm] DEBUG - Events by farm_id:', allEvents.reduce((acc, e) => {
        const fid = (e as any).farm_id;
        acc[fid] = (acc[fid] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useEvenementsSanitairesForFarm] DEBUG - Sample event categories:', allEvents.slice(0, 5).map(e => ({
        id: e.id,
        categorie: (e as any).categorie,
        type_evenement_id: (e as any).type_evenement_id
      })));
    });

    const subscription = query.observe().subscribe((collection) => {
      console.log('[useEvenementsSanitairesForFarm] Collection updated:', {
        farmId: farmId,
        count: collection.length,
        timestamp: new Date().toISOString(),
      });

      if (collection.length > 0) {
        console.log('[useEvenementsSanitairesForFarm] SAMPLE EVENT FROM DB:', collection[0]);
      }

      // Convert WatermelonDB Evenement to TypeScript EvenementSanitaire type
      const convertedEvents = collection.map((event) => ({
        id: event.id,
        farm_id: (event as any).farm_id,
        type_evenement_id: (event as any).type_evenement_id,
        animal_id: (event as any).animal_id,
        date_evenement: (event as any).date_evenement,
        description: (event as any).description,
        cout: (event as any).cout,
        categorie: (event as any).categorie as 'SANITAIRE',
        type: (event as any).type as any,
        metadonnees: (event as any).metadonnees,
        statut_avant: (event as any).statut_avant as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        statut_apres: (event as any).statut_apres as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        transaction_id: (event as any).transaction_id,
        statut: (event as any).statut,
        date_fin: (event as any).date_fin,
        sync_status: (event as any).sync_status as 'synced' | 'pending' | 'conflict',
        last_modified_by: (event as any).last_modified_by,
        version: (event as any).version,
        created_at: (event as any).createdAt?.toISOString() || (event as any).created_at,
        updated_at: (event as any).updatedAt?.toISOString() || (event as any).updated_at,
        deleted_at: (event as any).deletedAt?.toISOString() || (event as any).deleted_at,
      }));

      // Remove duplicates based on id
      const uniqueEvents = convertedEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      console.log('[useEvenementsSanitairesForFarm] Unique events count:', uniqueEvents.length, 'out of', convertedEvents.length);

      setEvents(uniqueEvents);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { events, loading };
}

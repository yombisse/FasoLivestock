import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { EvenementSanitaire } from '../types/sante.types';

export function useEvenementsSanitaires(farmId: string, animalId?: string) {
  const [events, setEvents] = useState<EvenementSanitaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useEvenementsSanitaires] useEffect called with farmId:', farmId, 'animalId:', animalId);
    if (!farmId) {
      console.log('[useEvenementsSanitaires] No farmId provided');
      setLoading(false);
      return;
    }

    // Filter by categorie (correctly synced from backend) instead of type_evenement_id (IDs don't match constants)
    const query = database.get('evenements').query(
      Q.where('farm_id', farmId),
      Q.where('categorie', 'SANITAIRE')
    );
    if (animalId) {
      query.extend(Q.where('animal_id', animalId));
    }

    // DEBUG: Check all events in database
    database.get('evenements').query().fetch().then(allEvents => {
      console.log('[useEvenementsSanitaires] DEBUG - Total events in DB:', allEvents.length);
      console.log('[useEvenementsSanitaires] DEBUG - Events by categorie:', allEvents.reduce((acc, e) => {
        const cat = (e as any).categorie;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useEvenementsSanitaires] DEBUG - Events by farm_id:', allEvents.reduce((acc, e) => {
        const fid = (e as any).farm_id;
        acc[fid] = (acc[fid] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('[useEvenementsSanitaires] DEBUG - Sample event categories:', allEvents.slice(0, 5).map(e => ({
        id: e.id,
        categorie: (e as any).categorie,
        type_evenement_id: (e as any).type_evenement_id
      })));
    });

    const subscription = query.observe().subscribe((collection) => {
      console.log('[useEvenementsSanitaires] Collection updated:', {
        farmId: farmId,
        animalId: animalId,
        count: collection.length,
        timestamp: new Date().toISOString(),
      });

      if (collection.length > 0) {
        console.log('[useEvenementsSanitaires] SAMPLE EVENT FROM DB:', collection[0]);
      }

      // Convert WatermelonDB Evenement to TypeScript EvenementSanitaire type
      const convertedEvents = collection.map((event) => ({
        id: event.id,
        farm_id: event.farm_id,
        type_evenement_id: event.type_evenement_id,
        animal_id: event.animal_id,
        date_evenement: event.date_evenement,
        description: event.description,
        cout: event.cout,
        categorie: event.categorie as 'SANITAIRE',
        type: event.type as any,
        metadonnees: event.metadonnees,
        statut_avant: event.statut_avant as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        statut_apres: event.statut_apres as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
        transaction_id: event.transaction_id,
        statut: event.statut,
        date_fin: event.date_fin,
        sync_status: event.sync_status as 'synced' | 'pending' | 'conflict',
        last_modified_by: event.last_modified_by,
        version: event.version,
        created_at: event.createdAt?.toISOString() || event.created_at,
        updated_at: event.updatedAt?.toISOString() || event.updated_at,
        deleted_at: event.deletedAt?.toISOString() || event.deleted_at,
      }));

      // Remove duplicates based on id
      const uniqueEvents = convertedEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      console.log('[useEvenementsSanitaires] Unique events count:', uniqueEvents.length, 'out of', convertedEvents.length);

      setEvents(uniqueEvents);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [farmId, animalId]);

  return { events, loading };
}

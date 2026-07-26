import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { Animal as WatermelonAnimal } from '../database/models/Animal';
import { Animal } from '../types/animal.types';

export function useAnimals(farmId: string) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AUDIT] useAnimals - useEffect called with farmId:', farmId);
    if (!farmId) {
      console.log('[useAnimals] No farmId provided');
      setLoading(false);
      return;
    }

    const subscription = database
      .get<WatermelonAnimal>('animals')
      .query(
        Q.where('farm_id', farmId),
        Q.where('deleted_at', null),
        Q.sortBy('created_at', Q.desc)
      )
      .observeWithColumns(['espece_id'])
      .subscribe((collection) => {
        console.log('[AUDIT] useAnimals - Collection updated:', {
          farmId: farmId,
          count: collection.length,
          timestamp: new Date().toISOString(),
        });
        console.log('[useAnimals] Loaded animals:', collection.length);
        if (collection.length === 0) {
          console.warn('[useAnimals] No animals found for farm:', farmId);
        }
        // Convert WatermelonDB Animal to TypeScript Animal type
        const convertedAnimals = collection.map((animal) => ({
          id: animal.id,
          farm_id: animal.farm_id,
          nom: animal.nom,
          race: animal.race,
          sexe: animal.sexe as 'male' | 'femelle',
          date_naissance: animal.date_naissance,
          poids: animal.poids,
          espece_id: animal.espece_id,
          lot_id: animal.lot_id,
          mother_id: animal.mother_id,
          statut: animal.statut,
          numero_identification: animal.numero_identification,
          photo: animal.photo,
          naissance_id: animal.naissance_id,
          origine: animal.origine as 'enregistrement' | 'achat' | 'naissance',
          etat_sante: animal.etat_sante as 'SAIN' | 'MALADE' | 'QUARANTAINE',
          farm_source_id: animal.farm_source_id,
          sync_status: animal.sync_status,
          last_modified_by: animal.last_modified_by,
          version: animal.version,
          deleted_at: animal.deletedAt ? animal.deletedAt.toISOString() : null,
          created_at: animal.createdAt.toISOString(),
          updated_at: animal.updatedAt.toISOString(),
          espece: animal.espece ? {
            id: animal.espece.id,
            nom: animal.espece.nom,
          } : undefined,
        }));
        setAnimals(convertedAnimals);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { animals, loading };
}

import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { Evenement } from '../database/models/Evenement';

export function useEvenements(farmId: string, animalId?: string) {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query;
    if (animalId) {
      query = database.get<Evenement>('evenements').query(
        Q.where('farm_id', farmId),
        Q.where('animal_id', animalId)
      );
    } else {
      query = database.get<Evenement>('evenements').query(
        Q.where('farm_id', farmId)
      );
    }

    const subscription = query
      .observe()
      .subscribe((collection) => {
        setEvenements(collection);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId, animalId]);

  return { evenements, loading };
}

import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export function useNaissances(farmId: string, animalId?: string) {
  const [naissances, setNaissances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!farmId) {
      setNaissances([]);
      setLoading(false);
      return;
    }

    let query;
    if (animalId) {
      query = database.get('naissances').query(
        Q.where('farm_id', farmId),
        Q.where('mother_id', animalId)
      );
    } else {
      query = database.get('naissances').query(Q.where('farm_id', farmId));
    }

    const subscription = query
      .observe()
      .subscribe((data) => {
        setNaissances(data);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId, animalId]);

  return { naissances, loading };
}

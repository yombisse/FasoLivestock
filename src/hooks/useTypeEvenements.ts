import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { TypeEvenement } from '../database/models/TypeEvenement';

export function useTypeEvenements(farmId?: string) {
  const [typeEvenements, setTypeEvenements] = useState<TypeEvenement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query;
    if (farmId) {
      query = database.get<TypeEvenement>('type_evenements').query(
        Q.where('farm_id', farmId)
      );
    } else {
      query = database.get<TypeEvenement>('type_evenements').query();
    }

    const subscription = query
      .observe()
      .subscribe((collection) => {
        setTypeEvenements(collection);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { typeEvenements, loading };
}

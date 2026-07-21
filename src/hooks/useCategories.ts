import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { Categorie } from '../database/models/Categorie';

export function useCategories(farmId: string) {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = database
      .get<Categorie>('categories')
      .query(Q.where('farm_id', farmId))
      .observe()
      .subscribe((collection) => {
        setCategories(collection);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { categories, loading };
}

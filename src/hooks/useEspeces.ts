import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';
import { Espece } from '../database/models/Espece';

export function useEspeces() {
  const [especes, setEspeces] = useState<Espece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = database
      .get<Espece>('especes')
      .query()
      .observe()
      .subscribe((collection) => {
        console.log('[useEspeces] Loaded especes:', collection.length);
        if (collection.length === 0) {
          console.warn('[useEspeces] No especes found in local database. Sync may be needed.');
        }
        setEspeces(collection);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { especes, loading };
}

import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export function useLots(farmId: string) {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!farmId) {
      setLots([]);
      setLoading(false);
      return;
    }

    const subscription = database
      .get('lots')
      .query(Q.where('farm_id', farmId))
      .observe()
      .subscribe((data) => {
        setLots(data);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { lots, loading };
}

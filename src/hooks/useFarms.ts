import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';

export function useFarms() {
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const subscription = database
      .get('farms')
      .query()
      .observe()
      .subscribe((data) => {
        setFarms(data);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { farms, loading };
}

import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export function useNotifications(farmId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!farmId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const subscription = database
      .get('notifications')
      .query(Q.where('farm_id', farmId))
      .observe()
      .subscribe((data) => {
        setNotifications(data);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { notifications, loading };
}

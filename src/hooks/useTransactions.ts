import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { Transaction } from '../database/models/Transaction';

export function useTransactions(farmId: string, animalId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query;
    if (animalId) {
      query = database.get<Transaction>('transactions').query(
        Q.where('farm_id', farmId),
        Q.where('animal_id', animalId)
      );
    } else {
      query = database.get<Transaction>('transactions').query(
        Q.where('farm_id', farmId)
      );
    }

    const subscription = query
      .observe()
      .subscribe((collection) => {
        setTransactions(collection);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId, animalId]);

  return { transactions, loading };
}

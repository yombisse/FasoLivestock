import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';

export interface DashboardData {
  total_animaux: number;
  animaux_actifs: number;
  total_evenements: number;
  animaux_males: number;
  animaux_femelles: number;
}

export function useDashboard(farmId: string) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useDashboard] useEffect called with farmId:', farmId);
    if (!farmId) {
      console.log('[useDashboard] No farmId provided');
      setLoading(false);
      return;
    }

    const animalsQuery = database.get('animals').query(Q.where('farm_id', farmId));
    const eventsQuery = database.get('evenements').query(Q.where('farm_id', farmId));

    const animalsSubscription = animalsQuery.observe().subscribe((animals) => {
      console.log('[useDashboard] Animals collection updated:', {
        farmId: farmId,
        count: animals.length,
        timestamp: new Date().toISOString(),
      });

      // Filter active animals (exclude MORT, VENDU, PERDU)
      const activeAnimals = animals.filter((animal: any) => {
        const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
        return !excludedStatuses.includes(animal._raw.statut || '');
      });

      // Filter by gender
      const males = animals.filter((animal: any) => animal._raw.sexe === 'male');
      const females = animals.filter((animal: any) => animal._raw.sexe === 'femelle');

      setDashboardData({
        total_animaux: animals.length,
        animaux_actifs: activeAnimals.length,
        total_evenements: 0, // Will be updated by events subscription
        animaux_males: males.length,
        animaux_femelles: females.length,
      });
      setLoading(false);
    });

    const eventsSubscription = eventsQuery.observe().subscribe((events) => {
      console.log('[useDashboard] Events collection updated:', {
        farmId: farmId,
        count: events.length,
        timestamp: new Date().toISOString(),
      });

      setDashboardData((prev) => ({
        ...prev!,
        total_evenements: events.length,
      }));
    });

    return () => {
      animalsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, [farmId]);

  return { dashboardData, loading };
}

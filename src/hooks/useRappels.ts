import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database/watermelonIndex';
import { SanteRappel } from '../database/models/SanteRappel';
import { Rappel } from '../database/repositories/rappelRepository';
import { getRappels, getRappelsByStatut, getRappelsEnRetard, getRappelsAVenir, calculateJoursRestants } from '../database/repositories/rappelRepository';

export function useRappels(farmId: string | null) {
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) {
      console.log('[useRappels] No farmId provided');
      setLoading(false);
      return;
    }

    const subscription = database
      .get<SanteRappel>('sante_rappels')
      .query(Q.where('farm_id', farmId), Q.where('deleted_at', null))
      .observe()
      .subscribe((collection) => {
        console.log('[useRappels] Loaded rappels:', collection.length);
        // Convert WatermelonDB Rappel to TypeScript Rappel type
        const convertedRappels = collection.map((rappel) => ({
          id: rappel.id,
          farm_id: rappel.farm_id,
          animal_id: rappel.animal_id,
          type_rappel: rappel.type_rappel as 'VACCINATION' | 'TRAITEMENT' | 'CONTROLE' | 'MISE_BAS' | 'CHALEUR',
          date_prevue: rappel.date_prevue,
          date_realisee: rappel.date_realisee,
          statut: rappel.statut as 'EN_ATTENTE' | 'REALISE' | 'EN_RETARD',
          note: rappel.note,
          evenement_id: rappel.evenement_id,
          sync_status: rappel.sync_status as 'synced' | 'pending' | 'conflict',
          last_modified_by: rappel.last_modified_by,
          version: rappel.version,
          deleted_at: rappel.deletedAt ? rappel.deletedAt.toISOString() : undefined,
          created_at: rappel.createdAt.toISOString(),
          updated_at: rappel.updatedAt.toISOString(),
        }));
        setRappels(convertedRappels);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [farmId]);

  return { rappels, loading };
}

export function useRappelsByStatut(farmId: string | null, statut: 'EN_ATTENTE' | 'REALISE' | 'EN_RETARD') {
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) {
      console.log('[useRappelsByStatut] No farmId provided');
      setLoading(false);
      return;
    }

    const loadRappels = async () => {
      try {
        setLoading(true);
        const data = await getRappelsByStatut(farmId, statut);
        setRappels(data);
      } catch (error) {
        console.error('[useRappelsByStatut] Error loading rappels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRappels();
  }, [farmId, statut]);

  return { rappels, loading };
}

export function useRappelsEnRetard(farmId: string | null) {
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) {
      console.log('[useRappelsEnRetard] No farmId provided');
      setLoading(false);
      return;
    }

    const loadRappels = async () => {
      try {
        setLoading(true);
        const data = await getRappelsEnRetard(farmId);
        setRappels(data);
      } catch (error) {
        console.error('[useRappelsEnRetard] Error loading rappels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRappels();
  }, [farmId]);

  return { rappels, loading };
}

export function useRappelsAVenir(farmId: string | null, jours: number = 7) {
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) {
      console.log('[useRappelsAVenir] No farmId provided');
      setLoading(false);
      return;
    }

    const loadRappels = async () => {
      try {
        setLoading(true);
        const data = await getRappelsAVenir(farmId, jours);
        setRappels(data);
      } catch (error) {
        console.error('[useRappelsAVenir] Error loading rappels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRappels();
  }, [farmId, jours]);

  return { rappels, loading };
}

export function useRappelsForAnimal(farmId: string | null, animalId: string | null) {
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId || !animalId) {
      console.log('[useRappelsForAnimal] No farmId or animalId provided');
      setLoading(false);
      return;
    }

    const loadRappels = async () => {
      try {
        setLoading(true);
        const data = await getRappels(farmId, animalId);
        setRappels(data);
      } catch (error) {
        console.error('[useRappelsForAnimal] Error loading rappels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRappels();
  }, [farmId, animalId]);

  return { rappels, loading };
}

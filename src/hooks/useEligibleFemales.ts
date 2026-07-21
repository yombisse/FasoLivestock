import { useEffect, useState } from 'react';
import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';
import { TypeEvenementIds } from '../constants/typeEvenements';
import { EvenementStatut } from '../constants/evenementStatuts';
import { Animal } from '../types/animal.types';

interface EligibleFemale extends Animal {
  gestationDate?: string;
}

/**
 * Hook to fetch females with an active gestation (EN_COURS)
 * These are eligible for birth recording
 */
export function useEligibleFemales(farmId: string) {
  const [eligibleFemales, setEligibleFemales] = useState<EligibleFemale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!farmId) {
      setEligibleFemales([]);
      setLoading(false);
      return;
    }

    const loadEligibleFemales = async () => {
      try {
        setLoading(true);

        // Query gestation events with EN_COURS status
        const gestationEvents = await database
          .get('evenements')
          .query(
            Q.where('type_evenement_id', TypeEvenementIds.GESTATION),
            Q.where('statut', EvenementStatut.EN_COURS),
            Q.where('farm_id', farmId)
          )
          .fetch();

        console.log('[useEligibleFemales] Found gestation events:', gestationEvents.length);

        // Get the animal IDs from these events
        const animalIds = gestationEvents.map((e: any) => e.animal_id).filter(Boolean);

        if (animalIds.length === 0) {
          setEligibleFemales([]);
          setLoading(false);
          return;
        }

        // Fetch the animals (females)
        const animals = await database
          .get('animals')
          .query(
            Q.where('id', Q.oneOf(animalIds)),
            Q.where('sexe', 'femelle')
          )
          .fetch();

        // Map animals with their gestation date
        const femalesWithGestation: EligibleFemale[] = animals.map((animal: any) => {
          const gestationEvent = gestationEvents.find((e: any) => e.animal_id === animal.id);
          return {
            ...animal,
            gestationDate: gestationEvent?.date_evenement,
          };
        });

        console.log('[useEligibleFemales] Eligible females:', femalesWithGestation.length);
        setEligibleFemales(femalesWithGestation);
      } catch (error) {
        console.error('[useEligibleFemales] Error loading eligible females:', error);
        setEligibleFemales([]);
      } finally {
        setLoading(false);
      }
    };

    loadEligibleFemales();
  }, [farmId]);

  return { eligibleFemales, loading };
}

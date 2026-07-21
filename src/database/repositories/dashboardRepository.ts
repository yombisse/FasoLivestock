import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export interface DashboardStats {
  total_animaux: number;
  animaux_actifs: number;
  total_evenements: number;
  animaux_males: number;
  animaux_femelles: number;
}

export interface SpeciesCount {
  [key: string]: number;
}

export async function getDashboardStats(farmId: string): Promise<DashboardStats> {
  const animalsCollection = database.get('animals');
  const evenementsCollection = database.get('evenements');

  // Get total animals count
  const totalAnimals = await animalsCollection
    .query(Q.where('farm_id', farmId))
    .fetch();

  // Get active animals count (alive and present - exclude MORT, VENDU, PERDU)
  const allAnimals = await animalsCollection
    .query(Q.where('farm_id', farmId))
    .fetch();
  const activeAnimals = allAnimals.filter((animal: any) => {
    const excludedStatuses = ['MORT', 'VENDU', 'PERDU'];
    return !excludedStatuses.includes(animal._raw.statut || '');
  });

  // Get events count
  const totalEvents = await evenementsCollection
    .query(Q.where('farm_id', farmId))
    .fetch();

  // Get gender breakdown
  const males = await animalsCollection
    .query(Q.where('farm_id', farmId), Q.where('sexe', 'male'))
    .fetch();

  const females = await animalsCollection
    .query(Q.where('farm_id', farmId), Q.where('sexe', 'femelle'))
    .fetch();

  return {
    total_animaux: totalAnimals.length,
    animaux_actifs: activeAnimals.length,
    total_evenements: totalEvents.length,
    animaux_males: males.length,
    animaux_femelles: females.length,
  };
}

export function observeDashboardStats(farmId: string, callback: (stats: DashboardStats) => void) {
  const animalsCollection = database.get('animals');
  const evenementsCollection = database.get('evenements');

  const animalsSubscription = animalsCollection
    .query(Q.where('farm_id', farmId))
    .observeWithColumns(['statut', 'sexe'])
    .subscribe(async () => {
      const stats = await getDashboardStats(farmId);
      callback(stats);
    });

  const evenementsSubscription = evenementsCollection
    .query(Q.where('farm_id', farmId))
    .observe()
    .subscribe(async () => {
      const stats = await getDashboardStats(farmId);
      callback(stats);
    });

  // Return unsubscribe function
  return () => {
    animalsSubscription.unsubscribe();
    evenementsSubscription.unsubscribe();
  };
}

export async function getAnimalsBySpecies(farmId: string): Promise<SpeciesCount> {
  const animalsCollection = database.get('animals');
  const animals = await animalsCollection.query(Q.where('farm_id', farmId)).fetch();

  const speciesCount: SpeciesCount = {};
  animals.forEach((animal: any) => {
    const speciesName = animal.espece?.nom || 'Autre';
    speciesCount[speciesName] = (speciesCount[speciesName] || 0) + 1;
  });

  return speciesCount;
}

export function observeAnimalsBySpecies(farmId: string, callback: (speciesCount: SpeciesCount) => void) {
  const animalsCollection = database.get('animals');

  const subscription = animalsCollection
    .query(Q.where('farm_id', farmId))
    .observeWithColumns(['espece_id'])
    .subscribe(async () => {
      const speciesCount = await getAnimalsBySpecies(farmId);
      callback(speciesCount);
    });

  return () => subscription.unsubscribe();
}

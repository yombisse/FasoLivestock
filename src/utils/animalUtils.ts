/**
 * Utility functions for animal filtering and manipulation
 */

export interface AnimalWithSpecies {
  id: string;
  nom: string;
  espece?: {
    nom: string;
  };
}

/**
 * Filter animals by species name
 * @param animals - Array of animals with espece relation
 * @param speciesName - Name of the species to filter by
 * @returns Filtered array of animals matching the species
 */
export function filterAnimalsBySpecies(
  animals: AnimalWithSpecies[],
  speciesName: string
): AnimalWithSpecies[] {
  if (!speciesName) {
    return animals;
  }

  return animals.filter((animal) => animal.espece?.nom === speciesName);
}

/**
 * Get unique species from an array of animals
 * @param animals - Array of animals with espece relation
 * @returns Array of unique species names
 */
export function getUniqueSpecies(animals: AnimalWithSpecies[]): string[] {
  const speciesSet = new Set<string>();
  
  animals.forEach((animal) => {
    if (animal.espece?.nom) {
      speciesSet.add(animal.espece.nom);
    }
  });

  return Array.from(speciesSet).sort();
}

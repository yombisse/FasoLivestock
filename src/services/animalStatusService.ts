import database from '../database/watermelonIndex';
import { TypeEvenementIds } from '../constants/typeEvenements';
import { Animal } from '../database/models/Animal';

export enum StatutAnimal {
  SAIN = 'SAIN',
  MALADE = 'MALADE',
  EN_TRAITEMENT = 'EN_TRAITEMENT',
  VENDU = 'VENDU',
  MORT = 'MORT',
  PERDU = 'PERDU',
}

/**
 * Met à jour automatiquement le statut d'un animal
 * en fonction du type d'événement créé
 */
export async function updateAnimalStatusOnEvent(
  animalId: string,
  typeEvenementId: string
): Promise<void> {
  await database.write(async () => {
    const animal = await database.get<Animal>('animals').find(animalId);

    // Événements sanitaires
    if (typeEvenementId === TypeEvenementIds.MALADIE) {
      await animal.update(animal => {
        animal.statut = StatutAnimal.MALADE;
      });
    }

    if (typeEvenementId === TypeEvenementIds.TRAITEMENT) {
      await animal.update(animal => {
        animal.statut = StatutAnimal.EN_TRAITEMENT;
      });
    }

    // Événements de mouvement
    if (typeEvenementId === TypeEvenementIds.DECES ||
        typeEvenementId === TypeEvenementIds.ABATTAGE) {
      await animal.update(animal => {
        animal.statut = StatutAnimal.MORT;
      });
    }

    if (typeEvenementId === TypeEvenementIds.VENTE) {
      await animal.update(animal => {
        animal.statut = StatutAnimal.VENDU;
      });
    }

    if (typeEvenementId === TypeEvenementIds.PERTE) {
      await animal.update(animal => {
        animal.statut = StatutAnimal.PERDU;
      });
    }

    if (typeEvenementId === TypeEvenementIds.ACHAT) {
      await animal.update(animal => {
        animal.statut = StatutAnimal.SAIN;
      });
    }
  });
}

/**
 * Remettre un animal à l'état sain (après guérison)
 */
export async function setAnimalSain(animalId: string): Promise<void> {
  await database.write(async () => {
    const animal = await database.get<Animal>('animals').find(animalId);
    await animal.update(animal => {
      animal.statut = StatutAnimal.SAIN;
    });
  });
}

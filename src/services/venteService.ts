import { Animal } from '../types/animal.types';
import { createLocalRecord } from '../database/repositories/baseRepository';
import { updateAnimal } from '../database/repositories/animalRepository';
import { TypeEvenementIds } from '../constants/typeEvenements';
import { CategorieSystemeIds } from '../constants/categories';
import { validerMouvement } from '../utils/transactionValidation';

export interface ProcessVenteAnimalParams {
  animal: Animal;
  farmId: string;
  prix: number;
  dateVente: Date;
  acheteur?: string;
  remarque?: string;
}

export interface ProcessVenteAnimalResult {
  eventId: string;
  transactionId: string;
  animalId: string;
}

/**
 * Process the sale of a single animal using the same logic as AnimalVenteScreen
 * This function encapsulates the offline-first optimistic creation pattern
 */
export async function processVenteAnimal(
  params: ProcessVenteAnimalParams
): Promise<ProcessVenteAnimalResult> {
  const { animal, farmId, prix, dateVente, acheteur, remarque } = params;

  console.log('[venteService] Processing vente for animal:', animal.id);

  // Use constant type_evenement_id for vente
  const typeEvenementId = TypeEvenementIds.VENTE;

  // Validation backend pour éviter les rejets lors du sync
  const validation = validerMouvement(
    {
      animal_id: animal.id,
      type_evenement_id: typeEvenementId,
      date_evenement: dateVente.toISOString().split('T')[0],
      description: `Vente à ${acheteur || 'acheteur inconnu'} pour ${prix}${remarque ? ` - ${remarque}` : ''}`,
      cout: 0,
      statut_avant: animal.statut as 'SAIN' | 'VENDU' | 'MORT' | 'PERDU',
      statut_apres: 'VENDU',
    },
    'Vente'
  );

  if (!validation.valide) {
    throw new Error(validation.erreur || 'Erreur de validation');
  }

  // Create event locally
  const createdEvent = await createLocalRecord('evenements', {
    farm_id: farmId,
    animal_id: animal.id,
    type_evenement_id: typeEvenementId,
    date_evenement: dateVente.toISOString().split('T')[0],
    description: `Vente à ${acheteur || 'acheteur inconnu'} pour ${prix}${remarque ? ` - ${remarque}` : ''}`,
    categorie: 'MOUVEMENT',
    statut_avant: animal.statut,
    statut_apres: 'VENDU',
  });

  console.log('[venteService] Evenement created:', {
    local_id: (createdEvent as any).id,
    farm_id: farmId,
    animal_id: animal.id,
    type_evenement_id: typeEvenementId,
    categorie: 'MOUVEMENT',
    statut_avant: animal.statut,
    statut_apres: 'VENDU',
    _status: (createdEvent as any)._status,
    sync_status: (createdEvent as any).sync_status,
  });

  // Update animal status locally
  const updatedAnimal = await updateAnimal(animal.id, { statut: 'VENDU' });

  console.log('[venteService] Animal status updated:', {
    animal_id: animal.id,
    old_statut: animal.statut,
    new_statut: 'VENDU',
    _status: (updatedAnimal as any)._status,
    sync_status: (updatedAnimal as any).sync_status,
  });

  // Create transaction for the sale
  const createdTransaction = await createLocalRecord('transactions', {
    farm_id: farmId,
    type_transaction: 'ENTREE',
    montant: prix,
    date_transaction: dateVente.toISOString(),
    description: `Vente à ${acheteur || 'acheteur inconnu'}${remarque ? ` - ${remarque}` : ''}`,
    tiers: acheteur || '',
    animal_id: animal.id,
    evenement_id: (createdEvent as any).id,
    categorie_id: CategorieSystemeIds.VENTE_ANIMAUX,
  });

  console.log('[venteService] Transaction created:', {
    local_id: (createdTransaction as any).id,
    farm_id: farmId,
    type_transaction: 'ENTREE',
    montant: prix,
    animal_id: animal.id,
    evenement_id: (createdEvent as any).id,
    categorie_id: CategorieSystemeIds.VENTE_ANIMAUX,
    _status: (createdTransaction as any)._status,
    sync_status: (createdTransaction as any).sync_status,
  });

  return {
    eventId: (createdEvent as any).id,
    transactionId: (createdTransaction as any).id,
    animalId: animal.id,
  };
}

/**
 * Fonctions de validation pour les transactions financières
 * Basées sur la documentation backend Laravel
 */

export interface TransactionData {
  type_transaction: 'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'AJUSTEMENT';
  montant: number;
  date_transaction: string;
  categorie_id?: string;
  description?: string;
  evenement_id?: string;
}

export interface MouvementData {
  animal_id: string;
  type_evenement_id: string;
  date_evenement: string;
  description?: string;
  cout?: number;
  farm_destination_id?: string;
  transaction_id?: string;
  statut_avant?: 'SAIN' | 'VENDU' | 'MORT' | 'PERDU';
  statut_apres?: 'SAIN' | 'VENDU' | 'MORT' | 'PERDU';
}

export interface ValidationResult {
  valide: boolean;
  erreur?: string;
  erreurs?: Record<string, string>;
}

/**
 * Valide une transaction financière selon les règles du backend
 */
export function validerTransaction(donnees: TransactionData): ValidationResult {
  const erreurs: Record<string, string> = {};
  const typesValides = ['ENTREE', 'SORTIE', 'TRANSFERT', 'AJUSTEMENT'];

  if (!donnees.type_transaction || !typesValides.includes(donnees.type_transaction)) {
    erreurs.type_transaction = "Le type de transaction doit être ENTREE, SORTIE, TRANSFERT ou AJUSTEMENT.";
  }

  if (donnees.montant === undefined || isNaN(donnees.montant) || donnees.montant < 0) {
    erreurs.montant = "Le montant est obligatoire et doit être un nombre positif.";
  }

  if (!donnees.date_transaction || !isValidDate(donnees.date_transaction)) {
    erreurs.date_transaction = "La date de transaction est obligatoire et doit être valide (YYYY-MM-DD).";
  }

  if (donnees.categorie_id && (donnees.categorie_id.length < 16 || donnees.categorie_id.length > 20)) {
    erreurs.categorie_id = "L'ID de catégorie doit être une chaîne de 16 à 20 caractères.";
  }

  if (donnees.evenement_id && (donnees.evenement_id.length < 16 || donnees.evenement_id.length > 20)) {
    erreurs.evenement_id = "L'ID d'événement doit être une chaîne de 16 à 20 caractères.";
  }

  if (Object.keys(erreurs).length === 0) {
    return { valide: true };
  } else {
    const firstError = Object.values(erreurs)[0];
    return { valide: false, erreur: firstError, erreurs };
  }
}

/**
 * Valide un mouvement (vente, achat, transfert) selon les règles du backend
 */
export function validerMouvement(donnees: MouvementData, typeEvenementNom?: string): ValidationResult {
  const erreurs: Record<string, string> = {};

  if (!donnees.animal_id || donnees.animal_id.length < 16 || donnees.animal_id.length > 20) {
    erreurs.animal_id = "L'ID de l'animal doit être une chaîne de 16 à 20 caractères.";
  }

  if (!donnees.type_evenement_id || donnees.type_evenement_id.length < 16 || donnees.type_evenement_id.length > 20) {
    erreurs.type_evenement_id = "L'ID du type d'événement doit être une chaîne de 16 à 20 caractères.";
  }

  if (!donnees.date_evenement || !isValidDate(donnees.date_evenement)) {
    erreurs.date_evenement = "La date de l'événement est obligatoire et doit être valide (YYYY-MM-DD).";
  }

  if (donnees.cout !== undefined && (isNaN(donnees.cout) || donnees.cout < 0)) {
    erreurs.cout = "Le coût doit être un nombre positif ou nul.";
  }

  // Validation conditionnelle pour TRANSFERT
  if (typeEvenementNom?.toUpperCase() === 'TRANSFERT') {
    if (!donnees.farm_destination_id) {
      erreurs.farm_destination_id = "La ferme de destination est obligatoire pour un transfert.";
    } else if (donnees.farm_destination_id.length < 16 || donnees.farm_destination_id.length > 20) {
      erreurs.farm_destination_id = "L'ID de la ferme de destination doit être une chaîne de 16 à 20 caractères.";
    }
  }

  const statutsValides = ['SAIN', 'VENDU', 'MORT', 'PERDU'];
  if (donnees.statut_avant && !statutsValides.includes(donnees.statut_avant)) {
    erreurs.statut_avant = "Le statut avant doit être SAIN, VENDU, MORT ou PERDU.";
  }

  if (donnees.statut_apres && !statutsValides.includes(donnees.statut_apres)) {
    erreurs.statut_apres = "Le statut après doit être SAIN, VENDU, MORT ou PERDU.";
  }

  if (Object.keys(erreurs).length === 0) {
    return { valide: true };
  } else {
    const firstError = Object.values(erreurs)[0];
    return { valide: false, erreur: firstError, erreurs };
  }
}

/**
 * Valide le format d'une date YYYY-MM-DD
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

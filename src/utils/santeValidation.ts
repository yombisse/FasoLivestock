/**
 * Fonctions de validation pour les événements sanitaires
 * Basées sur la documentation backend Laravel
 */

export interface EvenementSanitaireData {
  animal_id: string;
  type: 'vaccination' | 'traitement' | 'maladie' | 'controle';
  date_evenement: string;
  description?: string;
  cout?: number;
  metadonnees?: any;
}

export interface ValidationResult {
  valide: boolean;
  erreur?: string;
  erreurs?: Record<string, string>;
}

/**
 * Valide un événement sanitaire selon les règles du backend
 */
export function validerEvenementSanitaire(donnees: EvenementSanitaireData): ValidationResult {
  const erreurs: Record<string, string> = {};

  // Validation commune
  if (!donnees.animal_id || donnees.animal_id.length < 16 || donnees.animal_id.length > 20) {
    erreurs.animal_id = "L'ID de l'animal doit être une chaîne de 16 à 20 caractères.";
  }

  if (!donnees.date_evenement || !isValidDate(donnees.date_evenement)) {
    erreurs.date_evenement = "La date de l'événement est obligatoire et doit être valide (YYYY-MM-DD).";
  }

  if (donnees.cout !== undefined && (isNaN(donnees.cout) || donnees.cout < 0)) {
    erreurs.cout = "Le coût doit être un nombre positif ou nul.";
  }

  // Validation spécifique selon le type
  switch (donnees.type) {
    case 'vaccination':
      if (!donnees.metadonnees?.nom_vaccin) {
        erreurs['metadonnees.nom_vaccin'] = "Le nom du vaccin est obligatoire.";
      }
      if (donnees.metadonnees?.nom_vaccin && donnees.metadonnees.nom_vaccin.length > 255) {
        erreurs['metadonnees.nom_vaccin'] = "Le nom du vaccin ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.veterinaire && donnees.metadonnees.veterinaire.length > 255) {
        erreurs['metadonnees.veterinaire'] = "Le nom du vétérinaire ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.dosage && donnees.metadonnees.dosage.length > 100) {
        erreurs['metadonnees.dosage'] = "Le dosage ne doit pas dépasser 100 caractères.";
      }
      if (donnees.metadonnees?.lot_vaccin && donnees.metadonnees.lot_vaccin.length > 100) {
        erreurs['metadonnees.lot_vaccin'] = "Le lot du vaccin ne doit pas dépasser 100 caractères.";
      }
      break;

    case 'traitement':
      if (!donnees.metadonnees?.nom_medicament) {
        erreurs['metadonnees.nom_medicament'] = "Le nom du médicament est obligatoire.";
      }
      if (donnees.metadonnees?.nom_medicament && donnees.metadonnees.nom_medicament.length > 255) {
        erreurs['metadonnees.nom_medicament'] = "Le nom du médicament ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.veterinaire && donnees.metadonnees.veterinaire.length > 255) {
        erreurs['metadonnees.veterinaire'] = "Le nom du vétérinaire ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.dosage && donnees.metadonnees.dosage.length > 100) {
        erreurs['metadonnees.dosage'] = "Le dosage ne doit pas dépasser 100 caractères.";
      }
      if (donnees.metadonnees?.duree && donnees.metadonnees.duree.length > 100) {
        erreurs['metadonnees.duree'] = "La durée ne doit pas dépasser 100 caractères.";
      }
      if (donnees.metadonnees?.frequence && donnees.metadonnees.frequence.length > 100) {
        erreurs['metadonnees.frequence'] = "La fréquence ne doit pas dépasser 100 caractères.";
      }
      break;

    case 'maladie':
      if (!donnees.metadonnees?.nom_maladie) {
        erreurs['metadonnees.nom_maladie'] = "Le nom de la maladie est obligatoire.";
      }
      if (donnees.metadonnees?.nom_maladie && donnees.metadonnees.nom_maladie.length > 255) {
        erreurs['metadonnees.nom_maladie'] = "Le nom de la maladie ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.veterinaire && donnees.metadonnees.veterinaire.length > 255) {
        erreurs['metadonnees.veterinaire'] = "Le nom du vétérinaire ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.gravite && !['legere', 'moderee', 'grave'].includes(donnees.metadonnees.gravite.toLowerCase())) {
        erreurs['metadonnees.gravite'] = "La gravité doit être légère, modérée ou grave.";
      }
      break;

    case 'controle':
      if (donnees.metadonnees?.type_controle && donnees.metadonnees.type_controle.length > 255) {
        erreurs['metadonnees.type_controle'] = "Le type de contrôle ne doit pas dépasser 255 caractères.";
      }
      if (donnees.metadonnees?.veterinaire && donnees.metadonnees.veterinaire.length > 255) {
        erreurs['metadonnees.veterinaire'] = "Le nom du vétérinaire ne doit pas dépasser 255 caractères.";
      }
      break;
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

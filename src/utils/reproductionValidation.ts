import dayjs from 'dayjs';
import { EvenementStatut } from '../constants/evenementStatuts';

// ============================================================================
// TYPES
// ============================================================================

export interface Animal {
  id: string;
  sexe: 'male' | 'femelle';
  date_naissance?: string;
  espece_id?: string;
}

export interface EspeceParametres {
  espece_id: string;
  espece_nom: string;
  duree_gestation_jours: number;
  age_reproduction_mois: number;
  nombre_petits_typique: number;
  intervalle_vaccin_jours: number;
  age_sevrage_jours: number;
  poids_naissance_moyen_kg: number;
  poids_adulte_moyen_kg: number;
}

export interface Evenement {
  id: string;
  type_nom: string;
  date_evenement: string;
  statut?: string | null;
  date_fin?: string | null;
}

export interface ValidationResult {
  valide: boolean;
  erreur?: string;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function calculerAgeEnMois(dateNaissance: string): number {
  const now = dayjs();
  const birth = dayjs(dateNaissance);
  return now.diff(birth, 'month');
}

// ============================================================================
// VALIDATIONS
// ============================================================================

/**
 * Valide la création d'un événement de type Saillie
 */
export function validerSaillie(
  animal: Animal,
  especeParametres?: EspeceParametres,
  evenementsExistants?: Evenement[]
): ValidationResult {
  // Vérifier que l'animal est une femelle
  if (animal.sexe !== 'femelle') {
    return {
      valide: false,
      erreur: "Une saillie ne peut être enregistrée que sur un animal femelle."
    };
  }

  // Vérifier l'âge de reproduction si la date de naissance est connue
  if (animal.date_naissance && especeParametres) {
    const ageActuel = calculerAgeEnMois(animal.date_naissance);
    if (ageActuel < especeParametres.age_reproduction_mois) {
      return {
        valide: false,
        erreur: `Âge de reproduction non atteint (${especeParametres.age_reproduction_mois} mois requis pour l'espèce ${especeParametres.espece_nom}, animal actuel : ${ageActuel} mois).`
      };
    }
  }

  // Vérifier si une gestation est déjà en cours
  if (evenementsExistants) {
    const gestationEnCours = evenementsExistants.find(e =>
      e.type_nom === 'Gestation' &&
      (e.statut === EvenementStatut.EN_COURS || e.statut === null || e.statut === '')
    );

    if (gestationEnCours) {
      return {
        valide: false,
        erreur: "Impossible de créer une saillie : cet animal a déjà une gestation en cours."
      };
    }
  }

  return { valide: true };
}

/**
 * Valide la création d'un événement de type Gestation
 */
export function validerGestation(
  animal: Animal,
  dateConfirmation: string,
  evenementsExistants?: Evenement[]
): ValidationResult {
  // Vérifier que l'animal est une femelle
  if (animal.sexe !== 'femelle') {
    return {
      valide: false,
      erreur: "Une confirmation de gestation ne peut être enregistrée que sur un animal femelle."
    };
  }

  if (!evenementsExistants) {
    return {
      valide: false,
      erreur: "Impossible de confirmer une gestation : événements de l'animal non disponibles."
    };
  }

  console.log('[AUDIT] Gestation validation - checking for saillie:', {
    animal_id: animal.id,
    evenements_count: evenementsExistants.length,
    evenements: evenementsExistants.map(e => ({ type_nom: e.type_nom, statut: e.statut, date: e.date_evenement })),
  });

  // Chercher une saillie EN_COURS ou sans statut
  const saillieEnCours = evenementsExistants.find(e =>
    e.type_nom === 'Saillie' &&
    (e.statut === EvenementStatut.EN_COURS || e.statut === null || e.statut === '')
  );

  console.log('[AUDIT] Gestation validation - saillie found:', saillieEnCours ? {
    id: saillieEnCours.id,
    type_nom: saillieEnCours.type_nom,
    statut: saillieEnCours.statut,
    date_evenement: saillieEnCours.date_evenement,
  } : 'NONE');

  if (!saillieEnCours) {
    return {
      valide: false,
      erreur: "Impossible de confirmer une gestation : aucune saillie en cours trouvée pour cet animal."
    };
  }

  // Vérifier si une gestation est déjà en cours
  const gestationEnCours = evenementsExistants.find(e =>
    e.type_nom === 'Gestation' &&
    (e.statut === EvenementStatut.EN_COURS || e.statut === null || e.statut === '')
  );

  if (gestationEnCours) {
    return {
      valide: false,
      erreur: "Impossible de confirmer une gestation : une gestation est déjà en cours pour cet animal."
    };
  }

  // Vérifier cohérence temporelle
  if (dayjs(dateConfirmation).isBefore(dayjs(saillieEnCours.date_evenement))) {
    return {
      valide: false,
      erreur: "Incohérence temporelle : la date de confirmation de gestation ne peut pas être antérieure à la date de saillie."
    };
  }

  return { valide: true };
}

/**
 * Valide la création d'un événement de type Mise bas
 */
export function validerMiseBas(
  animal: Animal,
  dateMiseBas: string,
  evenementsExistants?: Evenement[]
): ValidationResult {
  if (!evenementsExistants) {
    return {
      valide: false,
      erreur: "Impossible de créer un événement MISE_BAS : événements de l'animal non disponibles."
    };
  }

  // Chercher une gestation EN_COURS
  const gestationEnCours = evenementsExistants.find(e =>
    e.type_nom === 'Gestation' &&
    (e.statut === EvenementStatut.EN_COURS || e.statut === null || e.statut === '')
  );

  if (!gestationEnCours) {
    return {
      valide: false,
      erreur: "Impossible de créer un événement MISE_BAS : aucune gestation en cours pour cet animal."
    };
  }

  // Vérifier cohérence temporelle
  if (dayjs(dateMiseBas).isBefore(dayjs(gestationEnCours.date_evenement))) {
    return {
      valide: false,
      erreur: "Incohérence temporelle : la date de mise bas ne peut pas être antérieure à la date de confirmation de gestation."
    };
  }

  return { valide: true };
}

/**
 * Valide selon le type d'événement
 * La cohérence de stade est assurée en amont par le picker (getStadeReproduction)
 * Cette validation ne vérifie que le sexe de l'animal
 */
export function validerEvenementReproduction(
  typeEvenement: string,
  animal: Animal,
  especeParametres?: EspeceParametres,
  evenementsExistants?: Evenement[],
  dateEvenement?: string
): ValidationResult {
  // Vérifier que l'animal est une femelle pour tous les événements reproductifs
  if (animal.sexe !== 'femelle') {
    return {
      valide: false,
      erreur: "Un événement reproductif ne peut être enregistré que sur un animal femelle."
    };
  }

  // Vérifier la date si requise
  if (dateEvenement && typeEvenement !== 'Saillie') {
    if (!dateEvenement) {
      return { valide: false, erreur: "Date requise." };
    }
  }

  return { valide: true };
}

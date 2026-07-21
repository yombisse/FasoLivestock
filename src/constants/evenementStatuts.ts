// src/constants/evenementStatuts.ts
// Statuts des événements de reproduction et sanitaires

export const EvenementStatut = {
  EN_COURS: 'EN_COURS',
  TERMINE: 'TERMINE',
  EN_ATTENTE: 'EN_ATTENTE',
  ANNULE: 'ANNULE',
} as const;

export type EvenementStatut = typeof EvenementStatut[keyof typeof EvenementStatut];

// Helper pour obtenir les noms lisibles
export const EvenementStatutNoms = {
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  EN_ATTENTE: 'En attente',
  ANNULE: 'Annulé',
} as const;

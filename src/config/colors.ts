/**
 * Centralized color palette for status badges and UI elements
 * Ensures consistency across all screens and components
 */

export const StatusColors = {
  // Animal status colors
  ACTIF: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  VENDU: {
    background: '#E3F2FD',
    text: '#1565C0',
  },
  DÉCÉDÉ: {
    background: '#FFEBEE',
    text: '#C62828',
  },
  DECÉDÉ: {
    background: '#FFEBEE',
    text: '#C62828',
  },
  MORT: {
    background: '#FFEBEE',
    text: '#C62828',
  },
  PERDU: {
    background: '#FFF3E0',
    text: '#F57C00',
  },

  // Transaction type colors
  ENTREE: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  SORTIE: {
    background: '#FFEBEE',
    text: '#D32F2F',
  },
  TRANSFERT: {
    background: '#E3F2FD',
    text: '#1976D2',
  },
  AJUSTEMENT: {
    background: '#FFF3E0',
    text: '#F57C00',
  },

  // Sync status colors
  SYNCED: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  PENDING: {
    background: '#FFF3E0',
    text: '#F57C00',
  },
  CONFLICT: {
    background: '#FFEBEE',
    text: '#D32F2F',
  },

  // Health event colors
  VACCINATION: {
    background: '#E8F5E9',
    text: '#2E7D32',
    icon: '#2E7D32',
  },
  TRAITEMENT: {
    background: '#E3F2FD',
    text: '#1976D2',
    icon: '#1976D2',
  },
  MALADIE: {
    background: '#FFEBEE',
    text: '#D32F2F',
    icon: '#D32F2F',
  },
  CONTROLE: {
    background: '#FFF3E0',
    text: '#F57C00',
    icon: '#F57C00',
  },

  // Reproduction event colors
  SAILLIE: {
    background: '#FCE4EC',
    text: '#E91E63',
    icon: '#E91E63',
  },
  GESTATION: {
    background: '#F3E5F5',
    text: '#9C27B0',
    icon: '#9C27B0',
  },
  MISE_BAS: {
    background: '#EDE7F6',
    text: '#673AB7',
    icon: '#673AB7',
  },
  CHALEUR: {
    background: '#FFF3E0',
    text: '#F57C00',
    icon: '#F57C00',
  },
  INSPEMINATION: {
    background: '#F3E5F5',
    text: '#7B1FA2',
    icon: '#7B1FA2',
  },
};

/**
 * Get status colors for animal status
 */
export const getAnimalStatusColor = (status?: string) => {
  if (!status) return StatusColors.ACTIF;
  const normalizedStatus = status.toUpperCase();
  return StatusColors[normalizedStatus as keyof typeof StatusColors] || StatusColors.ACTIF;
};

/**
 * Get transaction type colors
 */
export const getTransactionColor = (type?: string) => {
  if (!type) return StatusColors.ENTREE;
  return StatusColors[type as keyof typeof StatusColors] || StatusColors.ENTREE;
};

/**
 * Get health event colors
 */
export const getHealthEventColor = (type?: string) => {
  if (!type) return StatusColors.CONTROLE;
  return StatusColors[type as keyof typeof StatusColors] || StatusColors.CONTROLE;
};

/**
 * Get reproduction event colors
 */
export const getReproductionEventColor = (type?: string) => {
  if (!type) return StatusColors.SAILLIE;
  return StatusColors[type as keyof typeof StatusColors] || StatusColors.SAILLIE;
};

/**
 * Get sync status colors
 */
export const getSyncStatusColor = (status?: string) => {
  if (!status) return StatusColors.PENDING;
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'synced') return StatusColors.SYNCED;
  if (normalizedStatus === 'pending') return StatusColors.PENDING;
  if (normalizedStatus === 'conflict') return StatusColors.CONFLICT;
  return StatusColors.PENDING;
};

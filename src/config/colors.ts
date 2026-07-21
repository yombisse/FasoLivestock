/**
 * Centralized color palette for status badges and UI elements
 * Ensures consistency across all screens and components
 * 
 * Design Tokens — FasoLivestock v2
 */

export const Theme = {
  // Primary colors (replaces hardcoded #2E7D32)
  primary: '#1B4D3E',
  primaryLight: '#2A6B54',
  
  // Backgrounds
  backgroundLight: '#EEF3EF',
  white: '#FFFFFF',
  inputBackground: '#F5F7F5',
  
  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
};

export const StatusColors = {
  // Animal status colors
  SAIN: {
    background: '#D1F2E1',
    text: '#14804A',
  },
  VENDU: {
    background: '#D1F2E1',
    text: '#14804A',
  },
  DÉCÉDÉ: {
    background: '#FCE0E0',
    text: '#C0392B',
  },
  DECÉDÉ: {
    background: '#FCE0E0',
    text: '#C0392B',
  },
  MORT: {
    background: '#FCE0E0',
    text: '#C0392B',
  },
  PERDU: {
    background: '#FDEBD0',
    text: '#B9770E',
  },

  // Transaction type colors
  ENTREE: {
    background: '#D1F2E1',
    text: '#14804A',
  },
  SORTIE: {
    background: '#FCE0E0',
    text: '#C0392B',
  },
  TRANSFERT: {
    background: '#FDEBD0',
    text: '#B9770E',
  },
  AJUSTEMENT: {
    background: '#FDEBD0',
    text: '#B9770E',
  },

  // Sync status colors
  SYNCED: {
    background: '#D1F2E1',
    text: '#14804A',
  },
  PENDING: {
    background: '#FDEBD0',
    text: '#B9770E',
  },
  CONFLICT: {
    background: '#FCE0E0',
    text: '#C0392B',
  },

  // Health event colors
  VACCINATION: {
    background: '#D1F2E1',
    text: '#14804A',
    icon: '#14804A',
  },
  TRAITEMENT: {
    background: '#FDEBD0',
    text: '#B9770E',
    icon: '#B9770E',
  },
  MALADIE: {
    background: '#FCE0E0',
    text: '#C0392B',
    icon: '#C0392B',
  },
  CONTROLE: {
    background: '#FDEBD0',
    text: '#B9770E',
    icon: '#B9770E',
  },

  // Reproduction event colors
  SAILLIE: {
    background: '#FCE4EC',
    text: '#C2185B',
    icon: '#C2185B',
  },
  GESTATION: {
    background: '#EAE0F8',
    text: '#6C3FA8',
    icon: '#6C3FA8',
  },
  MISE_BAS: {
    background: '#D1F2E1',
    text: '#14804A',
    icon: '#14804A',
  },
  CHALEUR: {
    background: '#FDEBD0',
    text: '#B9770E',
    icon: '#B9770E',
  },
  INSPEMINATION: {
    background: '#EAE0F8',
    text: '#6C3FA8',
    icon: '#6C3FA8',
  },
};

/**
 * Get status colors for animal status
 */
export const getAnimalStatusColor = (status?: string) => {
  if (!status) return StatusColors.SAIN;
  const normalizedStatus = status.toUpperCase();
  return StatusColors[normalizedStatus as keyof typeof StatusColors] || StatusColors.SAIN;
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

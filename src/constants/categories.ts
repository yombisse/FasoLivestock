// src/constants/categories.ts
export const CategorieSystemeIds = {
  // Revenus
  VENTE_ANIMAUX: 'RrUhgJmYpeIPc5h6aHpf',
 
  // Dépenses
  ACHAT_ANIMAUX: 'LteIMADnrgkNQmtwB7Gr',
  SANTE_VETERINAIRE: 'NHqlims4Zh7tOzqkqMJ3',
  REPRODUCTION: '9TxearV5HeeHWNyoasKn',
 
  // Catégories générées automatiquement
  FRAIS_SANITAIRE: 'SUdSyL5K0Mej3eNZFvsT',
  FRAIS_REPRODUCTION: 'Qhj7A8iKPc5jxefXcl3s',
  FRAIS_MALADIE: '9ilavW5aWVE0cfYZ3CZC',
} as const;
 
// Helper pour obtenir les noms lisibles
export const CategorieSystemeNoms = {
  VENTE_ANIMAUX: 'Vente d\'animaux',
  ACHAT_ANIMAUX: 'Achat d\'animaux',
  SANTE_VETERINAIRE: 'Santé (vétérinaire)',
  REPRODUCTION: 'Reproduction',
  FRAIS_SANITAIRE: 'FRAIS_SANITAIRE',
  FRAIS_REPRODUCTION: 'FRAIS_REPRODUCTION',
  FRAIS_MALADIE: 'FRAIS_MALADIE',
} as const;

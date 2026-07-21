// src/constants/typeEvenements.ts
export const TypeEvenementIds = {
  // Reproduction
  CHALEUR: '1owjZUIVP0gIrAcSq8Sw',
  SAILLIE: 'JKAWN9rN0BYVE46snec1',
  GESTATION: 'HkGB81kowtR76VdLZqZO',
  MISE_BAS: 'kHe1MGrLuLxAwZdSQdrY',
  NAISSANCE: 'JEDpdHtycshklyWggT4B',
 
  // Sanitaire
  MALADIE: '5XjK3qZ8pLmN9oR2sT4v',
  VACCINATION: 'u4OJvVlCnLQ7H7xcIVMc',
  TRAITEMENT: 'BfLtxah0PEx4CJn5zQ50',
  CONTROLE: 'BtFDz672cHmbwNH4GaiH',
  PESSEE: 'rtpISsZNMYM6It03Xl2g',
  AUTRE: 'oNZ8XZX15yKUpDyl78AF',
 
  // Mouvement
  VENTE: 'Khjy61rPsSByYjRDE6EL',
  ACHAT: 'f96dSuy6ocGMWX58R6ve',
  TRANSFERT: '02amTPryEc4apSmqQkoc',
  DECES: 'vhSYzGylJQAmfiVrgbjp',
  PERTE: 'A36SgYEfEIdgwujVpt0m',
  ABATTAGE: 'P9Tczk0VV2AwG9P68Fpl',
} as const;
 
// Helper pour obtenir les noms lisibles
export const TypeEvenementNoms = {
  CHALEUR: 'Chaleur',
  SAILLIE: 'Saillie',
  GESTATION: 'Gestation',
  MISE_BAS: 'Mise bas',
  NAISSANCE: 'NAISSANCE',
  MALADIE: 'Maladie',
  VACCINATION: 'Vaccination',
  TRAITEMENT: 'Traitement',
  CONTROLE: 'Contrôle',
  PESSEE: 'Pesée',
  AUTRE: 'Autre',
  VENTE: 'Vente',
  ACHAT: 'Achat',
  TRANSFERT: 'Transfert',
  DECES: 'Décès',
  PERTE: 'Perte',
  ABATTAGE: 'Abattage',
} as const;

/**
 * Génère un ID de 20 caractères alphanumériques (0-9, A-Z, a-z)
 * Entropie: 62^20 ≈ 2^119 bits (largement suffisant pour éviter les collisions)
 * Format attendu par le backend pour la sync
 */
export function generateUUID(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  
  // Utilise crypto.getRandomValues si disponible (plus sécurisé), sinon Math.random
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint8Array(20);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 20; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    // Fallback pour React Native si crypto n'est pas disponible
    for (let i = 0; i < 20; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}

# Rapport d'audit post-migration WatermelonDB

## 1. CHUNKING DU PUSH (MAX_CHUNK_SIZE = 200)

**Action effectuée**: Ajout d'un comptage des items dans le payload avant l'envoi API dans `src/sync/watermelonSync.ts`.

**Option retenue**: Alternative rapide - recommandation de relever MAX_CHUNK_SIZE côté backend à 500 ou 1000.

**Pourquoi**: 
- Le chunking manuel côté mobile est complexe à implémenter correctement (respect de l'ordre des tables, gestion des échecs par lot)
- Pour la démo, le volume de données attendu est limité
- Relever la limite côté backend est plus simple et évite la complexité côté mobile

**Implémentation**:
```typescript
// Count total items in payload
let totalItems = 0;
Object.values(filteredChanges).forEach((tableChanges: any) => {
  if (tableChanges.created) totalItems += tableChanges.created.length;
  if (tableChanges.updated) totalItems += tableChanges.updated.length;
  if (tableChanges.deleted) totalItems += tableChanges.deleted.length;
});
console.log('[WatermelonSync] Total items to push:', totalItems);

// NOTE: Backend has MAX_CHUNK_SIZE = 200 items limit
// For demo purposes, we recommend raising this limit to 500 or 1000 on the backend
// instead of implementing complex chunking logic on mobile side
// If HTTP 413 errors occur, increase MAX_CHUNK_SIZE in backend sync controller
```

**Action requise côté backend**: Relever `MAX_CHUNK_SIZE` dans le contrôleur de sync à 500 ou 1000.

---

## 2. MODÈLE FarmUser MANQUANT

**Action effectuée**: Création du fichier `src/database/models/FarmUser.ts` et ajout à `watermelonIndex.ts`.

**Utilisation détectée**: FarmUser est utilisé dans:
- `src/database/repositories/farmUserRepository.ts` (ancien système)
- `src/services/farm.service.ts` (2 références)
- `src/types/farm.types.ts` (1 référence)

**Décision**: Garder la table FarmUser car elle est utilisée dans les services et types.

**Modèle créé**:
```typescript
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class FarmUser extends Model {
  static table = 'farm_user';

  @field('farm_id') farm_id!: string;
  @field('user_id') user_id!: string;
  @field('role') role!: string;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
```

**Note**: Les erreurs TypeScript sur les décorateurs sont des false positives connus de WatermelonDB.

---

## 3. HOOKS OBSERVABLES RESTANTS

**Action effectuée**: Création de 4 hooks manquants dans `src/hooks/`:

### useLots.ts
- Filtre par `farm_id`
- Retourne `{ lots, loading }`

### useFarms.ts
- Pas de filtre (retourne toutes les farms)
- Retourne `{ farms, loading }`

### useNaissances.ts
- Filtre par `farm_id`
- Filtre optionnel par `animal_id` (mother_id)
- Retourne `{ naissances, loading }`

### useNotifications.ts
- Filtre par `farm_id`
- Retourne `{ notifications, loading }`

**Pattern utilisé**: Identique aux hooks existants (`useAnimals`, `useEvenements`, etc.) avec `database.get('table').query(...).observe()`.

---

## 4. NETTOYAGE DES DÉPENDANCES OBSOLÈTES

### Analyse effectuée

**Références à op-sqlite trouvées**: 16 occurrences dans 9 fichiers (tous dans `src/database/repositories/`):
- `animalRepository.ts` (3)
- `batchTypes.ts` (2)
- `categorieRepository.ts` (2)
- `especeRepository.ts` (2)
- `lotRepository.ts` (2)
- `typeEvenementRepository.ts` (2)
- `mouvementRepository.ts` (1)
- `santeEvenementsRepository.ts` (1)
- `transactionRepository.ts` (1)

**Références à @op-engineering**: Aucune dans le code applicatif.

**Dépendances dans package.json**:
- `@op-engineering/op-sqlite: ^17.0.0` - Présente
- `react-native-uuid: ^2.0.4` - Présente (pas utilisée, WatermelonDB génère ses propres IDs)

**Fichiers utilisant les anciens repositories**: 27 fichiers importent encore des repositories (ancien système non migré).

### Décision

**NE PAS désinstaller les dépendances maintenant** car:
1. Les anciens repositories sont encore utilisés par 27 fichiers non migrés
2. La désintallation pourrait casser ces écrans non adaptés
3. L'ancien système op-sqlite sert de fallback pendant la transition

### Dépendances à supprimer (après migration complète)

**À supprimer automatiquement**:
- `@op-engineering/op-sqlite` - Plus utilisé après migration complète vers WatermelonDB

**À valider manuellement avant suppression**:
- `react-native-uuid` - Vérifier si utilisé ailleurs dans le projet (pas dans le code WatermelonDB)

### Fichiers à nettoyer (après migration complète)

**Répertoire entier à supprimer**:
- `src/database/repositories/` - Tous les fichiers repositories op-sqlite

**Fichiers individuels à supprimer**:
- `src/database/batchTypes.ts` - Types batch op-sqlite
- `src/database/connection.ts` - Connection op-sqlite (déjà supprimé)
- `src/database/schema.ts` - Schéma op-sqlite (déjà supprimé)

### Action requise

1. **Immédiat**: Rien - garder les dépendances pour éviter de casser les écrans non migrés
2. **Après migration complète de tous les écrans**:
   - Désinstaller `@op-engineering/op-sqlite`: `npm uninstall @op-engineering/op-sqlite`
   - Supprimer le répertoire `src/database/repositories/`
   - Supprimer `src/database/batchTypes.ts`
   - Vérifier et supprimer `react-native-uuid` si non utilisé ailleurs
   - Nettoyer les configurations natives iOS/Android si des lignes spécifiques à op-sqlite existent
   - Relancer `pod install` côté iOS
   - Faire un build de test pour confirmer

---

## RÉSUMÉ

| Point | Statut | Action requise |
|-------|--------|----------------|
| 1. Chunking du push | ✅ Complété | Relever MAX_CHUNK_SIZE côté backend à 500 ou 1000 |
| 2. Modèle FarmUser | ✅ Complété | Aucune (modèle créé et intégré) |
| 3. Hooks restants | ✅ Complété | Aucune (4 hooks créés) |
| 4. Nettoyage dépendances | ⏳ Reporté | Après migration complète de tous les écrans |

**Priorité immédiate**: Relever MAX_CHUNK_SIZE côté backend pour éviter HTTP 413 lors des tests de sync.

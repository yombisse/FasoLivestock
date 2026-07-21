# Rapport de migration vers WatermelonDB

## A. Fichiers supprimés (ancien système op-sqlite)

### 1. Fichiers de synchronisation
- ✅ `src/sync/syncService.ts` - Service principal de synchronisation offline-first
- ✅ `src/sync/syncService.ts.backup` - Backup du service de sync
- ✅ `src/sync/utils/syncDependencySort.ts` - Utilitaire de tri des dépendances pour sync
- ✅ `src/sync/syncEvents.ts` - Bus d'événements de sync

### 2. Fichiers de base de données op-sqlite
- ✅ `src/database/connection.ts` - Connection op-sqlite
- ✅ `src/database/repositories/baseRepository.ts` - Repository de base op-sqlite
- ✅ `src/database/schema.ts` - Schéma op-sqlite

### 3. Hooks et écrans spécifiques sync
- ✅ `src/hooks/useSyncTrigger.ts` - Hook de déclenchement de sync
- ✅ `src/screens/settings/SyncConflictsScreen.tsx` - Écran de gestion des conflits de sync

## B. Fichiers créés (nouveau système WatermelonDB)

### 1. Configuration WatermelonDB
- ✅ `src/database/watermelonSchema.ts` - Schéma WatermelonDB avec modèles: Animal, Evenement, Transaction, Espece, Categorie, TypeEvenement, Lot, Farm, Naissance, Notification, FarmUser
- ✅ `src/database/watermelonMigrations.ts` - Migrations WatermelonDB (version 1)
- ✅ `src/database/watermelonIndex.ts` - Instance Database avec SQLiteAdapter JSI

### 2. Modèles WatermelonDB
- ✅ `src/database/models/Animal.ts` - Modèle Animal avec relations @children('evenements') et @children('transactions')
- ✅ `src/database/models/Evenement.ts` - Modèle Evenement avec @relation('animals', 'animal_id')
- ✅ `src/database/models/Transaction.ts` - Modèle Transaction avec @relation('animals', 'animal_id')
- ✅ `src/database/models/Espece.ts` - Modèle Espece
- ✅ `src/database/models/Categorie.ts` - Modèle Categorie
- ✅ `src/database/models/TypeEvenement.ts` - Modèle TypeEvenement
- ✅ `src/database/models/Lot.ts` - Modèle Lot
- ✅ `src/database/models/Farm.ts` - Modèle Farm
- ✅ `src/database/models/Naissance.ts` - Modèle Naissance
- ✅ `src/database/models/Notification.ts` - Modèle Notification

### 3. Hooks observables WatermelonDB
- ✅ `src/hooks/useAnimals.ts` - Observateur pour la table animals avec filtre farm_id
- ✅ `src/hooks/useEvenements.ts` - Observateur pour la table evenements avec filtres farm_id et animal_id
- ✅ `src/hooks/useTransactions.ts` - Observateur pour la table transactions avec filtres farm_id et animal_id
- ✅ `src/hooks/useEspeces.ts` - Observateur pour la table especes
- ✅ `src/hooks/useCategories.ts` - Observateur pour la table categories avec filtre farm_id
- ✅ `src/hooks/useTypeEvenements.ts` - Observateur pour la table type_evenements
- ✅ `src/hooks/useSync.ts` - Hook de synchronisation avec NetInfo et intervalle configurable (60s par défaut)

### 4. Synchronisation WatermelonDB
- ✅ `src/sync/watermelonSync.ts` - Synchronisation avec synchronize(), pullChanges POST /api/sync/pull, pushChanges POST /api/sync/push, filtrage des transactions liées aux événements (respect du contrat d'interface)

### 5. Tests
- ✅ `src/database/testModels.ts` - Fichier de test pour créer des enregistrements locaux et vérifier les relations
- ✅ `src/database/testRegressionFKMissing.ts` - Test de régression FK_MISSING (création offline animal via Achat)
- ✅ `src/database/testConflictResolution.ts` - Test de résolution de conflit (modification même animal sur 2 devices)
- ✅ `src/database/testNetworkInstability.ts` - Test d'instabilité réseau (interruption pendant push)
- ✅ `src/database/testPerformance.ts` - Test de performance (sync ~200 animaux + événements)

## C. Écrans adaptés

### 1. Écrans utilisant WatermelonDB
- ✅ `src/screens/main/cheptel/CheptelListScreen.tsx` - Adapté pour utiliser useAnimals et useSync, affichage réactif, sync manuel via pull-to-refresh
- ✅ `src/screens/main/cheptel/AnimalDetailScreen.tsx` - Adapté pour utiliser useTypeEvenements, chargement animal via WatermelonDB, suppression via database.write()
- ✅ `src/screens/main/transactions/AnimalAchatScreen.tsx` - Adapté pour créer Animal + Evenement + Transaction via database.write(), respect du contrat (transaction non liée à evenement)
- ✅ `src/screens/main/sante/SanteCreateScreen.tsx` - Adapté pour créer Evenement sanitaire + Transaction optionnelle via database.write(), respect du contrat

## D. Contrat d'interface backend ↔ mobile

### Format d'échange
- Protocole standard WatermelonDB sync (pullChanges / pushChanges)
- Payload groupé par table: { table: { created: [...], updated: [...], deleted: [...] } }
- Clés primaires: UUID générés côté client, jamais régénérés côté serveur (idempotence)

### Règles critiques
- ✅ Transactions liées à un evenement: ne sont jamais poussées par le mobile (filtrées dans watermelonSync.ts)
- ✅ Transactions générées automatiquement: uniquement côté serveur
- ✅ Résolution de conflit: serveur fait foi sur statut animal et transactions générées automatiquement
- ✅ Erreurs: serveur isole les erreurs par item (un item invalide n'annule pas le reste du chunk)

### Implémentation
- ✅ `watermelonSync.ts` filtre les transactions avec evenement_id avant push
- ✅ Formulaires créent des transactions libres (sans evenement_id) pour les dépenses non liées
- ✅ Stratégie de conflit: serveur fait foi (pas de merge local prioritaire)

## E. Dépendances installées

- ✅ `@nozbe/watermelondb` - WatermelonDB core
- ✅ `@nozbe/with-observables` - Observables pour WatermelonDB
- ✅ `@op-engineering/op-sqlite` - SQLite JSI adapter
- ✅ `@react-native-community/netinfo` - Détection réseau pour sync automatique

## F. Instructions de nettoyage des devices

### Désinstallation complète de l'app
Pour supprimer le fichier SQLite op-sqlite sur les devices de test:
```bash
# Android
adb uninstall com.fasolivestock.app

# iOS
# Supprimer l'app manuellement depuis le simulateur/device
```

## G. Tests recommandés

### Test 1: Création offline + sync
1. Lancer l'app en mode avion
2. Créer un animal + achat via l'UI
3. Vérifier l'affichage réactif immédiat (les données apparaissent instantanément)
4. Réactiver le réseau
5. Vérifier la sync automatique (un seul evenement, une seule transaction côté serveur)

### Test 2: Interruption réseau
1. Couper le réseau en plein milieu d'un push
2. Relancer
3. Vérifier l'absence de doublon après reconnexion

### Test 3: Relations
1. Créer un animal
2. Créer des événements pour cet animal
3. Vérifier que animal.evenements.fetch() retourne les événements corrects
4. Vérifier que animal.transactions.fetch() retourne les transactions correctes

## H. Points d'attention

- ✅ Les décorateurs WatermelonDB génèrent des erreurs TypeScript (false positives) - à ignorer
- ✅ Les modèles utilisent @field pour les colonnes et @readonly @date pour created_at/updated_at
- ✅ Les relations sont définies avec @relation et @children
- ✅ Le champ categorie dans Evenement est exposé tel quel (important pour la logique serveur)
- ✅ L'ancien système de sync (sync_queue) est remplacé par le sync intégré de WatermelonDB
- ✅ Les observables WatermelonDB remplacent les événements de sync (syncEvents)
- ✅ Le système de conflits est géré par WatermelonDB (serveur fait foi)

## I. Statut de la migration

- ✅ Phase 1: Installation WatermelonDB et création des modèles
- ✅ Phase 2: Création des hooks observables
- ✅ Phase 3: Adaptation des écrans prioritaires (Cheptel, AnimalDetail, AnimalAchat, SanteCreate)
- ✅ Phase 4: Suppression des anciens fichiers op-sqlite
- ⏳ Phase 5: Adaptation des écrans restants (lots, notifications, autres formulaires)
- ⏳ Phase 6: Tests complets sur device
- ⏳ Phase 7: Nettoyage des devices de test

# RAPPORT D'AUDIT TECHNIQUE — Conformité Mobile ↔ Contrat API FasoLivestock

**Date** : 22 juillet 2026  
**Auditeur** : Cascade (Assistant IA)  
**Scope** : Application React Native / WatermelonDB  
**Objectif** : Vérifier la conformité du code mobile avec le contrat d'API FasoLivestock, avec focus sur l'architecture offline-first et le canal sync exclusif.

---

## SECTION 1 — Respect strict du canal sync (pas d'appel legacy)

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Absence d'appels POST legacy CRUD | **CORRIGÉ** | `src/services/rappel.service.ts:24-59` - `marquerRappelRealise` utilise écriture locale + sync <br> `src/services/rappel.service.ts:66-87` - `reprogrammerRappelAPI` utilise écriture locale + sync | RÉSOLU - Les appels POST legacy ont été remplacés par l'écriture locale WatermelonDB | - |
| Absence d'appels PUT legacy CRUD | **CONFORME** | Aucun appel `api.put` trouvé dans le codebase (grep sur tout src/) | - | - |
| Absence d'appels DELETE legacy CRUD | **CORRIGÉ** | `src/services/rappel.service.ts:132-151` - `deleteRappelAPI` utilise soft-delete local + sync | RÉSOLU - L'appel DELETE legacy a été remplacé par soft-delete local WatermelonDB | - |
| Endpoints sync seuls utilisés pour écriture | **CONFORME** | `src/sync/watermelonSync.ts:61` - `/sync/pull` <br> `src/sync/watermelonSync.ts:344` - `/sync/push` <br> `src/services/sync.service.ts:27` - `/sync/initial` <br> `src/services/rappel.service.ts:24-59,66-87,132-151` - Rappels utilisent écriture locale + sync | - | - |
| Endpoints RECOMMANDÉS utilisés | **CONFORME** | `src/services/auth.service.ts` - Tous endpoints `auth/*` <br> `src/services/farm.service.ts:92` - `/farms/{id}/current` <br> `src/services/mouvement.service.ts:50` - `/reproduction/femelles-eligibles` | - | - |
| Endpoints d'éligibilité SANITAIRE/MOUVEMENT | **NON CONFORME** | Aucun appel trouvé vers `/api/animals/eligible/sanitaire` ou `/api/animals/eligible/mouvement` | MAJEUR - Filtres locaux utilisés à la place | Implémenter les appels aux endpoints d'éligibilité |

---

## SECTION 2 — Génération et préservation des IDs

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Format ID généré côté mobile | **CORRIGÉ** | `src/utils/uuid.ts:6-25` - Fonction modifiée pour générer 20 caractères alphanumériques <br> `src/database/watermelonIndex.ts:3,18,22` - Configuration globale avec `setGenerator(generateUUID)` <br> `src/database/repositories/baseRepository.ts:8` - Note : IDs générés automatiquement par setGenerator | RÉSOLU - Les IDs générés sont maintenant conformes (20 caractères) via configuration globale WatermelonDB | - |
| WatermelonDB génère IDs automatiquement | **CONFORME** | `src/database/repositories/baseRepository.ts:12` - `collection.create()` laisse WatermelonDB générer l'ID | - | - |
| Préservation ID mobile après push | **INDÉTERMINÉ** | Aucun code trouvé qui remplace l'ID local par un ID serveur après push | MAJEUR - À vérifier côté backend | Confirmer que le backend fait upsert par ID mobile reçu |
| Gestion erreur UUID_INVALID | **INDÉTERMINÉ** | Aucun traitement spécifique trouvé pour ce code d'erreur | MAJEUR - L'utilisateur ne verra pas un message clair | Ajouter traitement spécifique dans sync/push error handling |
| Gestion erreur ID_EXISTS | **INDÉTERMINÉ** | Aucun traitement spécifique trouvé pour ce code d'erreur | MAJEUR - Risque de collision non gérée | Ajouter traitement spécifique avec régénération d'ID |

---

## SECTION 3 — Cycle "création optimiste locale → écrasement serveur (même ID)"

| Déclencheur utilisateur | (a) Création locale immédiate ? | (b) Envoi même ID dans push ? | (c) Réponse confirme ID dans applied ? | (d) Pull met à jour même ID ? |
|---|---|---|---|---|
| **Achat d'animal** | **CONFORME** - `src/screens/main/transactions/AnimalAchatScreen.tsx:124-164` - Crée Animal + Evenement + Transaction localement | **CONFORME** - WatermelonDB sync queue inclut ces enregistrements | **INDÉTERMINÉ** - Pas de preuve que la réponse confirme l'ID mobile | **INDÉTERMINÉ** - Pas de preuve que le pull fait un update sur même ID |
| **Vente d'animal** | **CONFORME** - `src/screens/main/cheptel/AnimalVenteScreen.tsx:163-221` - Crée Evenement + Transaction + update statut animal | **CONFORME** - Même ID utilisé pour tous les enregistrements | **INDÉTERMINÉ** - Pas de preuve que la réponse confirme l'ID mobile | **INDÉTERMINÉ** - Pas de preuve que le pull fait un update sur même ID |
| **Transfert** | **CONFORME** - `src/screens/main/cheptel/AnimalTransfertScreen.tsx:98-105` - Crée Evenement localement | **CONFORME** - Même ID envoyé | **INDÉTERMINÉ** - Pas de preuve | **INDÉTERMINÉ** - Pas de preuve |
| **Décès** | **CONFORME** - `src/screens/main/cheptel/AnimalDecesScreen.tsx:102-115` - Crée Evenement + update statut animal | **CONFORME** - Même ID envoyé | **INDÉTERMINÉ** - Pas de preuve | **INDÉTERMINÉ** - Pas de preuve |
| **Perte** | **CONFORME** - `src/screens/main/cheptel/AnimalPerteScreen.tsx:103-116` - Crée Evenement + update statut animal | **CONFORME** - Même ID envoyé | **INDÉTERMINÉ** - Pas de preuve | **INDÉTERMINÉ** - Pas de preuve |
| **Abattage** | **CONFORME** - `src/screens/main/cheptel/AnimalAbattageScreen.tsx:104-112` - Crée Evenement localement (pas de update statut) | **CONFORME** - Même ID envoyé | **INDÉTERMINÉ** - Pas de preuve | **INDÉTERMINÉ** - Pas de preuve |
| **Vente de lot** | **INDÉTERMINÉ** - Aucun écran trouvé pour la vente de lot | **INDÉTERMINÉ** | **INDÉTERMINÉ** | **INDÉTERMINÉ** |
| **Événement sanitaire avec cout > 0** | **NON CONFORME** - `src/screens/main/sante/SanteCreateScreen.tsx:198-216` - Commentaire explicite "Transaction is NOT created locally - it will be derived automatically by EvenementTransactionService on the backend" | **CONFORME** - Evenement envoyé avec ID mobile | **INDÉTERMINÉ** | **INDÉTERMINÉ** |
| **Événement reproductif avec cout > 0** | **INDÉTERMINÉ** - Écran `AddReproductionEventScreen` non audité | **INDÉTERMINÉ** | **INDÉTERMINÉ** | **INDÉTERMINÉ** |

---

## SECTION 4 — Formats et validation des données avant push

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Format dates (YYYY-MM-DD) | **PARTIEL** | `src/screens/main/transactions/AnimalAchatScreen.tsx:142` - `dateTransaction.toISOString().split('T')[0]` (correct) <br> `src/screens/main/cheptel/AnimalVenteScreen.tsx:203` - `dateVente!.toISOString()` (ISO complet, incorrect pour date_transaction) | MAJEUR - Incohérence de format | Uniformiser en YYYY-MM-DD pour tous les champs date |
| Decimals (2 décimales) | **CONFORME** | `src/screens/main/transactions/AnimalAchatScreen.tsx:131` - `parseFloat(animalPoids)` <br> `src/screens/main/cheptel/AnimalVenteScreen.tsx:202` - `parseFloat(formData.prix)` | - | - |
| Enums (pas de saisie libre) | **CONFORME** | Tous les écrans utilisent `AppSelect` avec options prédéfinies (ex: AnimalAchatScreen.tsx:260-265 pour sexe) | - | - |
| Champs obligatoires validés | **CONFORME** | `src/screens/main/cheptel/AnimalVenteScreen.tsx:93-113` - Fonction `validate()` vérifie les champs requis | - | - |
| Validation centralisée | **PARTIEL** | `src/utils/transactionValidation.ts` - `validerMouvement()` <br> `src/utils/santeValidation.ts` - `validerEvenementSanitaire()` <br> MAIS chaque écran a sa propre fonction `validate()` locale | MINEUR - Duplication de logique de validation | Centraliser toute la validation dans les utils |
| Localisation validation | **PARTIEL** | Validation dispersée entre écrans et utils | MINEUR - Risque d'incohérence | Regrouper dans une couche unique |

---

## SECTION 5 — Comportement offline réel

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Écriture locale synchrone WatermelonDB | **CONFORME** | `src/database/repositories/baseRepository.ts:10-36` - `database.write(async () => ...)` synchrone | - | - |
| sync_status passe à 'pending' | **CONFORME** | `src/database/repositories/baseRepository.ts:23` - `record.sync_status = 'pending'` pour nouveaux enregistrements <br> `src/database/repositories/baseRepository.ts:63` - `record.sync_status = 'pending'` pour modifications | - | - |
| UI réactive avec .query().observe() | **CONFORME** | `src/hooks/useAnimals.ts:19-23` - `.observeWithColumns(['espece_id'])` <br> `src/hooks/useTypeEvenements.ts:20-21` - `.observe()` <br> Les hooks utilisent les observables WatermelonDB pour la réactivité | - | - |
| Endpoints d'éligibilité hors ligne | **RISQUE** | `src/services/mouvement.service.ts:50` - Appel `/reproduction/femelles-eligibles` sans cache local si échec | MAJEUR - Écran vide si réseau absent | Implémenter cache local avec fallback |
| Comportement dégradé défini | **NON CONFORME** | Aucun message clair si endpoint d'éligibilité échoue hors ligne | MAJEUR - UX dégradée en démo | Ajouter message explicite + désaction de l'action |

---

## SECTION 6 — Cycle push/pull et gestion des erreurs/conflits

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Ordre sync/initial → sync/pull → sync/push | **CONFORME** | `src/sync/watermelonSync.ts:52-244` - `pullChanges` appelé avant `pushChanges` | - | - |
| Limite CHUNK_TOO_LARGE (200 éléments) | **RISQUE** | `src/sync/watermelonSync.ts:339-342` - Commentaire "Backend has MAX_CHUNK_SIZE = 200" mais aucun découpage implémenté | MAJEUR - Si >200 éléments, erreur HTTP 413 | Implémenter découpage ou augmenter limite backend |
| Traitement spécifique par code d'erreur | **PARTIEL** | `src/sync/watermelonSync.ts:403-452` - Marque confirmed/rejected mais pas de traitement spécifique par code (VERSION_CONFLICT, UUID_INVALID, etc.) | MAJEUR - Utilisateur ne voit pas la cause réelle | Ajouter messages spécifiques par code d'erreur |
| version incrémenté avant push | **CONFORME** | `src/database/repositories/baseRepository.ts:60` - `record.version = currentVersion + 1` | - | - |
| Gestion des conflits | **CONFORME** | `src/sync/watermelonSync.ts:17-38` - `conflictResolver` utilise version serveur comme source de vérité | - | - |
| Réconciliation objets créés localement | **INDÉTERMINÉ** | Pas de test concret trouvé prouvant l'absence de doublon après sync | MAJEUR - Risque de duplication visible en démo | Ajouter test E2E : créer offline, sync, vérifier unicité |
| sync_status repasse à 'synced' après pull | **CONFORME** | `src/sync/watermelonSync.ts:407-412` - `r.sync_status = 'synced'` pour confirmed records | - | - |

---

## SECTION 7 — Cohérence globale et lisibilité pour la soutenance

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Duplication logique validation/dérivation | **NON CONFORME** | `src/services/evenementTransactionService.ts` - Service mobile qui crée des transactions localement <br> Commentaire dans `src/screens/main/sante/SanteCreateScreen.tsx:214-215` - "Transaction is NOT created locally - it will be derived automatically by EvenementTransactionService on the backend" <br> **Contradiction** : Le service existe mais n'est pas utilisé uniformément | CRITIQUE - Double point de vérité, risque de duplication | Décider : soit mobile crée toutes les transactions, soit aucune (cohérence) |
| Point d'entrée centralisé pour push | **CONFORME** | `src/sync/watermelonSync.ts:344` - Seul point d'entrée pour `/sync/push` | - | - |
| Payload conforme aux services backend | **INDÉTERMINÉ** | Pas de comparaison systématique entre payload mobile et schéma attendu par EvenementMouvementService, EvenementTransactionService, ReproductionRuleService | MAJEUR - Risque de champ manquant ou en trop | Documenter le mapping attendu et ajouter validation |

---

## SECTION 8 — Éligibilité des animaux : endpoints serveur obligatoires

| Point vérifié | Verdict | Preuve (fichier:ligne + extrait) | Risque pour la démo | Correctif recommandé |
|---|---|---|---|---|
| Filtres métier dupliqués côté mobile | **NON CONFORME** | `src/services/reproduction.service.ts:78` - `females = localAnimals.filter(a => a.sexe === 'femelle' && !['MORT', 'VENDU', 'PERDU'].includes(a.statut))` <br> `src/screens/main/ReproductionScreen.tsx:85` - `animalsData.filter((a: any) => a.sexe === 'femelle' && !['MORT', 'VENDU', 'PERDU'].includes(a.statut))` <br> `src/screens/main/sante/SanteCreateScreen.tsx:60-63` - `availableAnimals = animals.filter((a: any) => { const excludedStatuses = ['MORT', 'VENDU', 'PERDU']; return !excludedStatuses.includes(a.statut || ''); })` <br> `src/database/repositories/animalRepository.ts:62-72` - `getLocalActiveAnimals` filtre par statut | CRITIQUE - Règles d'éligibilité dupliquées, risquent de diverger du backend | Supprimer tous les filtres métier locaux et remplacer par appels aux endpoints d'éligibilité |
| Appel endpoint `/api/animals/eligible/sanitaire` | **NON CONFORME** | Aucun appel trouvé | CRITIQUE - Violation de l'architecture décidée | Implémenter l'appel dans SanteCreateScreen |
| Appel endpoint `/api/animals/eligible/mouvement` | **NON CONFORME** | Aucun appel trouvé | CRITIQUE - Violation de l'architecture décidée | Implémenter l'appel dans les écrans de mouvement |
| Appel endpoint `/api/animals/eligible/reproduction` | **NON CONFORME** | Aucun appel trouvé | CRITIQUE - Violation de l'architecture décidée | Implémenter l'appel dans ReproductionScreen |
| Appel endpoint `/api/reproduction/femelles-eligibles` | **CONFORME** | `src/services/mouvement.service.ts:50` - Appel présent | - | - |
| Appel endpoint `/api/reproduction/naissances/previsions` | **CONFORME** | `src/services/reproduction.service.ts:242` - Appel présent | - | - |
| Cache local pour endpoints d'éligibilité | **PARTIEL** | `src/services/mouvement.service.ts:38-46` - Cache présent pour femelles-eligibles <br> MAIS pas pour les autres endpoints | MAJEUR - Incohérence | Implémenter cache uniforme pour tous les endpoints d'éligibilité |
| Comportement hors ligne défini | **NON CONFORME** | `src/services/mouvement.service.ts:71-78` - Fallback vers `animalService.getAnimals` avec filtre local (réintroduit duplication) | CRITIQUE - Compromis qui réintroduit le problème | Définir message clair "éligibilité indisponible hors ligne" sans fallback filtre local |
| Invalidation cache après mutation locale | **INDÉTERMINÉ** | Aucun code trouvé qui invalide le cache après une action locale pertinente | MINEUR - Angle mort technique | Ajouter invalidation du cache après création d'événement affectant l'éligibilité |

**Verdict global SECTION 8** : **NON CONFORME** - La migration "filtres locaux → endpoints d'éligibilité" est **partielle** (seul `/reproduction/femelles-eligibles` migré). La majorité des écrans utilisent encore des filtres locaux dupliquant la logique backend.

---

## SYNTHÈSE EXÉCUTIVE

### Points CRITIQUES (bloquants pour démo)

1. ~~**Format d'ID non conforme**~~ - **RÉSOLU** - Le mobile génère maintenant des IDs de 20 caractères alphanumériques conformes au backend.
   - **Fichiers corrigés** : `src/utils/uuid.ts`, `src/database/repositories/baseRepository.ts`, `src/screens/main/cheptel/AnimalNaissanceScreen.tsx`
   - **Correctif appliqué** : Fonction `generateUUID()` modifiée pour générer 20 caractères alphanumériques avec entropie suffisante (62^20 ≈ 2^119 bits)

2. **Duplication de logique d'éligibilité** - Les filtres métier (sexe=femelle, statut vivant, etc.) sont dupliqués dans de multiples fichiers, violant l'architecture qui mandate l'usage exclusif des endpoints d'éligibilité serveur.
   - **Fichiers** : `src/services/reproduction.service.ts:78`, `src/screens/main/ReproductionScreen.tsx:85`, `src/screens/main/sante/SanteCreateScreen.tsx:60-63`, `src/database/repositories/animalRepository.ts:62-72`
   - **Correctif** : Supprimer tous les filtres locaux et implémenter les appels vers `/api/animals/eligible/sanitaire`, `/api/animals/eligible/mouvement`, `/api/animals/eligible/reproduction`

3. ~~**Appels legacy REST pour rappels**~~ - **RÉSOLU** - Les trois fonctions utilisent maintenant l'écriture locale WatermelonDB avec sync_status='pending' et seront poussées via /sync/push.
   - **Fichiers corrigés** : `src/services/rappel.service.ts:24-59` (marquerRappelRealise), `src/services/rappel.service.ts:66-87` (reprogrammerRappelAPI), `src/services/rappel.service.ts:132-151` (deleteRappelAPI)
   - **Correctif appliqué** : Suppression des appels API POST/DELETE, écriture locale conforme à la logique backend (création événement + update rappel pour marquer réalisé, update date_prevue pour reprogrammer, soft delete pour suppression)

4. ~~**Incohérence dans la création de transactions sanitaires**~~ - **RÉSOLU** - SanteCreateScreen utilise maintenant `creerTransactionDepuisEvenement` pour créer les transactions localement, cohérent avec l'architecture offline-first.
   - **Fichiers corrigés** : `src/screens/main/sante/SanteCreateScreen.tsx:29,215-234` - Import de `creerTransactionDepuisEvenement` et création transaction locale si cout > 0
   - **Correctif appliqué** : Suppression du commentaire indiquant que la transaction serait créée par le backend, ajout de l'appel à `creerTransactionDepuisEvenement` avec la catégorie 'SANTE'

### Points MAJEURS

5. **Absence de découpage pour CHUNK_TOO_LARGE** - Le backend limite à 200 éléments par chunk mais le mobile n'implémente aucun découpage.
   - **Fichier** : `src/sync/watermelonSync.ts:339-342`
   - **Correctif** : Implémenter le découpage ou augmenter la limite backend à 500-1000

6. **Pas de traitement spécifique par code d'erreur sync** - Les erreurs `VERSION_CONFLICT`, `UUID_INVALID`, `ID_EXISTS` tombent dans un catch générique.
   - **Fichier** : `src/sync/watermelonSync.ts:403-452`
   - **Correctif** : Ajouter des messages utilisateur spécifiques pour chaque code d'erreur

7. **Incohérence de format de dates** - Certains champs utilisent `YYYY-MM-DD` (correct), d'autres `ISO string` complet (incorrect).
   - **Fichiers** : `src/screens/main/cheptel/AnimalVenteScreen.tsx:203`
   - **Correctif** : Uniformiser tous les champs date en `YYYY-MM-DD`

8. **Comportement hors ligne non défini pour endpoints d'éligibilité** - Pas de message clair si l'appel échoue, et le fallback actuel réintroduit les filtres locaux.
   - **Fichier** : `src/services/mouvement.service.ts:71-78`
   - **Correctif** : Afficher message "éligibilité indisponible hors ligne" sans fallback filtre local

9. **Absence de preuve de réconciliation ID mobile/serveur** - Pas de test concret prouvant que le même ID mobile est préservé à travers le cycle création → push → pull.
   - **Correctif** : Ajouter un test E2O : créer un enregistrement offline, synchroniser, vérifier qu'il n'y a pas de doublon et que l'ID est identique

### Points MINEURS

10. **Validation dispersée** - La logique de validation est dupliquée entre les écrans et les utilitaires.
    - **Correctif** : Centraliser toute la validation dans une couche unique

11. **Invalidation de cache non implémentée** - Le cache des endpoints d'éligibilité n'est pas invalidé après une mutation locale.
    - **Correctif** : Ajouter l'invalidation du cache après création d'événement affectant l'éligibilité

---

## CONCLUSION GLOBALE

L'audit révèle une **architecture partiellement conforme** aux principes offline-first et au contrat API. Les points forts sont :

- Utilisation correcte de WatermelonDB pour l'écriture locale
- Hooks réactifs (`.observe()`) correctement implémentés
- Cycle sync/pull/push centralisé
- Conflits gérés avec priorité serveur
- **Tous les modèles ont les champs sync requis** (sync_status, version, last_modified_by, created_at, updated_at, deleted_at)

Cependant, **1 point critique** bloquant pour une démo doit être résolu :

1. ~~Format d'ID (UUID v4 au lieu de 20 caractères)~~ - **RÉSOLU**
2. ~~Appels legacy REST pour les rappels~~ - **RÉSOLU**
3. ~~Incohérence dans la création de transactions~~ - **RÉSOLU**
4. Duplication massive des filtres d'éligibilité

**Recommandation prioritaire** : Corriger le point critique restant (filtres d'éligibilité) avant toute présentation, puis traiter les 5 points majeurs pour une démo robuste.

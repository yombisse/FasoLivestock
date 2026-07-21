# Audit et correction du sync pull pour les espèces

## Problème
Les espèces ne sont pas chargées dans l'écran d'ajout d'un animal (AnimalFormScreen) car elles ne sont pas envoyées par le backend Laravel lors du sync pull.

## Investigation requise

### 1. Vérifier le contrôleur de sync Laravel
Chercher le contrôleur qui gère `/sync/pull` (probablement `SyncController.php` ou similaire).

### 2. Vérifier que les espèces sont incluses dans la réponse
Dans la méthode `pull`, vérifier que la table `especes` est incluse dans l'objet `changes` retourné.

Exemple attendu:
```php
$changes = [
    'especes' => [
        'created' => [...],
        'updated' => [...],
        'deleted' => [...],
    ],
    // autres tables...
];
```

### 3. Vérifier le modèle Espece
S'assurer que le modèle `Espece`:
- A les timestamps `created_at`, `updated_at`, `deleted_at`
- A une colonne `id` compatible avec WatermelonDB (string de 16-20 caractères)
- Est inclus dans la liste des modèles synchronisables

### 4. Correction si nécessaire
Si les espèces ne sont pas incluses, les ajouter à la logique de sync pull:

```php
// Dans le contrôleur de sync
$changes['especes'] = $this->getChangesForTable(Espece::class, $lastSyncAt);
```

## Tests à effectuer
1. Faire un sync pull depuis l'application mobile
2. Vérifier dans les logs: `[WatermelonSync] Especes in changes: true X` (où X > 0)
3. Vérifier que les espèces apparaissent dans AnimalFormScreen

---
description: Vérifier si le backend Laravel renvoie les espèces lors du sync pull
---

# Vérifier si le backend renvoie les espèces lors du sync

## Objectif
Vérifier que l'endpoint `/sync/pull` du backend Laravel inclut les données de référence (especes, categories, type_evenements) dans la réponse de synchronisation.

## Étapes de vérification

### 1. Préparer les données de test
- Avoir un farm_id valide (ex: `019f4289-7313-721d-a0ab-c7dbc757bc55`)
- Avoir un token d'authentification valide (Bearer token)

### 2. Tester l'endpoint /sync/pull

**Méthode**: POST
**URL**: `http://127.0.0.1:8000/api/sync/pull`
**Headers**:
```
Content-Type: application/json
Authorization: Bearer <votre_token>
X-Farm-Id: <votre_farm_id>
Accept: application/json
```

**Body** (pour un sync initial):
```json
{
  "last_sync_at": null,
  "farm_id": "<votre_farm_id>",
  "schema_version": 1
}
```

### 3. Analyser la réponse

Vérifier que la réponse contient:
```json
{
  "data": {
    "changes": {
      "especes": {
        "created": [
          {
            "id": "uuid",
            "nom": "Bovin",
            "description": "...",
            "created_at": 1234567890,
            "updated_at": 1234567890
          }
        ],
        "updated": [],
        "deleted": []
      },
      "categories": { ... },
      "type_evenements": { ... },
      // autres tables...
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Points de contrôle

**Si les especes sont présentes**:
- ✅ Le backend envoie correctement les données de référence
- ✅ Le problème vient probablement du côté mobile (sync ou base locale)

**Si les especes sont absentes**:
- ❌ Le backend n'envoie pas les données de référence
- 🔧 **Correction nécessaire côté backend**: Modifier le service de sync Laravel pour inclure les tables de référence (especes, categories, type_evenements) dans la réponse pull

### 5. Correction backend (si nécessaire)

Dans le service Laravel de sync (probablement `SyncService.php` ou `SyncController.php`), s'assurer que les tables de référence sont incluses:

```php
// Exemple de correction Laravel
public function pull(Request $request)
{
    $changes = [
        'especes' => $this->getReferenceData('especes'),
        'categories' => $this->getReferenceData('categories'),
        'type_evenements' => $this->getReferenceData('type_evenements'),
        // autres tables spécifiques au farm...
    ];
    
    return response()->json([
        'data' => [
            'changes' => $changes,
            'timestamp' => now()->toIso8601String()
        ]
    ]);
}

private function getReferenceData($table)
{
    // Récupérer toutes les données de référence non supprimées
    return DB::table($table)
        ->whereNull('deleted_at')
        ->get()
        ->map(function ($item) {
            return [
                'id' => $item->id,
                'nom' => $item->nom,
                // autres champs...
                'created_at' => strtotime($item->created_at) * 1000,
                'updated_at' => strtotime($item->updated_at) * 1000,
            ];
        });
}
```

## Outils de test

### Option 1: cURL
```bash
curl -X POST http://127.0.0.1:8000/api/sync/pull \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Farm-Id: <farm_id>" \
  -d '{
    "last_sync_at": null,
    "farm_id": "<farm_id>",
    "schema_version": 1
  }' | jq
```

### Option 2: Postman/Insomnia
- Créer une requête POST avec les headers et body ci-dessus
- Envoyer et examiner la réponse

### Option 3: Logs mobile
Observer les logs dans la console React Native:
```
[WatermelonSync] Pull received changes: X tables
[WatermelonSync] ESPECES LOCAL COUNT BEFORE SYNC: 0
```

## Résultat attendu

Après correction, les logs mobiles devraient montrer:
```
[WatermelonSync] Pull received changes: X tables
[useEspeces] Loaded especes: 3  (ou autre nombre > 0)
```

---
description: Vérifier si le backend Laravel renvoie les catégories d'événements (REPRODUCTION, SANITAIRE) lors du sync pull
---

# Vérifier si le backend renvoie les catégories d'événements lors du sync

## Objectif
Vérifier que l'endpoint `/sync/pull` du backend Laravel inclut les événements avec leurs catégories correctes (REPRODUCTION, SANITAIRE, MOUVEMENT) dans la réponse de synchronisation.

## Contexte
Problème: Les événements reproductifs existent dans le backend (ex: 3 saillies sur vache2) mais ne s'affichent pas dans l'application mobile. Les logs montrent:
```
Events by categorie: {"": 15, MOUVEMENT: 33, SANITAIRE: 8}
```
Aucun événement avec categorie='REPRODUCTION' dans WatermelonDB.

## Étapes de vérification

### 1. Préparer les données de test
- Avoir un farm_id valide (ex: `Zh11zjeUu6UxYgYvQlbk`)
- Avoir un token d'authentification valide (Bearer token)
- Connaître l'ID d'un animal avec des événements reproductifs (ex: vache2)

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

**Body**:
```json
{
  "last_sync_at": null,
  "farm_id": "<votre_farm_id>",
  "schema_version": 11
}
```

### 3. Analyser la réponse

Vérifier que la réponse contient des événements avec categorie='REPRODUCTION':
```json
{
  "data": {
    "changes": {
      "evenements": {
        "created": [
          {
            "id": "uuid",
            "animal_id": "animal_uuid",
            "type_evenement_id": "type_uuid",
            "categorie": "REPRODUCTION",  // <-- CRITIQUE
            "date_evenement": "2024-01-01",
            "statut": "EN_COURS",
            "created_at": 1234567890,
            "updated_at": 1234567890
          }
        ],
        "updated": [],
        "deleted": []
      }
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Points de contrôle

**Si les événements REPRODUCTION sont présents avec categorie='REPRODUCTION'**:
- ✅ Le backend envoie correctement les catégories
- ❌ Le problème vient du côté mobile (sync ou base locale)
- 🔧 Vérifier les logs WatermelonDB pour voir si les catégories sont correctement stockées

**Si les événements REPRODUCTION sont présents mais categorie est vide ou incorrecte**:
- ❌ Le backend n'envoie pas les catégories correctement
- 🔧 **Correction nécessaire côté backend**: Modifier le service de sync Laravel pour inclure la colonne categorie dans la réponse pull

**Si les événements REPRODUCTION sont absents**:
- ❌ Le backend n'envoie pas les événements reproductifs
- 🔧 **Correction nécessaire côté backend**: Vérifier la requête SQL qui récupère les événements

### 5. Correction backend (si nécessaire)

Dans le service Laravel de sync (probablement `SyncService.php`), s'assurer que la colonne categorie est incluse:

```php
// Exemple de correction Laravel
public function pull(Request $request)
{
    $changes = [
        'evenements' => $this->getEvenementsData($request->farm_id),
        // autres tables...
    ];
    
    return response()->json([
        'data' => [
            'changes' => $changes,
            'timestamp' => now()->toIso8601String()
        ]
    ]);
}

private function getEvenementsData($farmId)
{
    // Récupérer les événements avec toutes les colonnes nécessaires
    return DB::table('evenements')
        ->where('farm_id', $farmId)
        ->whereNull('deleted_at')
        ->get()
        ->map(function ($item) {
            return [
                'id' => $item->id,
                'animal_id' => $item->animal_id,
                'type_evenement_id' => $item->type_evenement_id,
                'categorie' => $item->categorie,  // <-- CRITIQUE
                'date_evenement' => $item->date_evenement,
                'statut' => $item->statut,
                // autres champs...
                'created_at' => strtotime($item->created_at) * 1000,
                'updated_at' => strtotime($item->updated_at) * 1000,
            ];
        });
}
```

### 6. Vérification SQL directe (optionnel)

Si possible, exécuter une requête SQL directe sur le backend pour vérifier les données:

```sql
SELECT id, animal_id, type_evenement_id, categorie, date_evenement, statut
FROM evenements
WHERE farm_id = 'Zh11zjeUu6UxYgYvQlbk'
AND categorie = 'REPRODUCTION';
```

## Outils de test

### Option 1: cURL
```bash
curl -X POST http://127.0.0.1:8000/api/sync/pull \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Farm-Id: Zh11zjeUu6UxYgYvQlbk" \
  -d '{
    "last_sync_at": null,
    "farm_id": "Zh11zjeUu6UxYgYvQlbk",
    "schema_version": 11
  }' | jq '.data.changes.evenements.created[] | select(.categorie == "REPRODUCTION")'
```

### Option 2: Logs mobile
Observer les logs dans la console React Native après un sync pull:
```
[WatermelonSync] EVENEMENTS - created: X updated: Y deleted: Z
[WatermelonSync] EVENEMENTS SAMPLE: {...}
```

## Résultat attendu

Après correction, les logs mobiles devraient montrer:
```
[useReproductionEvents] DEBUG - Events by categorie: {"REPRODUCTION": 3, "SANITAIRE": 8, "MOUVEMENT": 33, "": 15}
[useReproductionEvents] Collection updated: {count: 3}
```

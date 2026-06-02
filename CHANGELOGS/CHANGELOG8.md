# CHANGELOG 8 — Correction HTTP 204 → 200 sur les DELETE

## Correctif — `DELETE /files/:id` et `DELETE /tags/:id`

**Problème** : les deux endpoints `remove()` retournaient un body (`ApiResponse.success(...)`) avec `@HttpCode(204)`.  
HTTP 204 = No Content : un body est **interdit** par la spec HTTP.

**Fix** : `@HttpCode(204)` → `@HttpCode(200)` sur les deux controllers.

**Cohérence** : les deux endpoints retournent maintenant l'enveloppe standard `{ msg, data: null }`.

**Fichiers modifiés :**
- `files/files.controller.ts` : `@HttpCode(204)` → `@HttpCode(200)` sur `remove()`
- `tags/tags.controller.ts` : `@HttpCode(204)` → `@HttpCode(200)` sur `remove()`

---

## Contrat API mis à jour

| Endpoint          | Avant | Après                        |
| :---------------- | :---: | :--------------------------- |
| `DELETE /files/:id` | `204` | `200 {msg, data: null}`    |
| `DELETE /tags/:id`  | `204` | `200 {msg, data: null}`    |

**Fichier** : `DOSSIER TECHNIQUE/doc-app/src/data/doc-data.ts` — lignes des deux DELETE mises à jour.

---

## Tests — aucun changement de compte

Les specs TC.3.1 et FC.4.1 vérifient uniquement l'appel au service — pas le code HTTP du controller. Aucun test ajouté ou supprimé. Total unitaires : **73/73**.

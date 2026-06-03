# CHANGELOG8 - feat/api (DELETE 204↔200 annulé) - back

> **⚠️ Ce changelog documente un état intermédiaire annulé.**  
> La modification décrite ci-dessous (204 → 200) a été **revertée dans CHANGELOG 10**.  
> L'état actuel du code est `@HttpCode(204)` + `Promise<void>` (aucun body), conforme à la spec HTTP.

---

## Correctif initial — `DELETE /files/:id` et `DELETE /tags/:id`

**Problème identifié** : les deux endpoints `remove()` retournaient un body (`ApiResponse.success(...)`) avec `@HttpCode(204)`.  
HTTP 204 = No Content : un body est **interdit** par la spec HTTP.

**Fix appliqué à ce moment** : `@HttpCode(204)` → `@HttpCode(200)` sur les deux controllers, avec retour de l'enveloppe standard `{ msg, data: null }`.

**Fichiers modifiés à ce moment :**

- `files/files.controller.ts` : `@HttpCode(204)` → `@HttpCode(200)` sur `remove()`
- `tags/tags.controller.ts` : `@HttpCode(204)` → `@HttpCode(200)` sur `remove()`

---

## Contrat API à ce moment (désormais obsolète)

| Endpoint            | Avant CL8 | Après CL8               |
| :------------------ | :-------: | :---------------------- |
| `DELETE /files/:id` |   `204`   | `200 {msg, data: null}` |
| `DELETE /tags/:id`  |   `204`   | `200 {msg, data: null}` |

---

## Annulation — CHANGELOG 10

CHANGELOG 10 a réaligné les deux endpoints sur `@HttpCode(204)` + `Promise<void>` (sans body).  
**État final en production : `204 No Content`, aucun body retourné.**

| Endpoint            | État final |
| :------------------ | :--------: |
| `DELETE /files/:id` |   `204`    |
| `DELETE /tags/:id`  |   `204`    |

---

## Tests — aucun changement de compte à ce moment

Total unitaires lors de ce changelog : **73/73**.

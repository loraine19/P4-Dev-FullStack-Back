# CHANGELOG 10 — Test labels EN + DELETE tags 204

## Fix API

- `TagsController.remove()` : `@HttpCode(204)` + `Promise<void>` (aligné sur `FilesController.remove`).

## Tests

- Titres `describe` / `it` en anglais court dans tous les `*.spec.ts` et `test/*.integration.spec.ts`.
- **Résultats** :
  - `npm test` → ✅ **75/75**
  - `npm run test:integration` → ✅ **45/45**
  - `npm run test:e2e` → ✅ **12/12**

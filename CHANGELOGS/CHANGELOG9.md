# CHANGELOG9 - feat/api (auth hybride GET /auth/me) - back

## Feature — `GET /auth/me` (session verification)

**Problème** : au rechargement, les utilisateurs web (cookie httpOnly) apparaissaient comme non authentifiés car `authStore` s'initialisait depuis `localStorage`. Pas de mécanisme de vérification côté serveur.

**Fix** : nouvel endpoint `GET /auth/me` — protégé par `JwtAuthGuard`, retourne `IUserPublic`.

**Fichiers modifiés :**
- `auth/auth.service.ts` : méthode `me(userId)` → `findUniqueOrThrow` + `toUserPublic`
- `auth/auth.controller.ts` : `@Get('me') @UseGuards(JwtAuthGuard)` → `ApiResponse.success(SUCCESS_MESSAGES.AUTH.ME, data)`
- `common/constants/success-messages.ts` : `AUTH.ME` ajouté (`'Utilisateur authentifié'`)

---

## Refactoring — constants centralisées dans `security.ts`

**Avant** : `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_NAME`, `COOKIE_MAX_AGE` lus directement depuis `process.env` dans 4 fichiers différents.

**Après** : tous centralisés dans `common/constants/security.ts`.

**Fichiers modifiés :**
- `common/constants/security.ts` : `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_NAME`, `COOKIE_MAX_AGE`
- `auth/auth.module.ts` : `JwtModule.register` utilise `JWT_SECRET`/`JWT_EXPIRES_IN`
- `auth/auth.service.ts` : `generateToken` utilise `JWT_SECRET`/`JWT_EXPIRES_IN`
- `auth/auth.controller.ts` : `setCookie`/`clearCookie` utilisent `COOKIE_NAME`/`COOKIE_MAX_AGE`
- `common/guards/jwt-auth.guard.ts` : `JWT_SECRET` centralisé

---

## Feature — `comparePassword` helper

**Avant** : `download.service.ts` et `auth.service.ts` appelaient `bcrypt.compare` directement, asymétrique avec `hashPassword`.

**Fix** : `comparePassword(plain, hash)` ajouté dans `common/helpers/hash.ts`.

**Fichiers modifiés :**
- `common/helpers/hash.ts` : `comparePassword` exporté
- `auth/auth.service.ts` : `bcrypt.compare` → `comparePassword`
- `download/download.service.ts` : `bcrypt.compare` → `comparePassword`

---

## Tests

| Suite                   | Avant | Après | Delta |
| :---------------------- | :---: | :---: | :---: |
| auth.service.spec.ts    |   6   |   7   |  +1   |
| auth.controller.spec.ts |   3   |   4   |  +1   |
| **Total**               | **73** | **75** | **+2** |

Nouveaux tests : `3.1 AuthService.me()` · `AC.4.1 AuthController.me()`

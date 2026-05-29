# CHANGELOG2 - feat/auth - back

**Sprint step** : STEP 3 - US03 + US04 (gestion utilisateur, authentification)
**Branche** : `feat/auth`

**Objectif** : Authentification complète sans Passport - guard manuel hybride cookie httpOnly (web) + Bearer token (mobile), validation globale, filtres d'exception.

---

[1. Ce qui est en place](#1-ce-qui-est-en-place)
[2. Choix techniques](#2-choix-techniques)
[a. Guard hybride sans Passport](#a-guard-hybride-sans-passport)
[b. Login hybride](#b-login-hybride)
[c. Stockage token](#c-stockage-token)
[d. Validation DTOs](#d-validation-dtos)
[e. Filtres d'exception](#e-filtres-dexception)
[f. ApiResponse pattern](#f-apiresponse-pattern)
[3. Variables d'environnement requises](#3-variables-denvironnement-requises)

---

## 1. Ce qui est en place

| Thème               | Ce qui est opérationnel                                                                                        |
| :------------------ | :------------------------------------------------------------------------------------------------------------- |
| Auth endpoints      | `POST /api/v1/auth/register` · `POST /api/v1/auth/login` · `POST /api/v1/auth/logout`                          |
| Guard hybride       | Cookie httpOnly OU Bearer header - un seul `JwtAuthGuard`                                                      |
| Guard optionnel     | `OptionalJwtAuthGuard` - routes publiques avec user optionnel                                                  |
| Validation globale  | `ValidationPipe` (whitelist + forbidNonWhitelisted) sur tous les endpoints                                     |
| Filtres d'exception | `HttpExceptionFilter` + `PrismaExceptionFilter` enregistrés globalement                                        |
| Logger middleware   | `LoggerMiddleware` câblé via `NestModule.configure()` sur toutes les routes                                    |
| ApiResponse         | Helper statique `ApiResponse.success(msg, data?)` / `.error(msg)` - shape uniforme `{ status, message, data }` |
| Tests API           | Collection Postman + Newman - 11 assertions / 11 passées - rapport HTML versionné                              |

---

## 2. Choix techniques

### a. Guard hybride sans Passport

`JwtAuthGuard` implémente `CanActivate` directement - pas de Passport, pas de Strategy.

- `extractToken()` : lit le cookie d'abord (`req.cookies[ACCESS_COOKIE_NAME]`), puis le header `Authorization: Bearer`
- Un seul guard couvre web et mobile sans duplication
- `OptionalJwtAuthGuard` extend `JwtAuthGuard` et absorbe les erreurs - routes publiques avec contenu différent selon connexion

### b. Login hybride

`isMobile?: boolean` dans `LoginDto` pilote le comportement de `login()` :

- `isMobile: false` (défaut) → cookie httpOnly posé côté serveur, `access_token` absent de la réponse
- `isMobile: true` → pas de cookie, `access_token` retourné dans le body

### c. Stockage token

- Cookie : `httpOnly: true`, `secure` selon `NODE_ENV`, `sameSite: strict`, durée depuis `.env`
- Payload JWT : `{ sub: userId }` uniquement - pas d'email (minimisation des données)

### d. Validation DTOs

`class-validator` sur tous les DTOs. `strictPropertyInitialization: false` dans `tsconfig.json` - les DTOs sont hydratés par le `ValidationPipe`, jamais par constructeur.

### e. Filtres d'exception

- `HttpExceptionFilter` - formate toutes les exceptions NestJS en `{ status, message }`
- `PrismaExceptionFilter` - intercepte les erreurs Prisma (P2002 unique, P2025 not found...) et les traduit en HTTP lisibles

### f. ApiResponse pattern

Messages dans le **controller** uniquement - le service retourne des données brutes.
`ApiResponse.success(message, data?)` / `.error(message)` dans le controller, jamais dans le service.

---

## 3. Variables d'environnement requises

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
FRONTEND_URL=
ACCESS_COOKIE_NAME=
COOKIE_MAX_AGE=
NODE_ENV=
```

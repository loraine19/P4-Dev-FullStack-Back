# CHANGELOG - feat/auth

**Sprint step** : STEP 3 - US03 + US04 (gestion utilisateur, authentification)
**Branche** : `feat/auth`

**Objectif** : Authentification complète sans Passport - guard manuel hybride cookie httpOnly (web) + Bearer token (mobile), validation globale, filtres d'exception.

---

## Ce qui est en place

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

## Choix techniques

### Guard hybride sans Passport

`JwtAuthGuard` implémente `CanActivate` directement - pas de Passport, pas de Strategy.

- `extractToken()` : lit le cookie d'abord (`req.cookies[ACCESS_COOKIE_NAME]`), puis le header `Authorization: Bearer`
- Un seul guard couvre web et mobile sans duplication
- `OptionalJwtAuthGuard` extend `JwtAuthGuard` et absorbe les erreurs - routes publiques avec contenu différent selon connexion

### Login hybride

`isMobile?: boolean` dans `LoginDto` pilote le comportement de `login()` :

- `isMobile: false` (défaut) → cookie httpOnly posé côté serveur, `access_token` absent de la réponse
- `isMobile: true` → pas de cookie, `access_token` retourné dans le body

### Stockage token

- Cookie : `httpOnly: true`, `secure` selon `NODE_ENV`, `sameSite: strict`, durée depuis `.env`
- Payload JWT : `{ sub: userId }` uniquement - pas d'email (minimisation des données)

### Validation DTOs

`class-validator` sur tous les DTOs. `strictPropertyInitialization: false` dans `tsconfig.json` - les DTOs sont hydratés par le `ValidationPipe`, jamais par constructeur.

### Filtres d'exception

- `HttpExceptionFilter` - formate toutes les exceptions NestJS en `{ status, message }`
- `PrismaExceptionFilter` - intercepte les erreurs Prisma (P2002 unique, P2025 not found...) et les traduit en HTTP lisibles

### ApiResponse pattern

Messages dans le **controller** uniquement - le service retourne des données brutes.
`ApiResponse.success(message, data?)` / `.error(message)` dans le controller, jamais dans le service.

---

## Structure des fichiers notables

```
src/
  main.ts                          -  cookie-parser, CORS, ValidationPipe, prefix api/v1
  app.module.ts                    -  NestModule.configure() → LoggerMiddleware sur *
  auth/
    auth.controller.ts             -  register / login / logout / me
    auth.service.ts                -  register(), login(), logout() + helpers privés
    dto/login.dto.ts               -  isMobile?: boolean (hybrid flag)
    dto/register.dto.ts
    interfaces/auth-response.interface.ts  -  IUserPublic, IAuthResponse
  common/
    guards/jwt-auth.guard.ts       -  extractToken() cookie OU Bearer
    guards/optional-jwt-auth.guard.ts
    decorators/current-user.decorator.ts   -  @CurrentUser() → IJwtPayload
    filters/http-exception.filter.ts
    filters/prisma-exception.filter.ts
    helpers/api-response.ts        -  ApiResponse.success / .error
    interfaces/jwt-payload.interface.ts    -  IJwtPayload { sub, iat?, exp? }
    middlewares/logger.middleware.ts
    logger/logger.service.ts · logger.module.ts
  prisma/prisma.service.ts         -  extends PrismaClient, onModuleInit → $connect
postman/
  auth.postman_collection.json     -  5 scénarios register/login/logout
  newman-report.html               -  rapport de validation (11/11)
```

---

## Variables d'environnement requises

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
FRONTEND_URL=
ACCESS_COOKIE_NAME=
COOKIE_MAX_AGE=
NODE_ENV=
```

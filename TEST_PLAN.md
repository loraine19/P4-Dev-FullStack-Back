# **P4 \- BACK TEST PLAN**

[1\. Test Unitaire](#1.-test-unitaire)

[a. Logique](#logique)

[b. Outils \+ CLI](#outils-+-cli)

[c. Plan](#plan)

[2\. Test Integration — Supertest](#2.-test-integration-—-supertest)

[a. Logique](#logique-1)

[b. Outils \+ CLI](#outils-+-cli-1)

[Plan](#plan-1)

[3\. Coverage](#3.-coverage)

[a. Unit](#unit)

[b. Integration](#integration)

---

## **1\. Test Unitaire** {#1.-test-unitaire}

1. ### **Logique** {#logique}

Teste une seule classe en isolation. Les dépendances (Prisma, JwtService, bcrypt…) sont remplacées par des **faux objets** (`jest.fn()`). Aucune BDD, aucun serveur HTTP.

#### **Pattern AAA dans chaque `it()` :**

- `/* Arrange */` — prépare les données et configure les mocks
- `/* Act */` — appelle la méthode testée
- `/* Assert */` — vérifie le résultat ou les effets de bord

  #### **Mécanique mock :**

- `jest.fn()` — remplace une méthode par une fonction vide contrôlable
- `mockResolvedValue(x)` — simule un `Promise.resolve(x)`
- `mockRejectedValue(e)` — simule un `Promise.reject(e)` (erreur)
- `jest.mock('module', factory)` — remplace un module CJS entier (ex: bcrypt)
- `(dep as jest.Mock).mockResolvedValue(x)` — configure la valeur retournée par un mock

  #### **Factories :**

- `makeGuard()` / `makeDeps()` / `makeRes()` — recréées dans chaque test pour isolation totale

2. ### **Outils \+ CLI** {#outils-+-cli}

##### `# lancer les tests unitaires`

##### `npm test`

##### `# avec coverage (rapport terminal + coverage/lcov-report/index.html)`

##### `npm run test:cov`

##### `# watch mode (relance à chaque modification)`

##### `npm run test:watch`

Fichiers :

- `src/common/guards/jwt-auth.guard.spec.ts`
- `src/auth/auth.service.spec.ts`

3. ### **Plan** {#plan}

| \=== | UNIT BACK                  |                               | \=== | \===                                 | \=== | \=== | \=== |
| :--- | :------------------------- | :---------------------------- | :--: | :----------------------------------- | :--- | :--- | :--: |
| BACK | **A. JwtAuthGuard**        |                               | \--  |                                      | Jest | UNIT |  ✅  |
| BACK | `1.extractToken()`         |                               | \--  |                                      | Jest | UNIT |  ✅  |
| BACK | 1,1                        | cookie présent                |  ✔   | token cookie                         |      | UNIT |  ☒   |
| BACK | 1,2                        | Bearer présent, pas de cookie |  ✔   | token Bearer                         |      | UNIT |  ☒   |
| BACK | 1,3                        | aucun token                   |  ❌  | null                                 |      | UNIT |  ☒   |
| BACK | `2.canActivate()`          | JwtAuthGuard                  | \--  |                                      | Jest | UNIT |  ✅  |
| BACK | 2,1                        | token valide                  |  ✔   | request.user                         |      | UNIT |  ☒   |
| BACK | 2,2                        | token invalide                |  ❌  | UnauthorizedException                |      | UNIT |  ☒   |
| BACK | 2,3                        | tokenabsent                   |  ❌  | UnauthorizedException                |      | UNIT |  ☒   |
| BACK | **`B.AuthService`**        |                               | \--  |                                      | Jest | UNIT |  ✅  |
| BACK | `1.AuthService.register()` |                               | \--  |                                      | Jest | UNIT |  ✅  |
| BACK | 1,1                        | email libre                   |  ✔   | bcrypt.hash \+ prisma.create appelés |      | UNIT |  ☒   |
| BACK | 1,2                        | email déjà pris               |  ❌  | ConflictException                    |      | UNIT |  ☒   |
| BACK | `2.AuthService.login()`    |                               | \--  |                                      | Jest | UNIT |  ✅  |
| BACK | 2,1                        | no user found                 |  ❌  | UnauthorizedException                |      | UNIT |  ☒   |
| BACK | 2,2                        | wrong password                |  ❌  | UnauthorizedException                |      | UNIT |  ☒   |
| BACK | 2,3                        | succès web                    |  ✔   | res.cookie() appelé                  |      | UNIT |  ☒   |
| BACK | 2,4                        | succès mobile                 |  ✔   | {token } / no cookies                |      | UNIT |  ☒   |

---

## **2\. Test Integration — Supertest** {#2.-test-integration-—-supertest}

1. ### **Logique** {#logique-1}

Monte l'app NestJS **complète** en mémoire (pas de port réseau). Envoie de vraies requêtes HTTP et vérifie la réponse de bout en bout.

#### **Ce qui est réel (contrairement aux tests unitaires) :**

- Routing (`/api/v1/auth/register` existe vraiment)
- Middleware (`cookieParser`, logger)
- Guard (`JwtAuthGuard` vérifie le vrai token JWT)
- Pipe (`ValidationPipe` rejette les DTOs invalides → 400\)
- Filtres (`HttpExceptionFilter`, `PrismaExceptionFilter`)
- Prisma → vraie BDD Docker
- `bcrypt` et `jwt` réels

  #### **Stack complète testée :**

##### `Requête HTTP`

##### `↓ Middleware (cookieParser, logger)`

##### `↓ Guard (JwtAuthGuard)`

##### `↓ Pipe (ValidationPipe → DTO)`

##### `↓ Controller`

##### `↓ Service`

##### `↓ Prisma → BDD Docker`

##### `↓ Réponse HTTP`

#### **Setup :**

1. `beforeAll` : bootstrap app même config que `main.ts`, supprime l'user test si existant  
   2. `afterAll` : supprime l'user test, ferme l'app  
   3. `--runInBand` : tests séquentiels (partagent la même BDD)  
   4. User test isolé par email unique ([`integration-auth@test.local`](mailto:integration-auth@test.local))

2. ### **Outils \+ CLI** {#outils-+-cli-1}

\# démarrer la BDD & lancer les tests integration

##### `docker-compose up -d`

##### `npm run test:integration`

Config : `test/jest-integration.json` — `testRegex: .integration.spec.ts$`

Fichiers :

- `test/auth.integration.spec.ts` — 9 tests (register \+ login \+ logout)
- `test/files.integration.spec.ts` — 13 tests (upload auth, upload anonyme, historique, suppression)
- `test/download.integration.spec.ts` — 11 tests (métadonnées, téléchargement, 3 flux E2E)
- `test/tags.integration.spec.ts` — 12 tests (CRUD tags, isolation inter-utilisateurs)

### **Plan** {#plan-1}

| \=== | AUTH                    | US03 · US04                   | \=== | \===                   | \===              | \===  | \=== |
| :--- | :---------------------- | :---------------------------- | :--: | :--------------------- | :---------------- | :---- | :--: |
| BACK | `1.POST /auth/register` | US03                          | \--  |                        | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 1,1                     | email available               |  ✔   | 201 \+ msg             |                   | INTE. |  ☒   |
| BACK | 1,2                     | email not available           |  ❌  | 409                    |                   | INTE. |  ☒   |
| BACK | 1,3                     | invalid { email, pass , name} |  ❌  | 400                    |                   | INTE. |  ☒   |
| BACK | `2. POST /auth/login`   | US04                          | \--  |                        | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 2,1                     | Succes WEB                    |  ✔   | 200 \+ cookie httpOnly |                   | INTE. |  ☒   |
| BACK | 2,2                     | Succes Mobile                 |  ✔   | 200 \+ token body      |                   | INTE. |  ☒   |
| BACK | 2,3                     | Wrong Password                |  ❌  | 401                    |                   | INTE. |  ☒   |
| BACK | 2,4                     | Unknow User                   |  ❌  | 401                    |                   | INTE. |  ☒   |
| BACK | `POST /auth/logout`     | US04                          | \--  |                        | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 3,1                     | with valid Token              |  ✔   | 200 \+ cookie effacé   |                   | INTE. |  ☒   |
| BACK | 3,2                     | with invalid Token            |  ❌  |                        |                   | INTE. |  ☒   |

| \=== | FILES                         | US01 · US05 · US06 · US07                 | \=== | \===                           | \===              | \===  | \=== |
| :--- | :---------------------------- | :---------------------------------------- | :--: | :----------------------------- | :---------------- | :---- | :--: |
| BACK | `1. POST /files`              | US01 — upload authentifié                 | \--  |                                | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 1,1                           | fichier valide + auth                     |  ✔   | 201 \+ shareToken              |                   | INTE. |  ☒   |
| BACK | 1,2                           | sans authentification                     |  ❌  | 401                            |                   | INTE. |  ☒   |
| BACK | 1,3                           | extension interdite                       |  ❌  | 400                            |                   | INTE. |  ☒   |
| BACK | 1,4                           | avec mot de passe de téléchargement       |  ✔   | 201 \+ shareToken              |                   | INTE. |  ☒   |
| BACK | `2. POST /files/anonymous`    | US07 — upload anonyme                     | \--  |                                | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 2,1                           | fichier valide sans token                 |  ✔   | 201 \+ shareToken, userId=null |                   | INTE. |  ☒   |
| BACK | `3. GET /files`               | US05 — historique                         | \--  |                                | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 3,1                           | utilisateur connecté                      |  ✔   | 200 \+ tableau \+ props        |                   | INTE. |  ☒   |
| BACK | 3,2                           | isolation (autre utilisateur)             |  ✔   | 200 \+ tableau vide            |                   | INTE. |  ☒   |
| BACK | 3,3                           | sans authentification                     |  ❌  | 401                            |                   | INTE. |  ☒   |
| BACK | `4. DELETE /files/:id`        | US06 — suppression                        | \--  |                                | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 4,1                           | autre utilisateur                         |  ❌  | 403                            |                   | INTE. |  ☒   |
| BACK | 4,2                           | fichier inexistant                        |  ❌  | 404                            |                   | INTE. |  ☒   |
| BACK | 4,3                           | sans authentification                     |  ❌  | 401                            |                   | INTE. |  ☒   |
| BACK | 4,4                           | propriétaire du fichier                   |  ✔   | 204                            |                   | INTE. |  ☒   |
| BACK | **E2E — flux upload complet** | login → upload → GET /files → DELETE      | \--  |                                | Supertest         | INTE. |  ✅  |
| BACK | E2E,1                         | register → login → upload → list → delete |  ✔   | 201, 201, 200 listé, 204       |                   | INTE. |  ☒   |

| \=== | DOWNLOAD                   | US02                                 | \=== | \===                                         | \===              | \===  | \=== |
| :--- | :------------------------- | :----------------------------------- | :--: | :------------------------------------------- | :---------------- | :---- | :--: |
| BACK | `1. GET /download/:token`  | US02 — métadonnées publiques         | \--  |                                              | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 1,1                        | token valide (sans mot de passe)     |  ✔   | 200 \+ { filename, requiresPassword: false } |                   | INTE. |  ☒   |
| BACK | 1,2                        | token valide (avec mot de passe)     |  ✔   | 200 \+ { requiresPassword: true }            |                   | INTE. |  ☒   |
| BACK | 1,3                        | token expiré                         |  ❌  | 410                                          |                   | INTE. |  ☒   |
| BACK | 1,4                        | token inconnu                        |  ❌  | 404                                          |                   | INTE. |  ☒   |
| BACK | `2. POST /download/:token` | US02 — téléchargement                | \--  |                                              | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 2,1                        | fichier sans mot de passe            |  ✔   | 200 stream                                   |                   | INTE. |  ☒   |
| BACK | 2,2                        | bon mot de passe                     |  ✔   | 200 stream                                   |                   | INTE. |  ☒   |
| BACK | 2,3                        | mauvais mot de passe                 |  ❌  | 401                                          |                   | INTE. |  ☒   |
| BACK | 2,4                        | token expiré                         |  ❌  | 410                                          |                   | INTE. |  ☒   |
| BACK | **E2E — flux download**    | 3 flux de bout en bout               | \--  |                                              | Supertest         | INTE. |  ✅  |
| BACK | E2E,1                      | upload → getMeta → download libre    |  ✔   | 201, 200 requiresPassword=false, 200 stream  |                   | INTE. |  ☒   |
| BACK | E2E,2                      | upload avec pw → download bon pw     |  ✔   | 200 stream                                   |                   | INTE. |  ☒   |
| BACK | E2E,3                      | upload avec pw → download mauvais pw |  ❌  | 401                                          |                   | INTE. |  ☒   |

| \=== | TAGS                        | US08                                       | \=== | \===                             | \===              | \===  | \=== |
| :--- | :-------------------------- | :----------------------------------------- | :--: | :------------------------------- | :---------------- | :---- | :--: |
| BACK | `1. GET /tags`              | US08                                       | \--  |                                  | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 1,1                         | utilisateur connecté                       |  ✔   | 200 \+ tableau                   |                   | INTE. |  ☒   |
| BACK | 1,2                         | sans authentification                      |  ❌  | 401                              |                   | INTE. |  ☒   |
| BACK | `2. POST /tags`             | US08                                       | \--  |                                  | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 2,1                         | nom libre                                  |  ✔   | 201                              |                   | INTE. |  ☒   |
| BACK | 2,2                         | doublon même utilisateur                   |  ❌  | 409                              |                   | INTE. |  ☒   |
| BACK | 2,3                         | même nom, autre utilisateur                |  ✔   | 201                              |                   | INTE. |  ☒   |
| BACK | 2,4                         | sans authentification                      |  ❌  | 401                              |                   | INTE. |  ☒   |
| BACK | `3. DELETE /tags/:id`       | US08                                       | \--  |                                  | Jest \+ Supertest | INTE. |  ✅  |
| BACK | 3,1                         | autre utilisateur                          |  ❌  | 403                              |                   | INTE. |  ☒   |
| BACK | 3,2                         | tag inexistant                             |  ❌  | 404                              |                   | INTE. |  ☒   |
| BACK | 3,3                         | sans authentification                      |  ❌  | 401                              |                   | INTE. |  ☒   |
| BACK | 3,4                         | propriétaire du tag                        |  ✔   | 204                              |                   | INTE. |  ☒   |
| BACK | **E2E — isolation données** | 2 flux inter-utilisateurs                  | \--  |                                  | Supertest         | INTE. |  ✅  |
| BACK | E2E,1                       | flux CRUD complet (create → list → delete) |  ✔   | 201, 200 tag listé, 204          |                   | INTE. |  ☒   |
| BACK | E2E,2                       | isolation userA / userB                    |  ✔   | userA ne voit pas les tags userB |                   | INTE. |  ☒   |

---

## **3\. Coverage** {#3.-coverage}

1. ### **Unit** {#unit}

##### `npm run test:cov`

Génère : Rapport HTML navigable : `coverage/lcov-report/index.html`

Scope : modules `auth` uniquement (12 tests). Le taux global est faible car il inclut tous les fichiers source — les modules files, download, tags sont couverts par les tests d'intégration.

2. ### **Integration** {#integration}

##### `npm run test:integration`

Génère : Rapport HTML navigable : `coverage-integration/lcov-report/index.html`

**Résultats — 45/45 tests — branche `feat/api`**

| Module     | Statements | Branches  | Functions  | Lines     |
| :--------- | :--------- | :-------- | :--------- | :-------- |
| **Global** | **88.04%** | **68.3%** | **90.54%** | **87.5%** |
| auth       | 100%       | 79.62%    | 100%       | 100%      |
| files      | 91%        | 74.19%    | 86.66%     | 91.3%     |
| download   | 95.91%     | 78.94%    | 100%       | 100%      |
| tags       | 100%       | 79.41%    | 100%       | 100%      |

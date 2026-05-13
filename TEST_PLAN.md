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

Fichiers : `test/auth.integration.spec.ts` — 8 tests (register \+ login \+ logout)

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

---

## **3\. Coverage** {#3.-coverage}

1. ### **Unit** {#unit}

##### `npm run test:cov`

Génère : Rapport HTML navigable : `coverage/lcov-report/index.html`

2. ### **Integration** {#integration}

##### `npm run test:integration`

Génère : Rapport HTML navigable : `coverage-integration/lcov-report/index.html`

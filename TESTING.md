- # **TESTING.md \-**

## **DataShare Backend**

---

[1\. Stratégie de tests](#1.-stratégie-de-tests)

[2\. Tests unitaires \- Jest](#2.-tests-unitaires---jest)

[A. 16 suites \- 75/75 ✅](#16-suites---75/75-✅)

[b. Commandes](#b.-commandes)

[3\. Tests d'intégration \- Supertest](#3.-tests-d'intégration---supertest)

[a. 4 suites \- 45/45 ✅](#4-suites---45/45-✅)

[b. Commandes](#commandes)

[4\. Parcours API \- Supertest](#4.-parcours-api---supertest)

[a. 1 suite \- 12/12 ✅ (test/app.e2e-spec.ts)](<#1-suite---12/12-✅-(test/app.e2e-spec.ts)>)

[b. Commandes](#commandes-1)

[5\. Tests E2E navigateur \- Cypress](#5.-tests-e2e-navigateur---cypress)

[a. 7 fichiers \- 26/26 ✅](#7-fichiers---26/26-✅)

[b. Commandes](#b.-commandes-1)

[6\. Rapports](#6.-rapports)

[a. 📂 Dossier rapports de test](#📂-dossier-rapports-de-test)

[b. Tableau récapitulatif](#tableau-récapitulatif)

[7\. Couverture](#7.-couverture)

[a. Intégration (référence principale)](<#intégration-(référence-principale)>)

[b. Parcours API (Istanbul)](<#parcours-api-(istanbul)>)

[8\. Critères d'acceptation](#8.-critères-d'acceptation)

[9\. Détail des cas de test](#9.-détail-des-cas-de-test)

[a. 📊 Plan détaillé complet](#📊-plan-détaillé-complet)

#

# 1\. Stratégie de tests {#1.-stratégie-de-tests}

| Niveau         | Outil             | Périmètre                                             | Commande                   |
| :------------- | :---------------- | :---------------------------------------------------- | :------------------------- |
| Unitaire       | Jest              | Guards, Services, Controllers, Filters                | `npm test`                 |
| Intégration    | Jest \+ Supertest | Endpoints REST complets avec BDD réelle               | `npm run test:integration` |
| Parcours API   | Jest \+ Supertest | Scénarios multi-étapes (register → upload → download) | `npm run test:e2e`         |
| E2E navigateur | Cypress 15        | Front React → API → PostgreSQL                        | P4-FRONT/TESTING.md        |

---

# 2\. Tests unitaires \- Jest {#2.-tests-unitaires---jest}

1. ## 16 suites \- 75/75 ✅ {#16-suites---75/75-✅}

| Suite                           | Module         | Classe testée         | Tests  |
| :------------------------------ | :------------- | :-------------------- | :----: |
| jwt-auth.guard.spec.ts          | common/guards  | JwtAuthGuard          |   6    |
| optional-jwt-auth.guard.spec.ts | common/guards  | OptionalJwtAuthGuard  |   2    |
| auth.service.spec.ts            | auth           | AuthService           |   7    |
| auth.controller.spec.ts         | auth           | AuthController        |   4    |
| error.filter.spec.ts            | common/filters | ErrorFilter           |   2    |
| http-exception.filter.spec.ts   | common/filters | HttpExceptionFilter   |   3    |
| multer-exception.filter.spec.ts | common/filters | MulterExceptionFilter |   2    |
| prisma-exception.filter.spec.ts | common/filters | PrismaExceptionFilter |   4    |
| api-response.spec.ts            | common/helpers | ApiResponse           |   4    |
| cron-task.service.spec.ts       | cron-task      | CronTaskService       |   7    |
| download.service.spec.ts        | download       | DownloadService       |   8    |
| download.controller.spec.ts     | download       | DownloadController    |   3    |
| files.service.spec.ts           | files          | FilesService          |   7    |
| files.controller.spec.ts        | files          | FilesController       |   5    |
| tags.service.spec.ts            | tags           | TagsService           |   8    |
| tags.controller.spec.ts         | tags           | TagsController        |   3    |
| **Total**                       |                |                       | **75** |

## b. Commandes {#b.-commandes}

- npm test \# run all unit tests
- npm run test:cov \# avec couverture (coverage/)

---

# 3\. Tests d'intégration \- Supertest {#3.-tests-d'intégration---supertest}

1. ## 4 suites \- 45/45 ✅ {#4-suites---45/45-✅}

L'API NestJS est montée in-process via `Test.createTestingModule()`. La BDD PostgreSQL est réelle (Docker).

| Suite                        | Endpoints couverts                                      | Tests  |
| :--------------------------- | :------------------------------------------------------ | :----: |
| auth.integration.spec.ts     | POST /auth/register · /auth/login · /auth/logout        |   9    |
| files.integration.spec.ts    | POST /files · GET /files · DELETE /files/:id            |   13   |
| download.integration.spec.ts | GET /download/:token · POST /download/:token            |   11   |
| tags.integration.spec.ts     | POST /tags · GET /tags · DELETE /tags/:id               |   12   |
| **Total**                    |                                                         | **45** |

2. ## Commandes {#commandes}

- npm run test:integration \# run integration tests

---

##

# 4\. Parcours API \- Supertest {#4.-parcours-api---supertest}

1. ## **1 suite \- 12/12 ✅** (`test/app.e2e-spec.ts`) {#1-suite---12/12-✅-(test/app.e2e-spec.ts)}

Scénario complet enchaîné dans un seul processus Jest.

| Étape     | Description                                               | HTTP attendu |    Statut    |
| :-------- | :-------------------------------------------------------- | :----------: | :----------: |
| 1         | Inscription (`POST /auth/register`)                       |     201      |      ✅      |
| 2         | Connexion web → cookie httpOnly                           |     200      |      ✅      |
| 3         | Upload fichier → récupération `shareToken`                |     201      |      ✅      |
| 4         | Liste des fichiers → `fileId` présent                     |     200      |      ✅      |
| 5         | Métadonnées de téléchargement                             |     200      |      ✅      |
| 6         | Téléchargement stream → `content-disposition: attachment` |     200      |      ✅      |
| 7         | Création de tag                                           |     201      |      ✅      |
| 8         | Liste des tags → tag présent                              |     200      |      ✅      |
| 9         | Suppression de tag                                        |     200      |      ✅      |
| 10        | Suppression de fichier                                    |     200      |      ✅      |
| 11        | Déconnexion (cookie effacé)                               |     200      |      ✅      |
| 12        | Accès sans cookie → non autorisé                          |     401      |      ✅      |
| **Total** |                                                           |              | **✅ 12/12** |

2. ## Commandes {#commandes-1}

- npm run test:e2e \# run parcours API
- npm run test:e2e:cov \# avec couverture Istanbul (coverage-e2e/)

---

##

# 5\. Tests E2E navigateur \- Cypress {#5.-tests-e2e-navigateur---cypress}

**Outil** : Cypress 15 (installé dans `P4-Dev-FullStack-Front`)  
**Périmètre** : front React → API NestJS → PostgreSQL Docker \- parcours utilisateur complet depuis le navigateur.

1. ## **7 fichiers \- 26/26 ✅** {#7-fichiers---26/26-✅}

Voir front

## b. Commandes {#b.-commandes-1}

- \# dans P4-Dev-FullStack-Front/ \- avec back \+ front démarrés
- docker compose up \-d \# PostgreSQL (côté back)
- npm run start:dev \# NestJS back (port 3000\)
- npm run dev \# Vite front (port 5173\)
- npm run cy:run \# mode headless (CI)
- npm run cy:open \# mode interactif (navigateur)

---

# 6\. Rapports {#6.-rapports}

1. ## [📂 Dossier rapports de test](https://drive.google.com/drive/folders/1JdFQJ9lacjx9COVTo0rhXiFc_TZhAKva?usp=drive_link) {#📂-dossier-rapports-de-test}

2. ## Tableau récapitulatif {#tableau-récapitulatif}

| Rapport                        | Chemin                                        | Généré par                   |
| :----------------------------- | :-------------------------------------------- | :--------------------------- |
| Couverture unitaire (HTML)     | `coverage/lcov-report/index.html`             | `npm run test:cov`           |
| Couverture intégration (HTML)  | `coverage-integration/lcov-report/index.html` | `npm run test:integration`   |
| Couverture parcours API (HTML) | `coverage-e2e/lcov-report/index.html`         | `npm run test:e2e:cov`       |
| Newman \- collections auth     | `postman/newman-report.html`                  | `npm run newman:auth:report` |
| Newman \- collections API      | `postman/index.html`                          | `npm run newman:api:report`  |

---

##

# 7\. Couverture {#7.-couverture}

1. ## Intégration (référence principale) {#intégration-(référence-principale)}

Couverture mesurée sur les 4 suites d'intégration \- représentative du comportement réel de l'API.

| Module     | Statements | Branches  | Functions  |   Lines   |
| :--------- | :--------: | :-------: | :--------: | :-------: |
| **Global** | **88.04%** | **68.3%** | **90.54%** | **87.5%** |
| auth       |    100%    |  79.62%   |    100%    |   100%    |
| files      |   91.02%   |  74.19%   |   86.66%   |   91.3%   |
| download   |   95.91%   |  78.94%   |    100%    |   100%    |
| tags       |    100%    |  79.41%   |    100%    |   100%    |

Rapport HTML : `coverage-integration/lcov-report/index.html`

2. ## Parcours API (Istanbul) {#parcours-api-(istanbul)}

| Module     | Statements |  Branches  | Functions  |   Lines    |
| :--------- | :--------: | :--------: | :--------: | :--------: |
| **Global** | **82.29%** | **61.18%** | **86.48%** | **84.04%** |

Rapport HTML : `coverage-e2e/lcov-report/index.html`

---

# 8\. Critères d'acceptation {#8.-critères-d'acceptation}

| Critère                            |       Seuil        |  Résultat   |
| :--------------------------------- | :----------------: | :---------: |
| Tests unitaires                    |     100% pass      |  ✅ 75/75   |
| Tests d'intégration                |     100% pass      |  ✅ 45/45   |
| Tests parcours API                 |     100% pass      |  ✅ 12/12   |
| Tests E2E Cypress                  |     100% pass      |  ✅ 26/26   |
| Coverage statements (intégration)  |       ≥ 70%        |  ✅ 88.04%  |
| Coverage lines (intégration)       |       ≥ 70%        |  ✅ 87.5%   |
| Coverage functions (intégration)   |       ≥ 70%        |  ✅ 90.54%  |
| Coverage statements (parcours API) |       ≥ 70%        |  ✅ 82.29%  |
| 0 erreur TypeScript                | `npx tsc --noEmit` | ✅ 0 erreur |

---

# 9\. Détail des cas de test {#9.-détail-des-cas-de-test}

1. ## [📊 Plan détaillé complet](https://docs.google.com/spreadsheets/d/e/2PACX-1vQKMx-Go8curn85rzLBfdVDXZYMuyo_8tVePBiEKMCvAa8R0qwPmmR5kwxnHjEF-A0RURbUuNiYcimJ/pubhtml?gid=906604324&single=true) {#📊-plan-détaillé-complet}

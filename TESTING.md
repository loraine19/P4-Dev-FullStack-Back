# **TESTING.md — DataShare Backend**

**Branche** : `feat/api` — **Date** : 24/05/2026

---

## **1. Stratégie de tests**

Trois niveaux de tests complémentaires couvrent la totalité de la logique métier :

| Niveau           | Outil            | Scope                                          | Isolation                                      |
| :--------------- | :--------------- | :--------------------------------------------- | :--------------------------------------------- |
| **Unitaire**     | Jest             | Guard JWT + AuthService                        | Mocks totaux — aucune BDD, aucun HTTP          |
| **Intégration**  | Jest + Supertest | Tous les modules (auth, files, download, tags) | Stack NestJS complète + PostgreSQL Docker réel |
| **Parcours API** | Jest + Supertest | Parcours utilisateur complet (12 étapes)       | Stack NestJS complète + PostgreSQL Docker réel |

---

## **2. Tests unitaires**

### Logique

Teste une seule classe en isolation — les dépendances (Prisma, JwtService, bcrypt) sont remplacées par des `jest.fn()`. Pattern AAA (`/* Arrange */` / `/* Act */` / `/* Assert */`) dans chaque `it()`.

### Commandes

```bash
npm test              # lancer les tests unitaires
npm run test:cov      # avec rapport de couverture → coverage/lcov-report/index.html
```

### Résultats — 12/12 ✅

| Suite        | Fichier                                    | Tests     | Statut |
| :----------- | :----------------------------------------- | :-------- | :----- |
| JwtAuthGuard | `src/common/guards/jwt-auth.guard.spec.ts` | 6/6       | ✅     |
| AuthService  | `src/auth/auth.service.spec.ts`            | 6/6       | ✅     |
| **Total**    |                                            | **12/12** | **✅** |

---

## **3. Tests d'intégration**

### Logique

Monte l'application NestJS complète en mémoire (`Test.createTestingModule` + `AppModule`) — même stack que la production : `cookieParser`, `ValidationPipe`, guards réels, filtres d'exception, Prisma sur PostgreSQL Docker. Tests exécutés en `--runInBand` (séquentiel, BDD partagée).

### Commandes

```bash
docker compose up -d         # démarrer la BDD PostgreSQL
npm run test:integration     # lancer les 4 suites → coverage-integration/lcov-report/index.html
```

### Résultats — 45/45 ✅

| Suite     | Fichier                             | Tests     | Statut |
| :-------- | :---------------------------------- | :-------- | :----- |
| Auth      | `test/auth.integration.spec.ts`     | 9/9       | ✅     |
| Files     | `test/files.integration.spec.ts`    | 13/13     | ✅     |
| Download  | `test/download.integration.spec.ts` | 11/11     | ✅     |
| Tags      | `test/tags.integration.spec.ts`     | 12/12     | ✅     |
| **Total** |                                     | **45/45** | **✅** |

---

## **4. Tests parcours API (Jest + Supertest)**

### Logique

Exécute un parcours utilisateur complet en séquence sur l'API NestJS réelle + PostgreSQL Docker — de l'inscription jusqu'à la révocation d'accès. Les requêtes HTTP sont émises par Supertest (côté back uniquement, pas de navigateur). Chaque étape construit sur les données créées par la précédente (upload → token → download → tag → suppression). La couverture Istanbul est collectée sur l'ensemble du code source `src/`.

> ⚠️ **Ce niveau ne remplace pas Cypress.** Ces tests valident les routes HTTP du back-end en séquence. Les tests E2E navigateur (front → back → BDD) sont gérés par Cypress — voir section 5.

### Commandes

```bash
docker compose up -d        # démarrer la BDD PostgreSQL
npm run test:e2e:cov        # lancer le parcours + rapport de couverture → coverage-e2e/lcov-report/index.html
```

### Résultats — 12/12 ✅

| Étape     | Description                                               | HTTP attendu | Statut       |
| :-------- | :-------------------------------------------------------- | :----------- | :----------- |
| 1         | Inscription (`POST /auth/register`)                       | 201          | ✅           |
| 2         | Connexion web → cookie httpOnly                           | 200          | ✅           |
| 3         | Upload fichier → récupération shareToken                  | 201          | ✅           |
| 4         | Liste des fichiers → fileId présent                       | 200          | ✅           |
| 5         | Métadonnées de téléchargement                             | 200          | ✅           |
| 6         | Téléchargement stream → `content-disposition: attachment` | 200          | ✅           |
| 7         | Création de tag                                           | 201          | ✅           |
| 8         | Liste des tags → tag présent                              | 200          | ✅           |
| 9         | Suppression de tag                                        | 204          | ✅           |
| 10        | Suppression de fichier                                    | 204          | ✅           |
| 11        | Déconnexion (cookie effacé)                               | 200          | ✅           |
| 12        | Accès sans cookie → non autorisé                          | 401          | ✅           |
| **Total** |                                                           |              | **✅ 12/12** |

---

## **5. Tests E2E navigateur — Cypress**

**Outil** : Cypress 15 (installé dans `P4-Dev-FullStack-Front`)
**Périmètre** : front React → API NestJS → PostgreSQL Docker — parcours utilisateur complet depuis le navigateur.

### Commandes

```bash
# dans P4-Dev-FullStack-Front/ — avec back + front démarrés
npm run cy:open    # mode interactif (navigateur)
npm run cy:run     # mode headless (CI)

# prérequis
docker compose up -d    # BDD PostgreSQL (côté back)
npm run start:dev       # NestJS back (port 3000)
npm run dev             # Vite front  (port 5173)
```

### Parcours implémentés — 13 cas de test

| Fichier                      | Parcours                                    | Tests  |
| :--------------------------- | :------------------------------------------ | :----- |
| `01-auth.cy.ts`              | Register → Login → MySpace                  | 3      |
| `02-upload.cy.ts`            | Upload fichier → MySpace + ext interdite    | 3      |
| `03-myspace.cy.ts`           | Liste fichiers + suppression                | 2      |
| `04-download.cy.ts`          | Download public + token invalide            | 3      |
| `05-download-password.cy.ts` | Download protégé (bon/mauvais mot de passe) | 3      |
| **Total**                    |                                             | **13** |

### Stratégie technique

- **Setup programmatique** : `cy.registerViaApi`, `cy.loginViaApi` via `cy.request()` — le cookie httpOnly est préservé automatiquement par Cypress pour les `cy.visit` suivants
- **Setup fichiers** : `cy.task('uploadTestFile')` — upload multipart depuis Node.js avec Bearer token (`isMobile: true`) pour éviter le cookie httpOnly dans le contexte Node
- **Vérification download** : `cy.intercept()` + `cy.wait('@download').its('response.statusCode')` — Cypress capture la réponse binaire sans avoir à vérifier le fichier téléchargé physiquement
- **Isolation** : chaque spec utilise un email unique (`email-${Date.now()}@test.local`) — pas de dépendance entre les fichiers de test

---

## **6. Rapport de couverture**

### Parcours API (Istanbul — parcours complet)

| Module     | Statements | Branches   | Functions  | Lines      |
| :--------- | :--------- | :--------- | :--------- | :--------- |
| **Global** | **82.29%** | **61.18%** | **86.48%** | **84.04%** |

Rapport HTML complet : `coverage-e2e/lcov-report/index.html`

### Intégration (référence principale)

Couverture mesurée sur les 4 suites d'intégration — représentative du comportement réel de l'API.

| Module     | Statements | Branches  | Functions  | Lines     |
| :--------- | :--------- | :-------- | :--------- | :-------- |
| **Global** | **88.04%** | **68.3%** | **90.54%** | **87.5%** |
| auth       | 100%       | 79.62%    | 100%       | 100%      |
| files      | 91.02%     | 74.19%    | 86.66%     | 91.3%     |
| download   | 95.91%     | 78.94%    | 100%       | 100%      |
| tags       | 100%       | 79.41%    | 100%       | 100%      |

Rapport HTML complet : `coverage-integration/lcov-report/index.html`

### Unitaire (scope auth)

Les tests unitaires couvrent exclusivement le module `auth` (guard + service). Le taux global est faible car le rapport porte sur tous les fichiers source — les modules files, download, tags sont couverts par les tests d'intégration.

Rapport HTML : `coverage/lcov-report/index.html`

---

## **7. Critères d'acceptation**

| Critère                            | Seuil              | Résultat    |
| :--------------------------------- | :----------------- | :---------- |
| Tests unitaires                    | 100% pass          | ✅ 12/12    |
| Tests d'intégration                | 100% pass          | ✅ 45/45    |
| Tests parcours API                 | 100% pass          | ✅ 12/12    |
| Tests E2E Cypress (OC obligatoire) | 100% pass          | ✅ 13/13    |
| Coverage statements (intégration)  | ≥ 70%              | ✅ 88.04%   |
| Coverage lines (intégration)       | ≥ 70%              | ✅ 87.5%    |
| Coverage functions (intégration)   | ≥ 70%              | ✅ 90.54%   |
| Coverage statements (parcours API) | ≥ 70%              | ✅ 82.29%   |
| Coverage lines (parcours API)      | ≥ 70%              | ✅ 84.04%   |
| 0 erreur TypeScript                | `npx tsc --noEmit` | ✅ 0 erreur |

---

## **8. Détail des cas de test**

Voir [TEST_PLAN.md](./TEST_PLAN.md) pour le détail complet de chaque cas de test par module (US, endpoint, attendu, statut).

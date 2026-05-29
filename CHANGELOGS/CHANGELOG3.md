# CHANGELOG3 - feat/auth (tests) - back

**Sprint step** : STEP 3 - Tests unitaires + tests d'intégration
**Branche** : `feat/auth`

**Objectif** : Couvrir la logique métier et la stack HTTP complète de l'authentification par des tests automatisés - unitaires (isolation totale) et intégration (vraie BDD Docker, vraie pile NestJS).

---

[1. Ce qui est en place](#1-ce-qui-est-en-place)
[2. Choix techniques](#2-choix-techniques)
[a. Tests unitaires - isolation totale](#a-tests-unitaires---isolation-totale)
[b. Tests d'intégration - stack complète](#b-tests-dintégration---stack-complète)
[c. Coverage - deux rapports complémentaires](#c-coverage---deux-rapports-complémentaires)
[3. Résultats des tests](#3-résultats-des-tests)

---

## 1. Ce qui est en place

| Thème                    | Ce qui est opérationnel                                                    |
| :----------------------- | :------------------------------------------------------------------------- |
| **Tests unitaires**      | 12 tests - `jwt-auth.guard.spec.ts` (6) + `auth.service.spec.ts` (6)       |
| **Tests intégration**    | 9 tests - `test/auth.integration.spec.ts` (register + login + logout)      |
| **Coverage unitaire**    | `npm run test:cov` → `coverage/lcov-report/index.html`                     |
| **Coverage intégration** | `npm run test:integration` → `coverage-integration/lcov-report/index.html` |
| **Documentation**        | `TEST_PLAN.md` - logique, CLI, scope de chaque suite                       |

---

## 2. Choix techniques

### a. Tests unitaires - isolation totale

Chaque test recrée ses dépendances via des factories (`makeGuard()`, `makeDeps()`, `makeRes()`) - pas de `beforeEach` partagé, isolation garantie.

- `jest.fn()` remplace Prisma, JwtService, bcrypt
- `jest.mock('bcrypt', factory)` - bcrypt compile en CJS, `jest.spyOn` ne peut pas redéfinir ses exports ; le mock module contourne ça
- Pattern AAA (`/* Arrange */` / `/* Act */` / `/* Assert */`) dans chaque `it()`

### b. Tests d'intégration - stack complète

`Test.createTestingModule({ imports: [AppModule] })` bootstrappe la même app que `main.ts` :

- `ValidationPipe` (whitelist + forbidNonWhitelisted) → DTOs vraiment validés
- `JwtAuthGuard` avec vrai JWT signé → logout 401 sans token testé réellement
- `HttpExceptionFilter` + `PrismaExceptionFilter` → réponses d'erreur formatées testées en bout en bout
- Prisma → vraie BDD Docker PostgreSQL 16
- `--runInBand` - séquentiel, même BDD partagée entre les tests
- Isolation via email unique `integration-auth@test.local` + cleanup `beforeAll` / `afterAll`

### c. Coverage - deux rapports complémentaires

| Suite           | Commande                 | Dossier rapport       | Ce qui est couvert                              |
| :-------------- | :----------------------- | :-------------------- | :---------------------------------------------- |
| **Unitaire**    | npm run test:cov         | coverage/             | Guard, Service - logique isolée                 |
| **Intégration** | npm run test:integration | coverage-integration/ | Controller, filtres, helpers, DTOs, middlewares |

`jest-integration.json` utilise `rootDir: ".."` (racine projet) pour que Jest puisse instrumenter `src/` depuis `test/`. `collectCoverageFrom` exclut les `.module.ts` et `main.ts` qui n'ont pas de logique testable.

---

## 3. Résultats des tests

| Suite       | Tests | Statut |
| :---------- | :---- | :----- |
| Unitaire    | 12/12 | ✅     |
| Intégration | 9/9   | ✅     |

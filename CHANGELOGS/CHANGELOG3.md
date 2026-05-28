# **CHANGELOG - feat/auth (tests)**

**Sprint step** : STEP 3 - Tests unitaires \+ tests d'intégration **Branche** : `feat/auth`

**Objectif** : Couvrir la logique métier et la stack HTTP complète de l'authentification par des tests automatisés - unitaires (isolation totale) et intégration (vraie BDD Docker, vraie pile NestJS).

---

## **Ce qui est en place**

| Thème                    | Ce qui est opérationnel                                                    |
| :----------------------- | :------------------------------------------------------------------------- |
| **Tests unitaires**      | 12 tests - `jwt-auth.guard.spec.ts` (6) \+ `auth.service.spec.ts` (6)      |
| **Tests intégration**    | 9 tests - `test/auth.integration.spec.ts` (register \+ login \+ logout)    |
| **Coverage unitaire**    | `npm run test:cov` → `coverage/lcov-report/index.html`                     |
| **Coverage intégration** | `npm run test:integration` → `coverage-integration/lcov-report/index.html` |
| **Documentation**        | `TEST_PLAN.md` - logique, CLI, scope de chaque suite                       |

---

## **Choix techniques**

### **Tests unitaires - isolation totale**

Chaque test recrée ses dépendances via des factories (`makeGuard()`, `makeDeps()`, `makeRes()`) - pas de `beforeEach` partagé, isolation garantie.

- `jest.fn()` remplace Prisma, JwtService, bcrypt
- `jest.mock('bcrypt', factory)` - bcrypt compile en CJS, `jest.spyOn` ne peut pas redéfinir ses exports ; le mock module contourne ça
- Pattern AAA (`/* Arrange */` / `/* Act */` / `/* Assert */`) dans chaque `it()`

  ### **Tests intégration - stack complète**

`Test.createTestingModule({ imports: [AppModule] })` bootstrappe la même app que `main.ts` :

- `ValidationPipe` (whitelist \+ forbidNonWhitelisted) → DTOs vraiment validés
- `JwtAuthGuard` avec vrai JWT signé → logout 401 sans token testé réellement
- `HttpExceptionFilter` \+ `PrismaExceptionFilter` → réponses d'erreur formatées testées en bout en bout
- Prisma → vraie BDD Docker PostgreSQL 16
- `--runInBand` - séquentiel, même BDD partagée entre les tests
- Isolation via email unique `integration-auth@test.local` \+ cleanup `beforeAll` / `afterAll`

  ### **Coverage - deux rapports complémentaires**

| Suite           | Commande                 | Dossier rapport       | Ce qui est couvert                              |
| :-------------- | :----------------------- | :-------------------- | :---------------------------------------------- |
| **Unitaire**    | npm run test:cov         | coverage/             | Guard, Service - logique isolée                 |
| **Intégration** | npm run test:integration | coverage-integration/ | Controller, filtres, helpers, DTOs, middlewares |

`jest-integration.json` utilise `rootDir: ".."` (racine projet) pour que Jest puisse instrumenter `src/` depuis `test/`. `collectCoverageFrom` exclut les `.module.ts` et `main.ts` qui n'ont pas de logique testable.

---

## **Fichiers modifiés / créés**

| Fichier                                  | Action                                            |
| :--------------------------------------- | :------------------------------------------------ |
| src/common/guards/jwt-auth.guard.spec.ts | Créé - 6 tests unitaires                          |
| src/auth/auth.service.spec.ts            | Créé - 6 tests unitaires                          |
| test/auth.integration.spec.ts            | Créé - 9 tests intégration Supertest              |
| test/jest-integration.json               | Créé - config Jest intégration avec coverage      |
| tsconfig.json                            | Modifié - `types: ["jest", "node"]`               |
| `package.json`                           | Modifié - script `test:integration` ajouté        |
| `TEST_PLAN.md`                           | Créé - documentation complète des suites de tests |

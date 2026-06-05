# CHANGELOG - US08 Tags (IA-assistée)

**User Story :** US08 - Gestion des tags utilisateur
**Outil IA :** GitHub Copilot (modèle Claude Sonnet)
**Commit IA :** `d080691 feat(ai): implement tags module for US08`
**Branche dédiée :** `feat/ai-us08-tags`

---

## 1. Contexte

L'US08 a été choisie comme périmètre de pilotage IA pour le projet P4, conformément à l'exigence OpenClassrooms d'intégration encadrée d'une IA générative dans le cycle de développement.

Objectif : produire un module CRUD complet de gestion des tags (`/tags`), isolé par utilisateur, avec couverture de tests d'intégration, en démontrant un pilotage IA structuré (cadrage, génération, revue, ajustements).

---

## 2. Traçabilité Git

| Élément | État |
| :--- | :--- |
| Commit IA identifié | `d080691 feat(ai): implement tags module for US08` |
| Préfixe `feat(ai):` distinguant explicitement le code IA | ✅ |
| Branche dédiée | ✅ `feat/ai-us08-tags` |
| CHANGELOG IA dédié | ✅ ce fichier |

---

## 3. Périmètre généré par l'IA

| Fichier généré | Périmètre |
| :--- | :--- |
| `src/tags/tags.controller.ts` | Endpoints `GET /tags`, `POST /tags`, `DELETE /tags/:id` |
| `src/tags/tags.service.ts` | Logique métier Prisma : liste filtrée par owner, création, suppression |
| `src/tags/tags.module.ts` | Déclaration NestJS + injection `PrismaService` |
| `src/tags/dto/create-tag.dto.ts` | Validation `class-validator` — `name` requis, string, min 1, max 30 |
| `test/tags.integration.spec.ts` | Suite Supertest sur BDD Docker dédiée — base des scénarios |

---

## 4. Prompts utilisés

Pilotage en 4 prompts itératifs. Les prompts ont fourni le contexte projet (conventions, schéma Prisma, contrats d'API) mais n'ont pas anticipé tous les cas limites — les scénarios manquants ont été ajoutés manuellement après revue (voir section 6).

### Prompt 1 — Cadrage architectural

> Tu génères du code pour un projet NestJS 11 + Prisma 6 + PostgreSQL.
> Conventions du projet :
>
> - Pattern `ApiResponse.success(message, data)` / `ApiResponse.error(message, data, status)` côté controller
> - Les messages de réponse sont définis dans le controller, pas dans le service
> - Authentification via `JwtAuthGuard` + décorateur `@CurrentUser()` qui injecte `{ id, email }`
> - DTOs validés par `class-validator` (`@IsString`, `@MinLength(1)`, `@MaxLength(30)`)
> - Service retourne la donnée brute, controller habille avec `ApiResponse`
> - Chaque ressource est isolée par `userId` (multi-tenant logique)
>
> Génère le module `tags` (controller + service + module) avec :
>
> - `GET /tags` : liste des tags de l'utilisateur courant uniquement
> - `POST /tags` body `{ name: string }` : crée un tag rattaché à `userId`
> - `DELETE /tags/:id` : supprime un tag de l'utilisateur courant, 403 si appartient à un autre utilisateur
>
> Schéma Prisma fourni :
>
> ```prisma
> model Tag {
>   id     Int    @id @default(autoincrement())
>   name   String
>   userId Int
>   user   User   @relation(fields: [userId], references: [id])
>   @@unique([name, userId])
> }
> ```
>
> Format réponse attendu : `{ id, name }` — ne jamais exposer `userId`.

### Prompt 2 — DTO

> Crée `src/tags/dto/create-tag.dto.ts` avec validation `class-validator` : `name` requis, string, `@MinLength(1)`, `@MaxLength(30)`. Pas de propriété `userId` dans le DTO — il vient de `@CurrentUser()`.

### Prompt 3 — Tests d'intégration (scénarios de base)

> Génère `test/tags.integration.spec.ts` avec Supertest sur une vraie instance Nest + Prisma.
> Scénarios fournis au prompt :
>
> 1. `GET /tags` sans token → 401
> 2. `GET /tags` avec token → 200, retourne uniquement les tags de l'utilisateur courant
> 3. `POST /tags` body valide → 201, retourne `{ id, name }`
> 4. `POST /tags` body invalide (vide / >30 chars) → 400
> 5. `POST /tags` doublon (contrainte `@@unique`) → 409
> 6. `DELETE /tags/:id` propriétaire → 204
> 7. `DELETE /tags/:id` non-propriétaire → 403
> 8. `DELETE /tags/:id` inexistant → 404

> Les scénarios 9 à 13 (isolation multi-tenant, flux complet, redondance 401) n'ont pas été fournis dans ce prompt — ils ont été ajoutés manuellement après relecture du spec (voir section 6).

### Prompt 4 — Revue de sécurité

> Relis le code généré et confirme que :
>
> - aucune requête Prisma n'omet le filtre `userId`
> - aucune route ne retourne d'objet Prisma brut (toujours mapping explicite vers `{ id, name }`)
> - le `DELETE` vérifie l'ownership avant suppression

---

## 5. Revue post-génération

La sortie IA a été relue ligne par ligne avant intégration.

| Axe de revue | Vérification |
| :--- | :--- |
| Sécurité multi-tenant | Filtre `where: { userId }` présent sur toutes les requêtes `findMany` / `findUnique` |
| Ownership sur mutations | Vérification `tag.userId !== userId` sur `DELETE` → `ForbiddenException` 403 |
| Hygiène d'exposition API | Mapping explicite `({ id, name })` — `userId` jamais sérialisé dans la réponse |
| Conformité architecture | `ApiResponse.success()` côté controller, service rend la donnée brute |
| Validation DTO | `@IsString` + `@MinLength(1)` + `@MaxLength(30)` sur `name` |
| Couverture tests | 13/13 tests d'intégration passants — `tags.integration.spec.ts` |

---

## 6. Ajustements apportés après génération

La sortie IA constituait un point de départ qui nécessitait des corrections avant d'être intégrable.

| Domaine | Ajustement |
| :--- | :--- |
| Isolation multi-tenant | Confirmation du filtre `where: { userId }` — absent de certaines requêtes dans la sortie initiale |
| Contrôle d'ownership | Renforcement de la vérification `tag.userId !== currentUser.id` avant `DELETE` |
| Sérialisation API | Mapping explicite `{ id, name }` — la sortie initiale retournait l'entité Prisma brute |
| Conformité `ApiResponse` | Habillage `ApiResponse.success(message, data)` absent du controller généré |
| Validation DTO | `@MaxLength(30)` absent de la sortie initiale, ajouté manuellement |
| Couverture de tests | 5 scénarios ajoutés manuellement : isolation multi-tenant (userB ne peut pas supprimer le tag de userA), flux complet (create → in list → delete), 2 cas 401 supplémentaires — l'IA n'avait couvert que les happy paths et les cas d'erreur les plus évidents |
| Commentaires de code | Suppression des artefacts générés (`// AI:`, blocs explicatifs verbeux) |
| Violation architecture services | `FilesService` manipulait `tx.fileTag` directement sans passer par `TagsService` → refactoring : `TagsService.attachToFile(fileId, tagIds, userId, tx)` dans la même transaction Prisma |

---

## 7. Bilan de pilotage

**Apports :**

| Domaine | Gain |
| :--- | :--- |
| Vitesse | Structure du module (controller + service + module + DTO) générée en une session — gain de temps sur le boilerplate NestJS |
| Base de départ | Squelette proche du style projet grâce au prompt contextualisé — ajustements ciblés, pas de réécriture complète |

**Limites constatées :**

| Limite | Impact | Traitement |
| :--- | :--- | :--- |
| Couverture partielle des tests | Cas 401/403/404/409 et isolation multi-tenant non couverts spontanément | Ajoutés manuellement après relecture du spec |
| Conformité incomplète | Mapping `{ id, name }`, habillage `ApiResponse`, `@MaxLength(30)` absents ou incorrects | Corrigés ligne par ligne lors de la revue |
| Sécurité non garantie | Filtre `userId` et ownership présents mais incomplets sans relecture | Audit manuel via Prompt 4 + corrections |
| Violation architecture services | `FilesService` accédait à `tx.fileTag` sans passer par `TagsService` | Refactoring : `attachToFile` avec vérif ownership + `createMany` dans le `tx` passé |

**Leçon de pilotage :** la qualité d'une génération IA est proportionnelle à la qualité du cadrage initial. Même avec un prompt contextualisé, les cas limites de sécurité et d'isolation multi-tenant n'ont pas été couverts spontanément — une revue systématique reste indispensable.

---

## 8. Références croisées

- Code source : `src/tags/`
- Tests : `test/tags.integration.spec.ts`
- Commit IA : `d080691`
- Branche : `feat/ai-us08-tags`


L'US08 a été choisie comme périmètre de pilotage IA pour le projet P4, conformément à l'exigence OpenClassrooms d'intégration encadrée d'une IA générative dans le cycle de développement.

Objectif : produire un module CRUD complet de gestion des tags (`/tags`), isolé par utilisateur, avec couverture de tests d'intégration, en démontrant un pilotage IA structuré (cadrage, génération, revue, tests).

---

## 2. Traçabilité Git

| Élément                                                  | État                                               |
| :------------------------------------------------------- | :------------------------------------------------- |
| Commit IA identifié                                      | `f12cdf4 feat(ai): implement tags module for US08` |
| Préfixe `feat(ai):` distinguant explicitement le code IA | ✅                                                 |
| Branche dédiée                                           | ✅ `feat/ai-us08-tags`                             |
| CHANGELOG IA dédié                                       | ✅ ce fichier                                      |

Le code généré par IA est isolé sur une branche dédiée et tracé par un préfixe de commit explicite, permettant une revue ciblée conforme aux exigences de pilotage IA.

---

## 3. Cadrage du périmètre IA

| Fichier généré                | Périmètre                                                              |
| :---------------------------- | :--------------------------------------------------------------------- |
| `src/tags/tags.controller.ts` | Endpoints `GET /tags`, `POST /tags`, `DELETE /tags/:id`                |
| `src/tags/tags.service.ts`    | Logique métier Prisma : liste filtrée par owner, création, suppression |
| `src/tags/tags.module.ts`     | Déclaration NestJS + injection `PrismaService`                         |

---

## 4. Prompts utilisés

Pilotage en plusieurs prompts itératifs avec contexte projet explicite. Extraits significatifs :

### Prompt 1 - Cadrage architectural

> Tu génères du code pour un projet NestJS 11 + Prisma 6 + PostgreSQL.
> Conventions du projet :
>
> - Pattern `ApiResponse.success(message, data)` / `ApiResponse.error(message, data, status)` côté controller
> - Les messages de réponse sont définis dans le controller, pas dans le service
> - Authentification via `JwtAuthGuard` + décorateur `@CurrentUser()` qui injecte `{ id, email }`
> - DTOs validés par `class-validator` (`@IsString`, `@MinLength(1)`, `@MaxLength(30)`)
> - Service retourne la donnée brute, controller habille avec `ApiResponse`
> - Chaque ressource est isolée par `userId` (multi-tenant logique)
>
> Génère le module `tags` (controller + service + module) avec :
>
> - `GET /tags` : liste des tags de l'utilisateur courant uniquement
> - `POST /tags` body `{ name: string }` : crée un tag rattaché à `userId`
> - `DELETE /tags/:id` : supprime un tag de l'utilisateur courant, retourne 403 si le tag appartient à un autre utilisateur
>
> Schéma Prisma fourni :
>
> ```prisma
> model Tag {
>   id     Int    @id @default(autoincrement())
>   name   String
>   userId Int
>   user   User   @relation(fields: [userId], references: [id])
>   files  File[] @relation("FileTags")
>   @@unique([name, userId])
> }
> ```
>
> Format réponse attendu : `{ id, name }` (jamais exposer `userId` côté API).

### Prompt 2 - Spécification du DTO

> Crée `src/tags/dto/create-tag.dto.ts` avec validation `class-validator` : `name` requis, string, `@MinLength(1)`, `@MaxLength(30)`. Pas de propriété `userId` dans le DTO - il vient de `@CurrentUser()`.

### Prompt 3 - Tests d'intégration

> Génère `test/tags.integration.spec.ts` avec Supertest sur une vraie instance Nest + Prisma (BDD Docker dédiée tests).
> Scénarios attendus :
>
> 1. `GET /tags` sans token → 401
> 2. `GET /tags` avec token → 200, retourne uniquement les tags de l'utilisateur courant
> 3. `POST /tags` body valide → 201, retourne `{ id, name }`
> 4. `POST /tags` body invalide (vide / >30 chars) → 400
> 5. `POST /tags` doublon (contrainte `@@unique`) → 409
> 6. `DELETE /tags/:id` propriétaire → 200
> 7. `DELETE /tags/:id` non-propriétaire → 403
> 8. `DELETE /tags/:id` inexistant → 404
>
> Utilise un `beforeEach` qui purge la table et réinjecte deux users + leurs tags via `prisma.tag.createMany`.

### Prompt 4 - Revue de sécurité

> Relis le code généré et confirme que :
>
> - aucune requête Prisma n'omet le filtre `userId`
> - aucune route ne retourne d'objet Prisma brut (toujours mapping explicite vers `{ id, name }`)
> - le `DELETE` vérifie l'ownership avant suppression

---

## 5. Revue post-génération

La sortie IA a été relue ligne par ligne avant intégration. Points vérifiés et ajustés au besoin pour conformité avec les conventions du projet :

| Axe de revue             | Vérification                                                                         |
| :----------------------- | :----------------------------------------------------------------------------------- |
| Sécurité multi-tenant    | Filtre `where: { userId }` présent sur toutes les requêtes `findMany` / `findUnique` |
| Ownership sur mutations  | Vérification `tag.userId !== userId` sur `DELETE` → `ForbiddenException` 403         |
| Hygiène d'exposition API | Mapping explicite `({ id, name })` - `userId` jamais sérialisé dans la réponse       |
| Conformité architecture  | `ApiResponse.success()` côté controller, service rend la donnée brute                |
| Validation DTO           | `@IsString` + `@MinLength(1)` + `@MaxLength(30)` sur `name`                          |
| Couverture tests         | 12/12 tests d'intégration passants - `tags.integration.spec.ts`                      |

**Résultat tests : 12/12 passants. Couverture intégration : 88 % statements.**

---

## 6. Ajustements apportés après génération

Le code généré sert de point de départ - il est systématiquement adapté pour s'aligner sur les conventions du projet et durcir la sécurité. Détail des ajustements opérés sur la sortie IA :

| Domaine                  | Ajustement appliqué                                                                                            |
| :----------------------- | :------------------------------------------------------------------------------------------------------------- |
| Isolation multi-tenant   | Confirmation du filtre `where: { userId }` sur toutes les requêtes Prisma de lecture                           |
| Contrôle d'ownership     | Ajout/renforcement de la vérification `tag.userId !== currentUser.id` avant `DELETE` → `ForbiddenException`    |
| Sérialisation API        | Mapping explicite vers `{ id, name }` (au lieu d'un retour d'entité Prisma) pour ne jamais exposer `userId`    |
| Conformité `ApiResponse` | Habillage des retours du service par `ApiResponse.success(message, data)` côté controller                      |
| Validation DTO           | Ajout de `@MaxLength(30)` sur `name` pour borner la taille côté entrée (en complément de `@MinLength(1)`)      |
| Couverture de tests      | Complément du fichier `tags.integration.spec.ts` avec scénarios 401 / 403 / 404 / 409 (cas d'erreur)           |
| Commentaires de code     | Suppression des artefacts générés (commentaires `// AI:`, blocs explicatifs verbeux) - alignement style projet |

Ces ajustements relèvent du travail standard d'intégration d'une génération IA dans un projet existant : l'IA produit un squelette générique conforme au prompt, le développeur l'aligne sur les invariants du projet (sécurité, conventions, style, couverture de tests).

---

## 7. Bilan de pilotage

- **Apport IA :** génération rapide du squelette NestJS conforme aux conventions injectées dans le prompt - gain de temps significatif sur le boilerplate (module + controller + service + DTO + spec d'intégration).
- **Rôle du développeur :** cadrage en amont (conventions, schéma Prisma, contrats d'API), revue systématique de chaque sortie, validation par tests d'intégration sur une vraie BDD.
- **Leçon de pilotage :** la qualité d'une génération IA est directement proportionnelle à la qualité du cadrage initial (conventions explicites, schéma fourni, scénarios de test listés). Un prompt vague produit du code générique ; un prompt contextualisé produit du code intégrable.

---

## 8. Références croisées

- Pilotage IA livrable OC : voir section **P4 - PILOTAGE IA** du dossier de projet
- Code source : `src/tags/`
- Tests : `test/tags.integration.spec.ts`
- Commit : `f12cdf4`
- Branche : `feat/ai-us08-tags`

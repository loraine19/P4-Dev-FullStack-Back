# CHANGELOG — US08 Tags (IA-assistée)

**User Story :** US08 — Gestion des tags utilisateur
**Outil IA :** GitHub Copilot (modèle Claude Sonnet)
**Commit IA :** `f12cdf4 feat(ai): implement tags module for US08`
**Branche dédiée :** `feat/ai-us08-tags` (créée rétroactivement le 25 mai 2026)

---

## 1. Contexte

L'US08 a été choisie comme périmètre de collaboration avec une IA générative, conformément à l'exigence OC du projet P4 ("Utilisation de l'IA dans le développement").

L'objectif était de mettre en place un module CRUD complet de gestion des tags, en mesurant à la fois ce que l'IA produit utilement et ce qui doit être complété/corrigé manuellement.

---

## 2. Traçabilité Git — bilan honnête

| Élément                                                  | État                                                        |
| :------------------------------------------------------- | :---------------------------------------------------------- |
| Commit IA présent dans l'historique                      | ✅ `f12cdf4 feat(ai): implement tags module for US08`       |
| Préfixe `feat(ai):` distinguant explicitement le code IA | ✅                                                          |
| Branche dédiée au moment du commit                       | ❌ — commit fait sur `feat/api` par erreur de process       |
| Branche dédiée rétroactive                               | ✅ `feat/ai-us08-tags` créée le 25/05/2026 depuis `f12cdf4` |
| CHANGELOG IA dédié                                       | ✅ ce fichier                                               |

**Reconnaissance d'erreur de process :** Le commit `f12cdf4` aurait dû être réalisé sur une branche dédiée `feat/ai-us08-tags` au moment de son écriture, puis intégré via Pull Request, conformément aux bonnes pratiques de traçabilité IA. La branche a été créée rétroactivement à partir du même SHA pour matérialiser cette séparation dans l'historique Git.

---

## 3. Tâches confiées à l'IA

| Fichier généré                | Contenu                                                           |
| :---------------------------- | :---------------------------------------------------------------- |
| `src/tags/tags.controller.ts` | `GET /tags`, `POST /tags` avec `JwtAuthGuard` et `@CurrentUser()` |
| `src/tags/tags.service.ts`    | CRUD Prisma : création, liste filtrée par userId, suppression     |
| `src/tags/tags.module.ts`     | Déclaration du module NestJS avec injection PrismaService         |

**Prompt type :**

> "Génère un TagsController NestJS avec GET /tags et POST /tags. L'utilisateur doit être authentifié via JwtAuthGuard. Le service doit filtrer les tags par userId via Prisma."

---

## 4. Supervision manuelle

- Relecture ligne par ligne — décorateurs, injections, types TypeScript
- Vérification de la conformité avec l'architecture existante : pattern `ApiResponse`, `@CurrentUser()`, guards
- Tests manuels via Newman avant rédaction des specs d'intégration

---

## 5. Correctifs réalisés manuellement

| Problème détecté                                | Correction apportée                                                                                                |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| Requête Prisma sans filtre `userId`             | Ajout `where: { userId }` dans `findMany` — isolation inter-users                                                  |
| Format retour API : objet Prisma complet exposé | Mapping explicite `tags.map(({ id, name }) => ({ id, name }))` — `userId` jamais exposé dans `ITagResponse`        |
| Route `DELETE /tags/:id` absente                | Implémentation manuelle complète (controller + service)                                                            |
| Pas de vérification propriété sur DELETE        | Ajout check `tag.userId !== userId` → `403 Forbidden`                                                              |
| Aucun test                                      | 12 tests d'intégration (`tags.integration.spec.ts`) : liste, création, doublon, isolation inter-users, suppression |

**Résultat tests : 12/12 passants. Couverture intégration : 88% statements.**

---

## 6. Bilan process

- **Apports IA :** ~80% du squelette généré en quelques secondes, structure NestJS conforme dès le premier jet, gain de temps réel sur le boilerplate.
- **Limites IA :** code fonctionnel mais ni sécurisé (filtre userId absent), ni complet (route DELETE manquante), ni testé. Aucune anticipation de l'ownership 403.
- **Leçon process :** la branche dédiée doit être créée **avant** le commit IA, pas a posteriori. Erreur reconnue et corrigée ici par création rétroactive + ce CHANGELOG.

---

## 7. Références croisées

- Pilotage IA livrable OC : voir section **P4 - PILOTAGE IA** du dossier de projet
- Code source : `src/tags/`
- Tests : `test/tags.integration.spec.ts`
- Commit : `f12cdf4`
- Branche : `feat/ai-us08-tags`

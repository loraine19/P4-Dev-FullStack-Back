# **MAINTENANCE.md — DataShare Backend**

**Branche** : `feat/api` — **Date** : 25/05/2026

---

## **1. Procédure d'audit de sécurité**

### Commande

```bash
npm audit
```

### Résultat actuel (25/05/2026)

```
19 vulnérabilités — 1 critique, 10 high, 8 moderate
Packages affectés : flatted ≤3.4.1, handlebars 4.0.0–4.7.8, jose 3.0.0–4.15.4, lodash ≤4.17.23
```

**Origine** : toutes dans `newman-reporter-htmlextra` (devDependency — outil de rapport de tests Postman). **Le code production (`dependencies`) ne présente aucune vulnérabilité.**

### Traitement

| Contexte                                        | Action                                                           |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| Vulnérabilité dans `dependencies` (production)  | Corriger immédiatement — `npm audit fix` ou mise à jour manuelle |
| Vulnérabilité dans `devDependencies` uniquement | Évaluer l'impact réel — pas d'exposition en production           |
| Fix avec breaking change (`--force`)            | Tester avant d'appliquer — vérifier la suite d'intégration       |

---

## **2. Inventaire des dépendances critiques**

### Production (`dependencies`)

| Package                                 | Version          | Rôle                                       | Risque mise à jour                                                             |
| :-------------------------------------- | :--------------- | :----------------------------------------- | :----------------------------------------------------------------------------- |
| `@nestjs/common`                        | ^11.0.1          | Framework HTTP                             | **Moyen** — API publique stable, breaking changes annoncés en `CHANGELOG`      |
| `@nestjs/jwt`                           | ^11.0.2          | Génération / vérification JWT              | **Élevé** — impacte l'authentification, tester login + guard après mise à jour |
| `@nestjs/schedule`                      | ^6.1.3           | Cron CRON (nettoyage fichiers expirés)     | **Faible** — API stable                                                        |
| `@prisma/client` + `prisma`             | ^6.19.3          | ORM PostgreSQL                             | **Élevé** — migrations potentiellement requises, tester toutes les requêtes    |
| `bcrypt`                                | ^6.0.0           | Hachage mots de passe + passwords fichiers | **Élevé** — librairie de sécurité, vérifier les advisories avant mise à jour   |
| `class-validator` + `class-transformer` | ^0.15.1 / ^0.5.1 | Validation DTOs                            | **Moyen** — `ValidationPipe` peut changer de comportement                      |
| `multer`                                | ^2.1.1           | Upload fichiers multipart                  | **Moyen** — vérifier la compatibilité NestJS Platform Express                  |
| `cookie-parser`                         | ^1.4.7           | Lecture cookies httpOnly                   | **Faible** — API stable                                                        |

### Dev uniquement (`devDependencies` — pas d'impact production)

| Package                     | Version           | Rôle                                                           |
| :-------------------------- | :---------------- | :------------------------------------------------------------- |
| `jest` + `ts-jest`          | ^30.0.0 / ^29.2.5 | Tests unitaires, intégration, e2e                              |
| `newman-reporter-htmlextra` | ^1.23.1           | Rapport HTML tests Newman (vulnérable, usage local uniquement) |
| `typescript`                | ^5.7.3            | Compilation TypeScript                                         |

---

## **3. Fréquence de mise à jour recommandée**

| Type              | Fréquence        | Déclencheur                       | Procédure                                                                 |
| :---------------- | :--------------- | :-------------------------------- | :------------------------------------------------------------------------ |
| **Patch** (x.y.Z) | À chaque release | CVE, `npm audit` critique         | `npm update` → vérifier `npm audit` → relancer `npm run test:integration` |
| **Minor** (x.Y.z) | Mensuelle        | Dépendance de sécurité principale | Mettre à jour + relancer la suite complète (unit + integration + e2e)     |
| **Major** (X.y.z) | Sur décision     | Fin de support, incompatibilité   | Lire le CHANGELOG, ouvrir une branche dédiée, tester exhaustivement       |

---

## **4. Procédure de mise à jour standard**

```bash
# 1 — Vérifier l'état avant mise à jour
npm audit
npm outdated

# 2 — Mettre à jour (patch/minor)
npm update

# 3 — Vérifier qu'aucune régression n'est introduite
npm run test          # 12/12 unitaires
npm run test:integration  # 45/45 intégration
npm run test:e2e:cov  # 12/12 e2e

# 4 — Vérifier la compilation TypeScript
npx tsc --noEmit

# 5 — Vérifier l'audit après mise à jour
npm audit
```

> **Règle** : une mise à jour est validée uniquement si les trois suites de tests passent à 100% et `npx tsc --noEmit` retourne 0 erreur.

---

## **5. Procédures spécifiques par package**

### `bcrypt` — hachage mots de passe

Utilisé dans `auth.service.ts` (hachage password utilisateur) et `files.service.ts` (hachage password de téléchargement).

- Avant toute mise à jour : vérifier les advisories GitHub (`npm audit`, CVE)
- Après mise à jour : tester `POST /auth/register` + `POST /auth/login` + upload avec password + download avec password
- `bcrypt` v6 est compatible avec les hachages générés par v5 — pas de migration BDD nécessaire entre versions mineures

### `prisma` + `@prisma/client`

- Mettre à jour les deux en même temps — les versions doivent être identiques
- Après mise à jour, vérifier qu'aucune migration automatique n'est déclenchée : `npx prisma migrate status`
- Si migration requise, valider sur la BDD de dev avant le déploiement

```bash
npm update prisma @prisma/client
npx prisma migrate status
npm run test:integration
```

### `@nestjs/jwt`

Impacte directement l'authentification. Après mise à jour :

```bash
npm update @nestjs/jwt
# Tester login → cookie → endpoint protégé → logout → accès sans cookie
npm run test:e2e:cov
```

### `newman-reporter-htmlextra`

Vulnérabilités présentes (handlebars, flatted, lodash) — uniquement utilisé pour générer les rapports HTML des tests Postman en local. Pas d'exposition en production ni en CI.

- Ne pas appliquer `npm audit fix --force` sans vérifier que les rapports Newman sont toujours générés
- Alternative : basculer sur `newman-reporter-html` si les vulnérabilités deviennent bloquantes

---

## **6. Surveillance en production**

| Signal                                                                  | Action                                         |
| :---------------------------------------------------------------------- | :--------------------------------------------- |
| `npm audit` retourne une vulnérabilité **critical** dans `dependencies` | Corriger dans les 24h, ouvrir une PR dédiée    |
| `npm audit` retourne **high** dans `dependencies`                       | Planifier la correction dans la semaine        |
| `npm audit` retourne uniquement `devDependencies`                       | Documenter, planifier à la prochaine itération |
| Fin de support LTS Node.js                                              | Mettre à jour avant la date de fin de support  |

Référence LTS Node.js : [nodejs.org/en/about/releases](https://nodejs.org/en/about/releases)

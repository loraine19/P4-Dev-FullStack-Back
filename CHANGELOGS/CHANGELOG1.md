# CHANGELOG1 - main - back

**Sprint step** : STEP 2 - Initialisation des applications
**Branche** : `main`

**Objectif** : Socle backend NestJS - structure modulaire, Prisma + PostgreSQL Docker, cron de nettoyage, squelettes de tous les modules métier.

---

[1. Ce qui est en place](#1-ce-qui-est-en-place)
[2. Choix techniques](#2-choix-techniques)
[a. Prisma over TypeORM](#a-prisma-over-typeorm)
[b. Modèle de données](#b-modèle-de-données)
[c. Cron de nettoyage](#c-cron-de-nettoyage)
[d. PrismaService](#d-prismaservice)
[3. Variables d'environnement requises](#3-variables-denvironnement-requises)

---

## 1. Ce qui est en place

| Thème              | Ce qui est opérationnel                                                     |
| :----------------- | :-------------------------------------------------------------------------- |
| Structure NestJS   | 6 modules : auth / files / download / tags / prisma / cron-task             |
| Base de données    | Prisma 6 + PostgreSQL 16 Docker - migration init, 4 tables                  |
| Cron               | Suppression automatique des fichiers expirés (toutes les heures)            |
| Squelettes communs | Guards, filtres d'exception, décorateur `@CurrentUser()`, logger middleware |
| Configuration      | `.env.example`, `docker-compose.yml`, prefix `api/v1`                       |

---

## 2. Choix techniques

### a. Prisma over TypeORM

Prisma 6 - typage généré depuis le schéma, migrations SQL versionnées, client fortement typé. - choix justifié par la maturité du tooling et la lisibilité du schéma `.prisma`.

### b. Modèle de données

4 tables : `User`, `File`, `Tag`, `FileTag` (PK composite `[fileId, tagId]`).

- `File.userId` nullable + `onDelete: SetNull` - un fichier survit à la suppression du compte
- `Tag.userId` + `onDelete: Cascade` - les tags appartiennent à l'utilisateur
- `@@unique([name, userId])` sur `Tag` - pas de doublon de tag par utilisateur

### c. Cron de nettoyage

`@Cron(CronExpression.EVERY_HOUR)` dans `CronTaskService` :

1. `findMany` où `expiresAt < now()`
2. `fs.unlinkSync` physique par fichier
3. `deleteMany` Prisma
4. Log du résultat

Choix : suppression synchrone fichier par fichier (volume faible attendu) - pas de batch async pour simplifier la gestion d'erreur.

### d. PrismaService

`extends PrismaClient implements OnModuleInit` - connexion établie au démarrage du module, pas de singleton global.

---

## 3. Variables d'environnement requises

```env
DATABASE_URL=
NODE_ENV=
```

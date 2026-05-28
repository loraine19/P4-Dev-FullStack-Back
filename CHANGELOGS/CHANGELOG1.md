# CHANGELOG - main (initial scaffold)

**Sprint step** : STEP 2 - Initialisation des applications
**Branche** : `main`

**Objectif** : Socle backend NestJS - structure modulaire, Prisma + PostgreSQL Docker, cron de nettoyage, squelettes de tous les modules métier.

---

## Ce qui est en place

| Thème              | Ce qui est opérationnel                                                     |
| :----------------- | :-------------------------------------------------------------------------- |
| Structure NestJS   | 6 modules : auth / files / download / tags / prisma / cron-task             |
| Base de données    | Prisma 6 + PostgreSQL 16 Docker - migration init, 4 tables                  |
| Cron               | Suppression automatique des fichiers expirés (toutes les heures)            |
| Squelettes communs | Guards, filtres d'exception, décorateur `@CurrentUser()`, logger middleware |
| Configuration      | `.env.example`, `docker-compose.yml`, prefix `api/v1`                       |

---

## Choix techniques

### Prisma over TypeORM

Prisma 6 - typage généré depuis le schéma, migrations SQL versionnées, client fortement typé. Pas de TypeORM malgré la mention dans le SPRINT_PLAN - choix justifié par la maturité du tooling et la lisibilité du schéma `.prisma`.

### Modèle de données

4 tables : `User`, `File`, `Tag`, `FileTag` (PK composite `[fileId, tagId]`).

- `File.userId` nullable + `onDelete: SetNull` - un fichier survit à la suppression du compte
- `Tag.userId` + `onDelete: Cascade` - les tags appartiennent à l'utilisateur
- `@@unique([name, userId])` sur `Tag` - pas de doublon de tag par utilisateur

### Cron de nettoyage

`@Cron(CronExpression.EVERY_HOUR)` dans `CronTaskService` :

1. `findMany` où `expiresAt < now()`
2. `fs.unlinkSync` physique par fichier
3. `deleteMany` Prisma
4. Log du résultat

Choix : suppression synchrone fichier par fichier (volume faible attendu) - pas de batch async pour simplifier la gestion d'erreur.

### PrismaService

`extends PrismaClient implements OnModuleInit` - connexion établie au démarrage du module, pas de singleton global.

---

## Structure des fichiers notables

```
prisma/
  schema.prisma                  -  modèles User / File / Tag / FileTag
  migrations/20260509103448_init -  migration SQL initiale
docker-compose.yml               -  PostgreSQL 16 + healthcheck
src/
  main.ts                        -  prefix api/v1 (ValidationPipe + auth câblés en feat/auth)
  app.module.ts                  -  imports des modules (complets en feat/auth)
  prisma/prisma.service.ts       -  extends PrismaClient, onModuleInit → $connect
  cron-task/
    cron-task.service.ts         -  @Cron EVERY_HOUR → nettoyage fichiers expirés
  common/
    guards/jwt-auth.guard.ts            -  squelette (implémenté en feat/auth)
    guards/optional-jwt-auth.guard.ts   -  squelette
    decorators/current-user.decorator.ts
    filters/http-exception.filter.ts
    filters/prisma-exception.filter.ts
    middlewares/logger.middleware.ts
    logger/logger.service.ts · logger.module.ts
  auth/ files/ download/ tags/   -  squelettes module/controller/service/dto/interfaces
```

---

## Variables d'environnement requises

```env
DATABASE_URL=
NODE_ENV=
```

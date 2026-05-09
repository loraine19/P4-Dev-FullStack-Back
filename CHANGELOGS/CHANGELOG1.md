# **CHANGELOG**

## **Branche main — Initial scaffold**

**Objectif** :
Initialiser le backend NestJS avec Prisma, Docker PostgreSQL, la structure modulaire complète et une tâche cron de nettoyage automatique.

| Thème                | Ce qui a été livré                                               | Commits |
| :------------------- | :--------------------------------------------------------------- | :------ |
| Structure NestJS     | Modules auth / files / download / tags / prisma / cron-task      | babf2e2 |
| Base de données      | Prisma 6 + PostgreSQL 16 Docker + migration init (4 tables)      | babf2e2 |
| Cron                 | Suppression automatique des fichiers expirés (toutes les heures) | babf2e2 |
| Sécurité (squelette) | Guards, filtres d'exception, décorateurs communs                 | babf2e2 |
| Configuration        | .env.example, docker-compose.yml, README                         | babf2e2 |

---

## **1. Structure NestJS + Prisma**

**Commit** : babf2e2

### **Ce qui a été mis en place**

- NestJS 11 + TypeScript strict
- Prisma 6 avec datasource PostgreSQL — modèles : `User`, `File`, `Tag`, `FileTag` (PK composite)
- Docker Compose PostgreSQL 16 avec healthcheck
- Migration `init` exécutée — 4 tables en base
- Prefix global `api/v1` prévu dans `main.ts`

### **Fichiers créés**

- `prisma/schema.prisma`
- `prisma/migrations/20260509103448_init/migration.sql`
- `docker-compose.yml`
- `src/prisma/prisma.service.ts`
- `src/main.ts`
- `src/app.module.ts`

---

## **2. Modules métier (squelettes)**

**Commit** : babf2e2

### **Ce qui a été mis en place**

- Modules `auth`, `files`, `download`, `tags` avec controllers, services, DTOs et interfaces
- Middleware logger sur toutes les routes
- Filtres d'exception globaux (HTTP + Prisma)
- Décorateur `@CurrentUser()` et interface `RequestWithUser`
- Interface `JwtPayload { sub, email }`

### **Fichiers créés**

- `src/auth/auth.module.ts` · `auth.controller.ts` · `auth.service.ts`
- `src/auth/dto/login.dto.ts` · `register.dto.ts`
- `src/auth/interfaces/auth-response.interface.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/files/files.module.ts` · `files.controller.ts` · `files.service.ts`
- `src/download/download.module.ts` · `download.controller.ts` · `download.service.ts`
- `src/tags/tags.module.ts` · `tags.controller.ts` · `tags.service.ts`
- `src/common/guards/jwt-auth.guard.ts` · `optional-jwt-auth.guard.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/common/filters/http-exception.filter.ts` · `prisma-exception.filter.ts`
- `src/common/middlewares/logger.middleware.ts`
- `src/common/interfaces/jwt-payload.interface.ts` · `request-with-user.interface.ts`

---

## **3. Tâche cron — nettoyage fichiers expirés**

**Commit** : babf2e2

### **Ce qui a été mis en place**

- `@nestjs/schedule` installé et `ScheduleModule.forRoot()` dans `AppModule`
- `CronTaskModule` avec `CronTaskService` : `@Cron(EVERY_HOUR)` → `findMany` où `expiresAt < now()` → `fs.unlinkSync` physique → `deleteMany` Prisma → Logger

### **Fichiers créés**

- `src/cron-task/cron-task.module.ts`
- `src/cron-task/cron-task.service.ts`

---

## **Récapitulatif final**

| Thème                           | Statut |
| :------------------------------ | :----- |
| Structure NestJS modulaire      | ✅     |
| Prisma 6 + PostgreSQL 16 Docker | ✅     |
| Migration init (4 tables)       | ✅     |
| Modules métier squelettes       | ✅     |
| Tâche cron nettoyage            | ✅     |
| Guards / filtres / décorateurs  | ✅     |
| .env.example + README           | ✅     |



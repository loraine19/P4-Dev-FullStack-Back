# Logger & Cron — Comment ça marche

## 1. LoggerService — Logger personnalisé

### Pourquoi un logger custom ?

NestJS fournit un logger natif basique (`Logger` du package `@nestjs/common`). Il affiche dans la console, mais ne persiste rien. Pour un projet en production, on a besoin de **logs écrits sur disque**, avec rotation automatique et un contexte clair.

`LoggerService` étend `ConsoleLogger` de NestJS : on garde le comportement console (couleurs, niveaux) et on y ajoute l'écriture fichier.

### Ce qu'il fait

```
[11/05/2026 14:23:01] [LOG]   [AuthService]   User registered: test@mail.com
[11/05/2026 14:23:45] [WARN]  [AuthService]   Mobile login — token returned in body
[11/05/2026 14:24:10] [ERROR] [ErrorFilter]   500: Unexpected token | POST /api/v1/auth/login
```

Chaque ligne dans `logs/YYYY-MM-DD.log` contient :
- Timestamp (format FR)
- Niveau (`LOG` / `WARN` / `ERROR`)
- Contexte (nom du service qui log)
- Message

### Rotation des logs

Quand un fichier dépasse **10 Mo**, le logger :
1. Ferme le stream du fichier courant
2. Relit la date du jour
3. Ouvre un nouveau stream sur un nouveau fichier

Pratique : en production un fichier par jour, rotation automatique si le volume est élevé.

### Comment injecter

```typescript
// 1. Importer LoggerModule dans le module du service
@Module({
  imports: [LoggerModule],
  providers: [MyService],
})
export class MyModule {}

// 2. Injecter dans le constructeur
@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {}

  doSomething() {
    this.logger.log('Message', MyService.name);  // context = 'MyService'
    this.logger.warn('Attention', MyService.name);
    this.logger.error('Erreur', stack, MyService.name);
  }
}
```

> Toujours passer `ClassName.name` comme second argument — c'est le contexte affiché dans les logs.

### Cycle de vie

`LoggerService` implémente `OnModuleDestroy` : quand NestJS s'arrête (SIGTERM, restart), le stream de fichier est fermé proprement. Pas de log perdu.

---

## 2. Chaîne des filtres d'exceptions

Avant d'aller plus loin, il faut comprendre comment les erreurs sont loggées automatiquement. Trois filtres globaux sont enregistrés dans `main.ts` :

```
Requête → [PrismaExceptionFilter] → [ErrorFilter] → [HttpExceptionFilter]
              ↓ (Prisma P2002…)        ↓ (JS Error)     ↓ (NestJS HttpException)
         ApiResponse.error()       ApiResponse.error()  ApiResponse.error()
```

NestJS associe chaque exception au filtre le plus spécifique :
- `ConflictException`, `UnauthorizedException` → `HttpExceptionFilter` (catch `HttpException`)
- `PrismaClientKnownRequestError` → `PrismaExceptionFilter`
- Toute autre `Error` JS → `ErrorFilter`

Chaque filtre :
1. Logge l'erreur avec `LoggerService`
2. Retourne `ApiResponse.error(message)` → format uniforme `{ status: 'error', message, data: null }`

---

## 3. CronTaskService — Tâches planifiées

### Pourquoi une tâche cron ?

Les fichiers uploadés ont une date d'expiration (`expiresAt`). Il faut un mécanisme automatique pour :
1. **Supprimer les fichiers du disque** (`uploads/`)
2. **Supprimer les entrées de la base** (Prisma)

Sans cron, les fichiers expirés s'accumulent indéfiniment.

### Comment ça fonctionne

```typescript
@Cron(CronExpression.EVERY_HOUR)  // déclenché toutes les heures pile
async deleteExpiredFiles() {
  // 1. Trouver tous les fichiers expirés en BDD
  const expiredFiles = await this.prisma.file.findMany({
    where: { expiresAt: { lt: new Date() } },  // lt = less than = avant maintenant
  });

  // 2. Pour chaque fichier : supprimer du disque si présent
  for (const file of expiredFiles) {
    const filePath = path.join(this.uploadsDir, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);  // suppression synchrone (opération ponctuelle)
      this.logger.log(`Deleted expired file from disk: ${file.filename}`, CronTaskService.name);
    }
  }

  // 3. Supprimer tous les enregistrements expirés d'un coup (deleteMany)
  const { count } = await this.prisma.file.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  if (count > 0) {
    this.logger.log(`Cleaned up ${count} expired file(s) from database`, CronTaskService.name);
  }
}
```

> **Pourquoi deux requêtes Prisma ?** La première (`findMany`) récupère les noms de fichiers pour le disque. La seconde (`deleteMany`) est plus efficace pour la BDD (une seule requête DELETE au lieu de N).

### Dépendances

Le cron est activé via `ScheduleModule.forRoot()` dans `AppModule`. Sans ce module, le décorateur `@Cron` est ignoré silencieusement.

```typescript
// app.module.ts
@Module({
  imports: [
    ScheduleModule.forRoot(),  // active le scheduler NestJS
    LoggerModule,
    CronTaskModule,
    // ...
  ],
})
```

### Ajouter un nouveau cron

```typescript
// dans CronTaskService
@Cron('0 3 * * *')  // tous les jours à 3h du matin (format crontab standard)
async generateDailyReport() {
  this.logger.log('Generating daily report...', CronTaskService.name);
  // ...
}
```

Expressions disponibles : `EVERY_MINUTE`, `EVERY_HOUR`, `EVERY_DAY_AT_MIDNIGHT`, ou format crontab `'*/5 * * * *'`.

---

## 4. Flux complet — Exemple : upload expiré

```
T+0h    → User uploads file (expiresAt = now + 24h)
T+24h   → File expires (expiresAt < now)
T+25h   → @Cron triggers:
            - findMany({ expiresAt: { lt: now } }) → trouve le fichier
            - fs.unlinkSync('uploads/abc123.jpg')
            - deleteMany({ expiresAt: { lt: now } })
            - logger.log('Cleaned up 1 expired file(s)')
```

Le log `[LOG] [CronTaskService] Cleaned up 1 expired file(s) from database` est visible dans la console ET dans `logs/YYYY-MM-DD.log`.

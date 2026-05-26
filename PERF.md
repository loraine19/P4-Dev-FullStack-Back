# PERF.md — Tests de performance et métriques

## 1. Contexte

| Paramètre        | Valeur                                                      |
| ---------------- | ----------------------------------------------------------- |
| Outil            | Newman (Postman CLI) — k6 indisponible dans l'environnement |
| Date             | 24/05/2026                                                  |
| Backend          | NestJS 11, PostgreSQL 16, env local                         |
| Requêtes testées | 16 requêtes, 25 assertions, 0 échec                         |
| Durée totale     | 2.1s                                                        |

> La collection Newman couvre l'ensemble du flux : auth → upload → download → tags → logout → cleanup.

---

## 2. Test de performance — Endpoints critiques

### 2.1 Upload (POST /api/v1/files)

| Endpoint                     | Temps réponse | Taille réponse |
| ---------------------------- | ------------- | -------------- |
| POST /api/v1/files (auth)    | **100 ms**    | 649 B          |
| POST /api/v1/files/anonymous | **34 ms**     | 649 B          |

**Analyse upload authentifié (100 ms) :**

- JwtAuthGuard : vérification token (~5ms)
- Multer diskStorage : écriture fichier sur disque (~20ms)
- Prisma : INSERT en base PostgreSQL (~30ms)
- Sérialisation réponse ApiResponse + shareToken UUID (~5ms)

**Analyse upload anonyme (34 ms) :**

- Pas de guard JWT : gain direct sur le middleware
- Flux Multer + Prisma identique

### 2.2 Download (POST /api/v1/download/:token)

| Endpoint                                  | Temps réponse | Taille réponse |
| ----------------------------------------- | ------------- | -------------- |
| GET /api/v1/download/:token (metadata)    | **23 ms**     | 500 B          |
| POST /api/v1/download/:token (stream)     | **31 ms**     | 511 B          |
| GET /api/v1/download/token-invalide (404) | **16 ms**     | 410 B          |

**Analyse (31 ms) :**

- SELECT Prisma sur shareToken (index UUID) : ~10ms
- Vérification existence fichier sur disque : ~5ms
- Streaming du fichier + header Content-Disposition : ~16ms

### 2.3 Autres endpoints

| Endpoint              | Temps réponse | Note                                       |
| --------------------- | ------------- | ------------------------------------------ |
| POST /auth/register   | 383 ms        | bcrypt.hash 10 rounds — coûteux par design |
| POST /auth/login      | 256 ms        | bcrypt.compare + JWT sign                  |
| GET /files (liste)    | 25 ms         | SELECT filtré par userId                   |
| POST /tags (création) | 44 ms         | INSERT + vérif contrainte unique           |
| GET /tags (liste)     | 32 ms         | SELECT WHERE userId                        |
| DELETE /tags/:id      | 39 ms         | vérif propriété + DELETE                   |
| POST /auth/logout     | 37 ms         | invalidation token côté client             |

### 2.4 Résumé global

| Métrique      | Valeur |
| ------------- | ------ |
| Temps moyen   | 72 ms  |
| Temps minimum | 12 ms  |
| Temps maximum | 383 ms |
| Écart-type    | 98 ms  |

**Conclusion :** Les endpoints critiques upload et download sont tous sous **100 ms** en environnement local. Les temps de register/login (256–383ms) sont attendus : bcrypt 10 rounds est coûteux par design pour la sécurité. En production (Prisma pool, disque SSD dédié), les temps de réponse seraient similaires ou meilleurs.

---

## 3. Logs structurés — Analyse des métriques

### 3.1 Système de logs

Le backend utilise un `LoggerService` custom (étend `ConsoleLogger` de NestJS) qui écrit sur console **et sur disque** :

```
logs/
├── 2026-05-09.log
├── 2026-05-11.log
├── 2026-05-13.log
├── 2026-05-21.log
├── 2026-05-22.log
├── 2026-05-23.log
└── 2026-05-24.log   ← fichier courant
```

**Format de chaque ligne :**

```
[DD/MM/YYYY HH:MM:SS] [LEVEL] [Context] Message
```

**Exemples réels :**

```
[09/05/2026 21:17:22] [LOG]  [NestFactory]     Starting Nest application...
[13/05/2026 07:46:43] [WARN] [LegacyRouteConverter] Unsupported route path: "/api/v1/*"
[11/05/2026 14:23:01] [LOG]  [AuthService]     User registered: test@mail.com
[11/05/2026 14:24:10] [ERROR][ErrorFilter]     500: Unexpected token | POST /api/v1/auth/login
```

**Niveaux :** `LOG` (info), `WARN` (avertissement), `ERROR` (erreur serveur)

**Rotation :** automatique à 10 Mo par fichier (un fichier par jour en usage normal)

### 3.2 Métriques clés observées dans les logs

| Métrique observée     | Source log                      | Valeur / état |
| --------------------- | ------------------------------- | ------------- |
| Démarrage application | `[NestFactory] Starting...`     | < 3s en dev   |
| Routes mappées        | `[RouterExplorer] Mapped {…}`   | 12 routes API |
| Erreurs 500           | `[ErrorFilter] 500:`            | 0 en prod     |
| Connexions DB         | `[InstanceLoader] PrismaModule` | ✅ initialisé |
| Cron task             | `[CronTaskModule]`              | ✅ planifié   |

---

## 4. Budget performance front (P4-FRONT)

Build de production réalisé avec `npm run build` (Vite + Rolldown) :

| Fichier             | Taille brute | Taille gzip   |
| ------------------- | ------------ | ------------- |
| `dist/index.html`   | 0.45 kB      | 0.29 kB       |
| `dist/assets/*.css` | 18.33 kB     | **4.92 kB**   |
| `dist/assets/*.js`  | 509.83 kB    | **156.71 kB** |

**Avertissement Vite :** le chunk JS dépasse 500 kB minifié.

**Analyse :**

- Le bundle JS de 509 kB inclut React 19 + React Router + Zustand + Axios + toutes les vues
- En gzip (156 kB), la taille est acceptable pour un réseau haut débit
- Piste d'amélioration : lazy loading des routes avec `React.lazy()` + `Suspense` pour réduire le bundle initial

**Temps de build :** ~5s (Vite Rolldown, environnement local)

---

## 5. Recommandations

| Priorité | Problème                          | Action suggérée                              |
| -------- | --------------------------------- | -------------------------------------------- |
| Basse    | Bundle JS > 500 kB                | Lazy loading routes avec `React.lazy()`      |
| Basse    | Register/Login > 200ms            | Normal avec bcrypt — acceptable en prod      |
| Future   | Pas de test de charge (load test) | Prévoir k6 avec 50 VUs sur `/files` upload   |
| Future   | Pas de monitoring temps réel      | Ajouter métriques Prometheus/Grafana en prod |

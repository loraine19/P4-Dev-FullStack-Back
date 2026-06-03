# SECURITY.md

## 1. Authentification et gestion des accès
### 1. Guard manuel - sans Passport
#### 1. `JwtAuthGuard` implémente `CanActivate`

directement, pas de Passport, pas de Strategy.

#### 2. extractToken(req) :
1. cookie[ACCESS_COOKIE_NAME] - priorité web
2. Authorization: Bearer <token> - fallback mobile

#### 3. `OptionalJwtAuthGuard` étend `JwtAuthGuard`

absorbe les erreurs - routes publiques avec contexte utilisateur optionnel.

### 2. Payload JWT
#### 1. `{sub: userId }`

userId uniquement - pas d'email (minimisation des données)

#### 2. Signé avec `JWT_SECRET` (env).

#### 3. Durée depuis `JWT_EXPIRES_IN`.

### 3. Cookie httpOnly

| Attribut   | Valeur                                                             |
| :--------- | :----------------------------------------------------------------- |
| `httpOnly` | `true` - inaccessible en JS (protection XSS)                      |
| `secure`   | `true` si `NODE_ENV=production`                                    |
| `sameSite` | `strict` en production - `lax` en développement (protection CSRF) |
| `maxAge`   | `COOKIE_MAX_AGE` (env, en ms)                                      |

Pas de cookie en mode mobile - `access_token` retourné dans le body uniquement si `isMobile: true`.

## 2. Hachage des mots de passe
### 1. bcrypt (`bcrypt ^6.0.0`)
#### 1. salt factor 10 par défaut.

#### 2. User.passwordHash

jamais exposé dans les réponses API

#### 3. File.downloadPasswordHash

jamais exposé, comparé avec `bcrypt.compare()` au téléchargement

#### 4. Les champs `passwordHash`

sont exclus de toutes les projections Prisma

## 3. Validation des données
### 1. ValidationPipe
#### 1. global
1. `whitelist: true`  
supprime les propriétés non déclarées dans le DTO

2. forbidNonWhitelisted: true  
rejette les requêtes avec des champs inconnus (400)

### 2. class-validator` sur tous les DTOs :

| DTO             | Règles                                                                                                      |
| :-------------- | :---------------------------------------------------------------------------------------------------------- |
| RegisterDto     | `@IsEmail()`, `@IsString()`, `@MinLength(8)`                                                                |
| LoginDto        | `@IsEmail()`, `@IsString()`                                                                                 |
| `UploadFileDto` | `@IsOptional()` + `@IsInt()` + `@Min(1)` sur `expirationDays`, `@IsOptional()` + `@IsArray()` sur `tags` |
| `CreateTagDto`  | `@IsString()` + `@MinLength(1)`                                                                            |
| `DownloadDto`   | `@IsOptional()` + `@IsString()` sur `password`                                                             |


## 4. Upload de fichiers
### 1. Multer (`multer ^2.1.1`) avec `diskStorage` :
#### 1. UUID

Le fichier est renommé en `UUID v4 + extension` côté serveur - le nom d'origine (`originalName`) est stocké séparément en base, jamais utilisé comme chemin disque

#### 2. Static

Le répertoire `uploads/` n'est **jamais servi statiquement** - accès uniquement via `DownloadController` après vérification du `shareToken`

#### 3. Taille maximale :

1 Go (`limits.fileSize` dans `multerOptions`)

#### 4. Extensions interdites :

`fileFilter` dans `multerOptions` - valide l’extension **avant** toute écriture sur disque → `cb(new BadRequestException(...), false)` si extension interdite

#### 5. MulterExceptionFilter

(`@Catch(MulterError)`) : capture `LIMIT_FILE_SIZE` → 400 `FILE_TOO_LARGE` au lieu de laisser filer un 500

#### 6. shareToken` :

`crypto.randomBytes` → UUID v4 - non prédictible, non séquentiel.

---


## 5. Gestion des erreurs
### 1. Filtres globaux - aucun stack trace exposé aux clients :

| Filtre                      | Rôle                                                                           |
| :-------------------------- | :----------------------------------------------------------------------------- |
| **PrismaExceptionFilter**   | Traduit les codes Prisma (`P2002` unique, `P2025` not found…) en HTTP lisibles |
| **`MulterExceptionFilter`** | `@Catch(MulterError)` - `LIMIT_FILE_SIZE` → 400, extension invalide → 400     |
| **`HttpExceptionFilter`**   | Formate les exceptions NestJS en `{ status: 'error', message, data: null }`    |
| **`ErrorFilter`**           | Capture les erreurs non gérées - log interne, `500` générique au client       |

Les messages d'erreur métier sont définis dans les controllers - les services retournent des données brutes sans message exposable.

---

## 6. CORS

`app.enableCors({`  
`origin: process.env.FRONTEND_URL,` // domaine front explicite - pas de wildcard \*  
`credentials: true,` // nécessaire pour les cookies httpOnly  
`exposedHeaders: ['Content-Disposition'],` // exposé au JS front pour lire le filename au download  
`});`

`origin: '*'` avec `credentials: true` est interdit par la spec CORS (navigateur refuse). `exposedHeaders` est nécessaire car les headers custom sont bloqués par défaut même avec CORS actif.

## 7. Variables d'environnement sensibles

| Variable             | Usage                | Ne jamais committer |
| :------------------- | :------------------- | :------------------ |
| `JWT_SECRET`         | Signature JWT        | ✅                  |
| `DATABASE_URL`       | Connexion PostgreSQL | ✅                  |
| `POSTGRES_PASSWORD`  | Auth Docker          | ✅                  |
| `ACCESS_COOKIE_NAME` | Nom du cookie auth   | ✅                  |

`.env` est dans `.gitignore`. Un `.env.example` avec des valeurs neutres est versionné.

## 8. Scan de dépendances

`npm audit          # rapport des vulnérabilités connues`  
`npm audit fix      # correction automatique des non-breaking`

Dépendances de sécurité en production :

| Package           | Version | Rôle                         |
| :---------------- | :------ | :--------------------------- |
| `bcrypt`          | ^6.0.0  | Hachage mots de passe        |
| `@nestjs/jwt`     | ^11.0.2 | Signature/vérification JWT   |
| `cookie-parser`   | ^1.4.7  | Lecture des cookies httpOnly |
| `class-validator` | ^0.15.1 | Validation DTO               |

19 vulnérabilités dans `devDependencies` uniquement (`newman-reporter-htmlextra`) - **0 en production**.  
À re-exécuter avant chaque mise en production.


## 9. Décisions de sécurité notables

| Décision                                       | Justification                                                                     |
| :--------------------------------------------- | :-------------------------------------------------------------------------------- |
| Pas de Passport                                | Guard manuel - surface d'attaque réduite, pas de dépendance supplémentaire       |
| Cookie `sameSite: strict` (prod) / `lax` (dev) | Protection CSRF sans token dédié                                                  |
| JWT payload minimal (`sub` only)               | Minimisation des données - l'email n'est pas nécessaire dans le token            |
| Fichiers renommés UUID                         | Empêche l'énumération et l'accès direct par nom original                          |
| `uploads/` non servi statiquement              | Accès uniquement via contrôleur authentifié ou token valide                       |
| `forbidNonWhitelisted: true`                   | Rejet strict des payloads inattendus - prévention injection via champs parasites |

# P4 - DataShare API (Backend)

## Présentation

DataShare est une API REST permettant le partage sécurisé de fichiers entre utilisateurs.

Un utilisateur peut :

- **Créer un compte** et se connecter (JWT)
- **Uploader un fichier** avec une durée d'expiration, un mot de passe optionnel et des tags
- **Obtenir un lien de partage** unique (`shareToken`) à transmettre au destinataire
- **Consulter et supprimer** ses fichiers depuis son espace personnel
- **Organiser ses fichiers** avec des tags personnalisés

Le destinataire peut :

- **Accéder aux métadonnées** du fichier via le `shareToken` (sans compte)
- **Télécharger le fichier** (avec saisie du mot de passe si protégé)

Les fichiers expirés sont **automatiquement supprimés** (disque + base) par une tâche planifiée toutes les heures.

## Stack technique

| Technologie       | Version | Rôle                                     |
| ----------------- | ------- | ---------------------------------------- |
| NestJS            | ^10     | Framework Node.js                        |
| TypeScript        | strict  | Typage statique                          |
| Prisma            | ^6      | ORM + migrations                         |
| PostgreSQL        | 16      | Base de données                          |
| Docker            | -       | Conteneur PostgreSQL                     |
| JWT (@nestjs/jwt) | -       | Authentification hybride cookie + Bearer |
| bcrypt            | -       | Hachage mots de passe                    |
| Multer            | -       | Upload fichiers (diskStorage)            |
| @nestjs/schedule  | -       | Nettoyage fichiers expirés               |

## Architecture

```
src/
├── prisma/
│   └── prisma.service.ts         ← PrismaService (singleton)
├── common/
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── prisma-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── optional-jwt-auth.guard.ts
│   ├── middlewares/
│   │   └── logger.middleware.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   └── interfaces/
│       ├── jwt-payload.interface.ts
│       └── request-with-user.interface.ts
├── auth/                         ← Register / Login → JWT
├── files/                        ← Upload / Liste / Suppression
├── download/                     ← Téléchargement via shareToken (public)
└── tags/                         ← CRUD tags utilisateur
```

Convention :

```
Request → Guard → Controller → Service → PrismaService → PostgreSQL
```

- **Controllers** : routing HTTP, validation DTO, extraction @CurrentUser
- **Services** : logique métier, hachage, génération shareToken
- **Fichiers** : stockés dans `uploads/` (jamais servi statiquement — accès via DownloadController uniquement)

## Prérequis

- Node.js ≥ 18
- Docker + Docker Compose

## Installation

```bash
npm install
cp .env.example .env
# Ajuster les valeurs dans .env si nécessaire
```

## Variables d'environnement (`.env`)

```env
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000/api/v1

POSTGRES_USER=datashare
POSTGRES_PASSWORD=datashare
POSTGRES_DB=datashare
POSTGRES_PORT=5432
DATABASE_URL="postgresql://datashare:datashare@localhost:5432/datashare"

JWT_SECRET="change_me_in_production"
JWT_EXPIRES_IN="7d"
FRONTEND_URL=http://localhost:5173
ACCESS_COOKIE_NAME=access_token
COOKIE_MAX_AGE=604800000
```

## Lancement

```bash
# 1. Démarrer PostgreSQL
docker compose up -d

# 2. Appliquer les migrations Prisma
npx prisma migrate dev

# 3. Démarrer le serveur
npm run start:dev   # -> http://localhost:3000
```

## Base de données

4 tables créées par `prisma migrate dev --name init` :

| Table     | Description                                       |
| --------- | ------------------------------------------------- |
| `User`    | Utilisateurs (email unique, passwordHash)         |
| `File`    | Fichiers uploadés (shareToken unique, expiration) |
| `Tag`     | Tags utilisateur (unique par user+name)           |
| `FileTag` | Relation File↔Tag (clé composite)                 |

## Scripts utiles

```bash
npm run start:dev       # Dev avec hot reload
npm run build           # Build production
npx prisma studio       # Interface visuelle BDD
docker compose down     # Arrêter PostgreSQL
```

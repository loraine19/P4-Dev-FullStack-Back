# NEWMAN CLI - P4 BACK (NESTJS)

## Pourquoi ca bloquait

- Le port 3000 sert l'API NestJS.
- Le rapport HTML statique n'est pas servi automatiquement par NestJS.
- Ouvrir un fichier HTML en direct (file://) peut bloquer fetch.

## Commande simple (rapport HTML autonome)

Depuis DEPOTS/P4-BACK:

```bash
npm run newman:auth:report
```

Cette commande:

- execute la collection postman/auth.postman_collection.json
- charge l'environnement postman/local.postman_environment.json
- genere un rapport HTML autonome

## Emplacement du rapport

- postman/newman-report.html

Tu peux l'ouvrir directement dans le navigateur (double clic), sans serveur HTTP.

## Commande Newman equivalente

```bash
newman run postman/auth.postman_collection.json \
  -e postman/local.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export postman/newman-report.html
```

## Commande JSON (si besoin)

```bash
newman run postman/auth.postman_collection.json \
  -e postman/local.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export ./test-results.json
```

## Note sur les echecs Register - success (409)

Si le test Register - success tombe en 409, c'est souvent parce que l'email existe deja.
La collection actuelle genere maintenant un email unique avant ce test.

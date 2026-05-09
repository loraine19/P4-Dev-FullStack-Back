# **CHANGELOG**

## **Branche feat/auth — Auth hybride (cookie httpOnly + Bearer)**

**Objectif** :
Ajouter l'authentification complète sans Passport — guard manuel hybride acceptant cookie httpOnly (web) ou Bearer header (mobile).

| Thème                      | Ce qui a été livré                                            | Commits |
| :------------------------- | :------------------------------------------------------------ | :------ |
| Auth register/login/logout | Endpoints complets, bcrypt, cookie hybride                    | 3e53979 |
| Guard hybride              | Cookie httpOnly OU Bearer header, un seul guard               | 3e53979 |
| Configuration              | cookieParser, CORS credentials, ValidationPipe, prefix api/v1 | 3e53979 |
| DTOs validés               | class-validator sur LoginDto (+ isMobile) et RegisterDto      | 3e53979 |

---

## **1. Configuration globale**

**Commit** : 3e53979

### **Ce qui a été mis en place**

- `cookie-parser` activé dans `main.ts`
- CORS `credentials: true`, origine `FRONTEND_URL` depuis `.env`
- `ValidationPipe` global (whitelist + forbidNonWhitelisted)
- Prefix global `api/v1`

### **Fichiers modifiés**

- `src/main.ts`
- `.env.example` (ajout `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `ACCESS_COOKIE_NAME`, `COOKIE_MAX_AGE`)

---

## **2. Guard hybride manuel**

**Commit** : 3e53979

### **Ce qui a été mis en place**

- `JwtAuthGuard` : `CanActivate` manuel — `extractToken()` helper privé qui lit cookie OU Bearer
- `OptionalJwtAuthGuard` : extends `JwtAuthGuard`, silencieux si pas de token
- `JwtPayload` simplifié à `{ sub: number; iat?: number; exp?: number }`
- Suppression de `jwt.strategy.ts` (Passport non nécessaire)

### **Fichiers modifiés**

- `src/common/guards/jwt-auth.guard.ts`
- `src/common/guards/optional-jwt-auth.guard.ts`
- `src/common/interfaces/jwt-payload.interface.ts`

### **Fichiers supprimés**

- `src/auth/strategies/jwt.strategy.ts`

---

## **3. AuthService + AuthModule**

**Commit** : 3e53979

### **Ce qui a été mis en place**

- `register()` : hash bcrypt, retourne `{ message }`
- `login()` : vérifie credentials → `isMobile: false` → cookie httpOnly + `{ user }` / `isMobile: true` → `{ user, access_token }`
- `logout()` : efface cookie, retourne `{ message }`
- Helpers privés : `generateToken()`, `setAuthCookie()`, `clearAuthCookie()`
- `JwtModule.registerAsync` (env chargé avant init du module)
- `AuthResponse` : `access_token?` optionnel + `user: UserPublic`

### **Fichiers modifiés**

- `src/auth/auth.service.ts`
- `src/auth/auth.module.ts`
- `src/auth/auth.controller.ts`
- `src/auth/dto/login.dto.ts` (ajout `isMobile?`, class-validator)
- `src/auth/dto/register.dto.ts` (class-validator)
- `src/auth/interfaces/auth-response.interface.ts`
- `src/app.module.ts` (ajout `AuthModule`)

---

## **Récapitulatif final**

| Thème                                                 | Statut |
| :---------------------------------------------------- | :----- |
| Configuration globale (cookies, CORS, ValidationPipe) | ✅     |
| Guard hybride cookie OU Bearer                        | ✅     |
| register / login hybride / logout                     | ✅     |
| DTOs validés class-validator                          | ✅     |

---

## **4. Validation API Newman + rapport HTML autonome**

**Commit** : à renseigner

### **Ce qui a été mis en place**

- Collection Postman Auth ajoutée (`register`, `duplicate`, `login web`, `login mobile`, `logout`)
- Environnement local Postman versionné
- Pré-script sur `Register - success` pour générer un email unique à chaque run (évite les `409` liés aux doublons)
- Script npm `newman:auth:report` pour générer un rapport HTML autonome lisible directement
- Mémo CLI mis à jour avec commandes NestJS/Newman et emplacement du rapport

### **Résultat de validation**

- Newman : **11 assertions / 11 passées**
- Rapport HTML généré : `postman/newman-report.html`

### **Fichiers ajoutés / modifiés**

- `postman/auth.postman_collection.json`
- `postman/local.postman_environment.json`
- `postman/newman-report.html`
- `NEWMAN_CLI.md`
- `package.json` (script `newman:auth:report`)

/* ERROR MESSAGES */
// grouped by domain — use ERROR_MESSAGES.DOMAIN.KEY for full literal-type safety
export const ERROR_MESSAGES = {
  COMMON: {
    INTERNAL_SERVER_ERROR: 'Erreur interne du serveur',
    UNAUTHORIZED: 'Non autorisé',
    FORBIDDEN: 'Interdit',
    NOT_FOUND: 'Non trouvé',
    BAD_REQUEST: 'Mauvaise requête',
    CONFLICT: 'Conflit',
  },
  AUTH: {
    EMAIL_ALREADY_USED: 'Email déjà utilisé',
    INVALID_CREDENTIALS: 'Identifiants incorrects',
  },
} as const;

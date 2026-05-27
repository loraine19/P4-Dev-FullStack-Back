import { ApiResponse } from './api-response';

describe('ApiResponse', () => {

  /* AR.1 success() */
  describe('AR.1 success()', () => {
    it('AR.1.1 returns success envelope with data', () => {
      /* Arrange & Act */
      const result = ApiResponse.success('Opération réussie', { id: 1 });

      /* Assert */
      expect(result).toEqual({ status: 'success', message: 'Opération réussie', data: { id: 1 } });
    });

    it('AR.1.2 defaults data to null when not provided', () => {
      /* Arrange & Act */
      const result = ApiResponse.success('ok');

      /* Assert */
      expect(result).toEqual({ status: 'success', message: 'ok', data: null });
    });
  });

  /* AR.2 error() */
  describe('AR.2 error()', () => {
    it('AR.2.1 returns error envelope with null data by default', () => {
      /* Arrange & Act */
      const result = ApiResponse.error('Erreur serveur');

      /* Assert */
      expect(result).toEqual({ status: 'error', message: 'Erreur serveur', data: null });
    });

    it('AR.2.2 returns error envelope with extra data when provided', () => {
      /* Arrange & Act */
      const result = ApiResponse.error('Erreur', { code: 500 });

      /* Assert */
      expect(result.status).toBe('error');
      expect(result.message).toBe('Erreur');
    });
  });
});

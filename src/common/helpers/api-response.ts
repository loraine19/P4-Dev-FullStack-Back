/* IAPI RESPONSE */
export interface IApiResponse<T = null> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

/* API RESPONSE */
export class ApiResponse {
  /* SUCCESS */
  static success<T = null>(
    message: string,
    data: T | null = null,
  ): IApiResponse<T> {
    return { status: 'success', message, data };
  }

  /* ERROR */
  static error(message: string, data: unknown = null): IApiResponse<null> {
    return { status: 'error', message, data: data as null };
  }
}

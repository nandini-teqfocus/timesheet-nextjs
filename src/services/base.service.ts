import { ServiceResponse } from '@/types/common.types';

/**
 * Base HTTP service layer class for executing API requests.
 */
export abstract class BaseService {
  protected static baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/salesforce';

  protected static async fetchJson<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ServiceResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: errorText || `HTTP Error ${response.status}`,
          data: null,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();
      return data as ServiceResponse<T>;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network request failed',
        data: null,
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}

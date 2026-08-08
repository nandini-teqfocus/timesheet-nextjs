import { ServiceResponse } from '@/types/common.types';
import { getSalesforceJwtAccessToken } from './sf-jwt-auth';

const DEFAULT_INSTANCE_URL =
  process.env.SALESFORCE_INSTANCE_URL || 'https://time-sheet.my.salesforce.com';

export interface SalesforceClientOptions extends RequestInit {
  accessToken?: string;
  instanceUrl?: string;
}

/**
 * Reusable server-side Salesforce REST API client.
 * Automatically injects JWT Bearer Token and resolves target Salesforce instance URL.
 */
export async function callSalesforceRestApi<T>(
  endpoint: string,
  options: SalesforceClientOptions = {},
): Promise<ServiceResponse<T>> {
  const { accessToken: explicitToken, instanceUrl: explicitInstanceUrl, ...fetchOptions } = options;

  let activeToken = explicitToken;
  let activeInstanceUrl = explicitInstanceUrl || DEFAULT_INSTANCE_URL;

  // If no token was provided, automatically acquire via Salesforce JWT Bearer OAuth Flow
  if (!activeToken) {
    try {
      const jwtCredentials = await getSalesforceJwtAccessToken();
      activeToken = jwtCredentials.accessToken;
      if (jwtCredentials.instanceUrl) {
        activeInstanceUrl = jwtCredentials.instanceUrl;
      }
    } catch (jwtErr) {
      /* eslint-disable no-console */
      console.error('[Salesforce Client] JWT Bearer Authentication failed:', jwtErr);
      /* eslint-enable no-console */
      return {
        success: false,
        message: jwtErr instanceof Error ? jwtErr.message : 'Salesforce JWT Authentication failed',
        data: null,
        errorCode: 'JWT_AUTH_REQUIRED',
      };
    }
  }

  const baseUrl = activeInstanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  /* eslint-disable no-console */
  console.log(`[Salesforce Client Debug] Fetching URL: ${url}`);
  console.log(
    `[Salesforce Client Debug] Authorization Header: ${
      headers['Authorization']
        ? 'Bearer ' + headers['Authorization'].substring(7, 22) + '...'
        : 'MISSING'
    }`,
  );
  /* eslint-enable no-console */

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      /* eslint-disable no-console */
      console.log(`[Salesforce Client Debug] Salesforce Response Status: ${response.status}`);
      console.log(`[Salesforce Client Debug] Salesforce Response Body: ${errorText}`);
      /* eslint-enable no-console */

      return {
        success: false,
        message: errorText || `Salesforce API HTTP ${response.status}`,
        data: null,
        errorCode: `SALESFORCE_HTTP_${response.status}`,
      };
    }

    const json = await response.json();
    return json as ServiceResponse<T>;
  } catch (error) {
    /* eslint-disable no-console */
    console.error(`[Salesforce Client Debug] Fetch exception:`, error);
    /* eslint-enable no-console */
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to communicate with Salesforce API',
      data: null,
      errorCode: 'SALESFORCE_CLIENT_ERROR',
    };
  }
}

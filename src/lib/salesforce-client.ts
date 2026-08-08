import { ServiceResponse } from '@/types/common.types';

const DEFAULT_INSTANCE_URL =
  process.env.SALESFORCE_INSTANCE_URL || 'https://time-sheet.my.salesforce.com';

export interface SalesforceClientOptions extends RequestInit {
  accessToken?: string;
  instanceUrl?: string;
}

/**
 * Reusable server-side Salesforce REST API client.
 * Automatically injects OAuth Bearer Token and resolves target Salesforce instance URL.
 */
export async function callSalesforceRestApi<T>(
  endpoint: string,
  options: SalesforceClientOptions = {},
): Promise<ServiceResponse<T>> {
  const { accessToken, instanceUrl, ...fetchOptions } = options;

  const baseUrl = (instanceUrl || DEFAULT_INSTANCE_URL).replace(/\/$/, '');
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
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

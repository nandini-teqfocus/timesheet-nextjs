import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  error?: string;
  error_description?: string;
}

export interface CachedToken {
  accessToken: string;
  instanceUrl: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Normalizes a raw private key string from environment variables or server secret files,
 * handling escaped newlines (\n) or raw multi-line PEM strings.
 */
function getNormalizedPrivateKey(): string {
  let rawKey = process.env.SALESFORCE_PRIVATE_KEY || '';

  // Fallback to local server secret files if environment variable is missing/empty
  if (!rawKey.trim()) {
    const secretsKeyPath = path.join(process.cwd(), '.secrets', 'server.key');
    const rootKeyPath = path.join(process.cwd(), 'server.key');

    if (fs.existsSync(secretsKeyPath)) {
      rawKey = fs.readFileSync(secretsKeyPath, 'utf8');
    } else if (fs.existsSync(rootKeyPath)) {
      rawKey = fs.readFileSync(rootKeyPath, 'utf8');
    }
  }

  if (!rawKey.trim()) {
    throw new Error('SALESFORCE_PRIVATE_KEY environment variable is not defined and server.key file was not found.');
  }

  // Handle escaped newline strings in .env files
  let formatted = rawKey.replace(/\\n/g, '\n').trim();

  // If base64 encoded without PEM headers, wrap appropriately
  if (!formatted.includes('-----BEGIN PRIVATE KEY-----') && !formatted.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    formatted = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
  }

  return formatted;
}

/**
 * Generates an RS256 signed JWT assertion for Salesforce OAuth 2.0 JWT Bearer Flow.
 */
export function generateJwtAssertion(): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const username = process.env.SALESFORCE_USERNAME;
  const loginUrl = (process.env.SALESFORCE_LOGIN_URL || process.env.SALESFORCE_INSTANCE_URL || 'https://login.salesforce.com').replace(/\/$/, '');
  const privateKey = getNormalizedPrivateKey();

  if (!clientId) {
    throw new Error('SALESFORCE_CLIENT_ID environment variable is missing.');
  }
  if (!username) {
    throw new Error('SALESFORCE_USERNAME environment variable is missing.');
  }

  const payload = {
    iss: clientId,
    sub: username,
    aud: loginUrl,
    exp: Math.floor(Date.now() / 1000) + 3 * 60, // 3 minutes expiration
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

/**
 * Obtains a valid Salesforce Access Token using JWT Bearer Flow.
 * Caches token in server-side memory until 5 minutes before expiration.
 */
export async function getSalesforceJwtAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  const now = Date.now();

  // Return cached token if valid for at least another 5 minutes
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return {
      accessToken: cachedToken.accessToken,
      instanceUrl: cachedToken.instanceUrl,
    };
  }

  const assertion = generateJwtAssertion();
  const loginUrl = (process.env.SALESFORCE_LOGIN_URL || process.env.SALESFORCE_INSTANCE_URL || 'https://login.salesforce.com').replace(/\/$/, '');
  const tokenEndpoint = `${loginUrl}/services/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: assertion,
  });

  /* eslint-disable no-console */
  console.log(`[Salesforce JWT Auth] Requesting access token from: ${tokenEndpoint}`);
  /* eslint-enable no-console */

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const responseText = await response.text();

  if (!response.ok) {
    /* eslint-disable no-console */
    console.error(`[Salesforce JWT Auth] Error ${response.status}: ${responseText}`);
    /* eslint-enable no-console */
    throw new Error(`Salesforce JWT Bearer Auth Failed (${response.status}): ${responseText}`);
  }

  let data: SalesforceTokenResponse;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Failed to parse Salesforce token response: ${responseText}`);
  }

  if (data.error) {
    throw new Error(`Salesforce OAuth Error (${data.error}): ${data.error_description || 'Unknown error'}`);
  }

  const targetInstanceUrl = data.instance_url || process.env.SALESFORCE_INSTANCE_URL || loginUrl;

  // Cache access token for 1 hour 55 minutes (tokens usually expire in 2 hours)
  cachedToken = {
    accessToken: data.access_token,
    instanceUrl: targetInstanceUrl,
    expiresAt: now + 115 * 60 * 1000,
  };

  /* eslint-disable no-console */
  console.log(`[Salesforce JWT Auth] Access token successfully acquired for org: ${targetInstanceUrl}`);
  /* eslint-enable no-console */

  return {
    accessToken: cachedToken.accessToken,
    instanceUrl: cachedToken.instanceUrl,
  };
}

/**
 * Clears the cached token (useful for forced token rotation/testing).
 */
export function clearCachedJwtToken(): void {
  cachedToken = null;
}

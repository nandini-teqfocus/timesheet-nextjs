import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';

const SALESFORCE_INSTANCE_URL =
  process.env.SALESFORCE_INSTANCE_URL || 'https://time-sheet.my.salesforce.com';

/**
 * Executes an automated token refresh call against Salesforce OAuth 2.0 Token Endpoint
 * when the access token has expired.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `${token.instanceUrl || SALESFORCE_INSTANCE_URL}/services/oauth2/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.SALESFORCE_CLIENT_ID || '',
      client_secret: process.env.SALESFORCE_CLIENT_SECRET || '',
      refresh_token: token.refreshToken || '',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() + (refreshedTokens.expires_in || 7200) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'salesforce',
      name: 'Salesforce',
      type: 'oauth',
      version: '2.0',
      authorization: {
        url: `${SALESFORCE_INSTANCE_URL}/services/oauth2/authorize`,
        params: {
          response_type: 'code',
          scope: 'api refresh_token offline_access web id',
        },
      },
      token: `${SALESFORCE_INSTANCE_URL}/services/oauth2/token`,
      userinfo: `${SALESFORCE_INSTANCE_URL}/services/oauth2/userinfo`,
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      profile(profile, tokens) {
        return {
          id: String(profile.user_id || profile.sub),
          name: String(profile.name || profile.preferred_username || profile.nickname || ''),
          email: String(profile.email || ''),
          image: String(profile.picture || ''),
          instanceUrl: (tokens.instance_url as string) || SALESFORCE_INSTANCE_URL,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        };
      },
    },
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign-in: preserve base token properties (name, email, picture) and attach OAuth credentials
      if (account && user) {
        const sfAccount = account as { access_token?: string; refresh_token?: string; instance_url?: string; expires_at?: number; expires_in?: number };
        const sfUser = user as { accessToken?: string; refreshToken?: string; instanceUrl?: string };

        const accessToken = sfAccount.access_token || sfUser.accessToken;
        const refreshToken = sfAccount.refresh_token || sfUser.refreshToken;
        const instanceUrl = sfAccount.instance_url || sfUser.instanceUrl || SALESFORCE_INSTANCE_URL;
        const expiresAt = sfAccount.expires_at
          ? sfAccount.expires_at * 1000
          : Date.now() + (sfAccount.expires_in ? sfAccount.expires_in * 1000 : 7200 * 1000);

        return {
          ...token,
          name: user.name || token.name,
          email: user.email || token.email,
          picture: user.image || token.picture,
          accessToken,
          refreshToken,
          instanceUrl,
          expiresAt,
          userId: user.id,
        };
      }

      // Return existing token if it has not expired
      if (token.expiresAt && Date.now() < token.expiresAt) {
        return token;
      }

      // Token has expired: automatically refresh via Salesforce token endpoint
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId || '';
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = token.picture || session.user.image;
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.instanceUrl = token.instanceUrl;
      session.error = token.error;

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development_secret_32_characters_long_key',
};

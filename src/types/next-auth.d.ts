import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      isManager?: boolean;
      isRecruiter?: boolean;
    } & DefaultSession['user'];
    error?: string;
  }

  interface User extends DefaultUser {
    id: string;
    instanceUrl?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    expiresAt?: number;
    userId?: string;
    isManager?: boolean;
    isRecruiter?: boolean;
    error?: string;
  }
}

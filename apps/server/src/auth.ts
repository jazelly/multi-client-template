import { oauthProvider } from '@better-auth/oauth-provider';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import { db } from './db';
import * as schema from './schema';

export const AUTH_URL = process.env.BETTER_AUTH_URL!;
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS ?? '').split(',').filter(Boolean);

/** The phone app (native and Expo web): a public OAuth client (PKCE, no secret) that skips the consent screen.
 *  Registered by seed.ts. */
export const MOBILE_CLIENT = {
  clientId: 'mobile',
  redirectUris: ['multiclient://auth/callback', 'exp://localhost:8081/--/auth/callback', 'http://localhost:8081/auth/callback'],
};

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  // The jwt plugin signs OAuth access tokens; its own /token endpoint is off because OAuth issues the tokens.
  disabledPaths: ['/token'],
  // Sign-ins are created by seed.ts (or your own admin screen), never self-registered.
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: CLIENT_ORIGINS,
  plugins: [
    jwt({ disableSettingJwtHeader: true, jwt: { issuer: AUTH_URL } }),
    // Web and desktop use the session cookie. The phone app opens /sign-in in the browser and gets tokens back
    // through OAuth with PKCE.
    oauthProvider({
      loginPage: '/sign-in',
      consentPage: '/sign-in',
      validAudiences: [AUTH_URL],
      // index.ts serves the discovery document under /api/auth, where the OAuth spec puts it for this issuer.
      silenceWarnings: { oauthAuthServerConfig: true, openidConfig: true },
    }),
  ],
});

/** Create a sign-in for an email and password; sign-up is closed, so this goes through the internal adapter. */
export async function createLogin(email: string, name: string, password: string) {
  const ctx = await auth.$context;
  const u = await ctx.internalAdapter.createUser({ email: email.toLowerCase(), name, emailVerified: true });
  await ctx.internalAdapter.linkAccount({ userId: u.id, providerId: 'credential', accountId: u.id, password: await ctx.password.hash(password) });
  return u.id;
}

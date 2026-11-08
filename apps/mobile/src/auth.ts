import { AuthRequest, type DiscoveryDocument, ResponseType, TokenResponse, exchangeCodeAsync, makeRedirectUri, refreshAsync, revokeAsync } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Sign-in happens on the server's hosted page (OAuth authorization code with PKCE). The app keeps only the tokens:
// in the device keychain, or in local storage when it runs as a website (Expo web).
const WEB = Platform.OS === 'web';
/** The server: its API, and the OAuth issuer whose tokens it accepts. On a real phone, set EXPO_PUBLIC_API_URL to an
 *  address the phone can reach (localhost is the phone itself). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100';
const CLIENT_ID = 'mobile';
const SCOPES = ['openid', 'profile', 'email', 'offline_access'];

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${API_URL}/api/auth/oauth2/authorize`,
  tokenEndpoint: `${API_URL}/api/auth/oauth2/token`,
  revocationEndpoint: `${API_URL}/api/auth/oauth2/revoke`,
};
// Must be one of MOBILE_CLIENT.redirectUris in apps/server/src/auth.ts.
const redirectUri = WEB ? `${location.origin}/auth/callback` : makeRedirectUri({ scheme: 'multiclient', path: 'auth/callback' });

const KEY = 'multiclient.tokens';
const saved = WEB
  ? { get: async () => localStorage.getItem(KEY), set: async (v: string) => localStorage.setItem(KEY, v), clear: async () => localStorage.removeItem(KEY) }
  : { get: () => SecureStore.getItemAsync(KEY), set: (v: string) => SecureStore.setItemAsync(KEY, v), clear: () => SecureStore.deleteItemAsync(KEY) };

let tokens: TokenResponse | null = null;

export async function loadTokens() {
  const t = await saved.get();
  tokens = t ? new TokenResponse(JSON.parse(t)) : null;
  return !!tokens;
}

async function save(t: TokenResponse | null) {
  tokens = t;
  if (t) await saved.set(JSON.stringify(t.getRequestConfig()));
  else await saved.clear();
}

/** Opens the hosted sign-in page in the browser; resolves true once the person is back with tokens, false when they
 *  closed the page. */
export async function signIn() {
  // Tokens are issued for the server's API; the resource sets their audience.
  const request = new AuthRequest({ clientId: CLIENT_ID, redirectUri, responseType: ResponseType.Code, scopes: SCOPES, usePKCE: true, extraParams: { resource: API_URL } });
  const result = await request.promptAsync(discovery);
  if (result.type === 'error') throw new Error(result.params.error_description ?? result.error?.message ?? 'Sign-in failed');
  if (result.type !== 'success') return false;
  await save(await exchangeCodeAsync({ clientId: CLIENT_ID, code: result.params.code, redirectUri, extraParams: { code_verifier: request.codeVerifier!, resource: API_URL } }, discovery));
  return true;
}

/** A current access token, refreshed when it is about to expire; null when signed out. */
async function accessToken(): Promise<string | null> {
  if (!tokens) return null;
  if (!tokens.shouldRefresh()) return tokens.accessToken;
  if (!tokens.refreshToken) return null;
  try {
    await save(await refreshAsync({ clientId: CLIENT_ID, refreshToken: tokens.refreshToken, extraParams: { resource: API_URL } }, discovery));
    return tokens!.accessToken;
  } catch {
    await save(null);
    return null;
  }
}

export async function signOut() {
  const refreshToken = tokens?.refreshToken;
  await save(null);
  if (refreshToken) await revokeAsync({ clientId: CLIENT_ID, token: refreshToken }, discovery).catch(() => {});
}

export class SignedOut extends Error {}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await accessToken();
  if (!token) throw new SignedOut();
  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? (init?.body ? 'POST' : 'GET'),
    headers: { authorization: `Bearer ${token}`, ...(init?.body ? { 'content-type': 'application/json' } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) {
    await save(null);
    throw new SignedOut();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

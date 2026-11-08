// Web and desktop talk to the server from its own origin (or the Vite proxy), so the session cookie goes along.

export class SignedOut extends Error {}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? 'POST' : 'GET'),
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) throw new SignedOut();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`);
  return data as T;
}

export const signIn = (email: string, password: string) => api('/api/auth/sign-in/email', { body: { email, password } });
export const signOut = () => api('/api/auth/sign-out', { body: {} });

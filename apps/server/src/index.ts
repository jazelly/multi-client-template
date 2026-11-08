import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { type Permission, type Me, type Note, can } from '@app/shared';
import { verifyJwsAccessToken } from '@better-auth/core/oauth2';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { AUTH_URL, CLIENT_ORIGINS, auth } from './auth';
import { db } from './db';
import { signInPage } from './pages';
import { members, notes, orgs, roles, user } from './schema';

type Member = Me & { orgId: string };
const app = new Hono<{ Variables: { member: Member } }>();

// Expo web runs on its own origin and calls the API (and the OAuth token endpoint) with a bearer token.
app.use('/api/*', cors({ origin: CLIENT_ORIGINS, allowHeaders: ['authorization', 'content-type'], credentials: true }));

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.get('/sign-in', (c) => c.html(signInPage()));
const authServerMetadata = oauthProviderAuthServerMetadata(auth);
app.get('/.well-known/oauth-authorization-server/api/auth', (c) => authServerMetadata(c.req.raw));

/** The user behind an OAuth access token from the phone app, or null when the request has none. */
async function bearerUser(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const payload = await verifyJwsAccessToken(token, {
    jwksFetch: async () => (await auth.api.getJwks()) as never,
    jwksCacheKey: auth,
    verifyOptions: { issuer: AUTH_URL, audience: AUTH_URL },
  }).catch(() => null);
  return payload?.sub ?? null;
}

// Web and desktop send the session cookie; the phone app sends an OAuth access token. Either way the request gets
// the person's org and role, which every handler below checks against.
app.use('/api/*', async (c, next) => {
  const userId = (await bearerUser(c.req.raw)) ?? (await auth.api.getSession({ headers: c.req.raw.headers }))?.user.id;
  if (!userId) return c.json({ error: 'Signed out' }, 401);
  const [row] = await db
    .select({ user, org: orgs, role: roles })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .innerJoin(orgs, eq(orgs.id, members.orgId))
    .innerJoin(roles, and(eq(roles.orgId, members.orgId), eq(roles.key, members.roleKey)))
    .where(eq(members.userId, userId));
  if (!row) return c.json({ error: 'This sign-in is not a member of any org' }, 403);
  const { id, name, email } = row.user;
  c.set('member', { user: { id, name, email }, org: row.org, role: { key: row.role.key, name: row.role.name, permissions: row.role.permissions }, orgId: row.org.id });
  await next();
});

const requirePermission = (m: Member, p: Permission) => {
  if (!can(m.role, p)) throw new HTTPException(403, { message: `Your role (${m.role.name}) cannot do this` });
};

app.get('/api/me', (c) => {
  const { orgId, ...me } = c.get('member');
  return c.json<Me>(me);
});

app.get('/api/notes', async (c) => {
  const rows = await db
    .select({ id: notes.id, text: notes.text, authorName: user.name, createdAt: notes.createdAt })
    .from(notes)
    .innerJoin(user, eq(user.id, notes.authorId))
    .where(eq(notes.orgId, c.get('member').orgId))
    .orderBy(desc(notes.createdAt));
  return c.json<Note[]>(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

app.post('/api/notes', async (c) => {
  const m = c.get('member');
  requirePermission(m, 'notes.write');
  const { text } = await c.req.json<{ text: string }>();
  if (!text?.trim()) throw new HTTPException(400, { message: 'Text is required' });
  await db.insert(notes).values({ id: randomUUID(), orgId: m.orgId, authorId: m.user.id, text: text.trim() });
  return c.json({ ok: true });
});

app.delete('/api/notes/:id', async (c) => {
  const m = c.get('member');
  requirePermission(m, 'notes.write');
  await db.delete(notes).where(and(eq(notes.id, c.req.param('id')), eq(notes.orgId, m.orgId)));
  return c.json({ ok: true });
});

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Server error' }, 500);
});

// The built web app (pnpm build) is served from the same origin, so the session cookie just works. In development
// the Vite dev server serves it instead and proxies /api here.
const webDist = path.relative(process.cwd(), path.resolve(import.meta.dirname, '../../web/dist'));
app.use('/*', serveStatic({ root: webDist }));
app.get('/*', serveStatic({ root: webDist, path: 'index.html' }));

const port = Number(process.env.PORT ?? 3100);
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => console.log(`Server on http://localhost:${port}`));

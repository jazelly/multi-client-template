// Seed a demo org, its default roles, one test sign-in per role and the phone app's OAuth client.
// Safe to run again: whatever already exists is kept.
import { DEFAULT_ROLES } from '@app/shared';
import { eq } from 'drizzle-orm';
import { MOBILE_CLIENT, createLogin } from './auth';
import { db, sql } from './db';
import { members, oauthClient, orgs, roles, user } from './schema';

const password = process.env.TEST_ACCOUNT_PASSWORD;
if (!password) throw new Error('Set TEST_ACCOUNT_PASSWORD in apps/server/.env');

const ORG_ID = 'demo';
await db.insert(orgs).values({ id: ORG_ID, name: 'Demo Org' }).onConflictDoNothing();
await db
  .insert(roles)
  .values(DEFAULT_ROLES.map((r) => ({ orgId: ORG_ID, ...r })))
  .onConflictDoNothing();

for (const r of DEFAULT_ROLES) {
  const email = `${r.key}@test.com`;
  const [existing] = await db.select().from(user).where(eq(user.email, email));
  if (existing) {
    console.log(`kept ${email}`);
    continue;
  }
  const userId = await createLogin(email, `Test ${r.name}`, password);
  await db.insert(members).values({ userId, orgId: ORG_ID, roleKey: r.key });
  console.log(`created ${email} (${r.name})`);
}

const now = new Date();
await db
  .insert(oauthClient)
  .values({
    id: MOBILE_CLIENT.clientId,
    clientId: MOBILE_CLIENT.clientId,
    name: 'Mobile',
    redirectUris: MOBILE_CLIENT.redirectUris,
    tokenEndpointAuthMethod: 'none',
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    public: true,
    type: 'native',
    requirePKCE: true,
    skipConsent: true,
    createdAt: now,
    updatedAt: now,
  })
  .onConflictDoUpdate({ target: oauthClient.clientId, set: { redirectUris: MOBILE_CLIENT.redirectUris, updatedAt: now } });
console.log(`registered OAuth client ${MOBILE_CLIENT.clientId}`);
await sql.end();

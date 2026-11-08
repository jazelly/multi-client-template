# Working in this repository

One product, four clients of one server, in a pnpm monorepo:

| Path | What | Stack |
| --- | --- | --- |
| `apps/server` | API, sign-in, roles, data | Hono, better-auth, drizzle, Postgres |
| `apps/web` | Browser app; also the UI of the desktop app | Vite, React 19, Tailwind v4, `@agentic-react/vite` |
| `apps/desktop` | Window onto the web app on macOS and Windows | Electron |
| `apps/mobile` | Phone app (iOS, Android, Expo web) | Expo, React Native |
| `packages/shared` | Types and access rules every app imports | TypeScript source, no build step |
| `iac.json` | Deployment intent (projects, env, database) | `@vertile-ai/iac` |

## Commands

Run from the repository root.

```bash
pnpm dev          # set up what is missing, then server on 3100 and web on 5173
pnpm desktop      # Electron window onto http://localhost:5173 (APP_URL to change)
pnpm mobile       # Expo; press w for web, i for the iOS simulator
pnpm typecheck
pnpm build        # design check, typecheck and build of apps/web
pnpm iac:validate # check iac.json and its environment routing, offline
pnpm iac:render   # render Terraform from iac.json into .vertile/
```

Schema changes: edit `apps/server/src/schema.ts`, run `pnpm db:generate` in `apps/server`, review and commit the new
file in `apps/server/drizzle/`. `pnpm dev` applies pending migrations.

Test sign-ins come from `apps/server/src/seed.ts`: `owner@test.com`, `editor@test.com` and `viewer@test.com`, with the
password `TEST_ACCOUNT_PASSWORD` in `apps/server/.env`.

## How sign-in works

- Web and desktop post the email and password to `/api/auth/sign-in/email` and get a session cookie. In development
  the Vite dev server proxies `/api` to the server, so the cookie stays on one origin.
- The phone app opens the server's hosted `/sign-in` page with OAuth authorization code + PKCE (`apps/mobile/src/auth.ts`),
  keeps the tokens in the keychain, and sends `Authorization: Bearer`. The OAuth client and its redirect URIs are
  `MOBILE_CLIENT` in `apps/server/src/auth.ts`, registered by the seed.
- The server's `/api/*` middleware accepts either, then loads the person's org and role.

## Roles and permissions

- The product fixes the permission list (`PERMISSIONS` in `packages/shared/src/access.ts`). Each org owns its roles
  and which permissions each holds (`roles` table); every sign-in is a member of one org with one role.
- The server decides. Every handler that changes data calls `requirePermission`. Clients call `can()` only to hide
  controls; never rely on hiding.
- A new permission: add it to `PERMISSIONS`, check it in the handler, add it to the `DEFAULT_ROLES` that should have it.

## Adding a feature

Notes are the example resource that touches every layer. A new resource follows the same path: table in `schema.ts`
(with `orgId`), migration, routes in `apps/server/src/index.ts` with a permission check, type in `packages/shared`,
then screens in `apps/web` and `apps/mobile`. Delete notes once you have your own.

## Engineering rules

- Build the smallest end-to-end version that satisfies the current goal: one working path from input to a result the
  user can see. A new mechanism needs a current acceptance criterion, an explicit contract, a reproduced failure, or
  an immediate security, privacy, financial or data-loss risk; say which before adding it.
- Do not prebuild queues, retries, offline sync, plugin systems, broad configuration, compatibility layers or
  microservices.
- One version of each shared dependency, set in the `catalog` of `pnpm-workspace.yaml`. Upgrade React and React
  Native together with the Expo SDK (`npx expo install --check` in `apps/mobile`).
- Never commit real secrets: `.env` files are ignored, `.env.example` holds development-only values.
- `iac.json` (manifest version 2) holds deployment intent and non-secret values only. Secrets for staging and
  production go in `.iac/private.json`, which `pnpm iac:scaffold` creates and git ignores.
- Code, comments, identifiers and UI text are in English.

## Web design tokens

`apps/web/src/theme.css` is the single source of colours, type sizes, radii, shadows and fonts; Tailwind's defaults
are switched off. `pnpm build` runs `apps/web/scripts/check-design.mjs`, which fails on hex colours outside
`theme.css` and on arbitrary colours, font sizes, radii, shadows and fonts. A new value is a design decision: add a
token with a comment saying where it is used. Arbitrary values are for layout geometry only
(`grid-cols-[180px_1fr]`). Use Lucide icons, give every icon-only button an accessible name, and never show status by
colour alone.

Check UI changes in a real browser before calling them done.

# multi-client-template

A starting point for products with one server and several clients: web, desktop (Electron) and mobile (Expo), in a
pnpm monorepo, with email and password sign-in, org-scoped roles and permissions, and deployment intent in `iac.json`.

The example feature is a shared list of notes: every client signs in to the same server and sees the same data, and
what each person can change depends on their role.

## Start

Needs Node 24, pnpm 10 and Docker Desktop.

```bash
pnpm dev
```

Then open http://localhost:5173 and sign in as `owner@test.com`, `editor@test.com` or `viewer@test.com`
(password `test-password-123`, from `apps/server/.env.example`).

```bash
pnpm desktop   # desktop window onto the web app
pnpm mobile    # Expo: w for web, i for the iOS simulator
```

## What is inside

- `apps/server` — Hono, better-auth (email and password, plus an OAuth provider with PKCE for the phone app),
  drizzle and Postgres.
- `apps/web` — Vite, React 19, Tailwind v4 with design tokens and a build-time token check, and the
  `@agentic-react/vite` dev toolbox.
- `apps/desktop` — Electron window onto the web app.
- `apps/mobile` — Expo app that signs in through the server's hosted page and calls the API with bearer tokens.
- `packages/shared` — types and the permission rules shared by the server and every client.
- `iac.json` — projects, environments and database for `@vertile-ai/iac` (manifest version 2;
  `pnpm iac:validate`, `pnpm iac:render`).

[AGENTS.md](AGENTS.md) explains how sign-in and permissions work, how to add a feature, and the rules for working in
the repository.

## Use it

On GitHub choose **Use this template**, or:

```bash
gh repo create my-app --template jazelly/multi-client-template --private --clone
```

Then rename `multi-client-template`, the app scheme `multiclient` (`apps/mobile/app.json`, `MOBILE_CLIENT` in
`apps/server/src/auth.ts`), set `repository` and the Vercel team in `iac.json`, and run `pnpm iac:scaffold` to create
the git-ignored `.iac/private.json` for deployment secrets.

## Not included

Production deployment of the server, desktop packaging and auto-update, mobile store builds, email, payments,
audit logs, and screens for managing members and roles. Add them when a product needs them.

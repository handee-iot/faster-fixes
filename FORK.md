# Handee fork of Faster Fixes

Self-hosted instance for Handee, deployed on Railway. Upstream:
<https://github.com/manucoffin/faster-fixes> (AGPL-3.0 app, MIT widget/MCP).

Fork: <https://github.com/handee-iot/faster-fixes>

## Branches

- `main` mirrors upstream and is never committed to directly.
- `handee` is our line: self-hosting patches, deploy artifacts, and (later)
  Handee-specific features. Railway deploys from this branch.

## Divergences from upstream

Self-hosting patches:

1. `packages/database/index.ts` — use the Neon driver only when `DATABASE_URL`
   points at Neon; plain Postgres (Railway) uses the standard `pg` adapter in
   production too.
2. `apps/web/src/server/auth/plugins/stripe.ts` + `apps/web/src/server/auth/index.ts`
   — Stripe is cloud-only: the plugin is registered only when
   `NEXT_PUBLIC_IS_CLOUD=true`, and the production env check is gated on the
   same flag. Self-hosted instances no longer need Stripe env vars.
3. `apps/web/src/app/_domains/integration/_services/github/github-app.ts` —
   `GITHUB_PRIVATE_KEY` is read lazily instead of at module load, so builds
   without the GitHub App integration succeed.
4. `apps/web/src/lib/mailer/constants.ts` — `EMAIL_FROM` overrides the
   domain-derived sender address.

Deploy artifacts:

- `Dockerfile` — multi-stage build (pnpm install, `build:packages`, prisma
  generate, `next build`; runtime runs `next start`).
- `railway.json` — Dockerfile builder, pre-deploy `prisma migrate deploy`,
  start command, healthcheck at `/login`.
- `.dockerignore`.

Notes for upstream PRs (see upstream issue #246): patches 1–4, plus the
self-hosting docs correction (`migrate:prod` runs `prisma migrate deploy`, not
`migrate:dev`).

## Sync policy

Quarterly, or when upstream lands something we need:

```sh
git fetch upstream
git checkout handee
git merge upstream/main
pnpm install --frozen-lockfile
pnpm build:packages
pnpm --filter @workspace/db db:gen
pnpm --filter web build
```

Resolve conflicts in favour of keeping our diff minimal; prefer moving generic
fixes upstream so they disappear from this list.

## Deploy (Railway, Handee workspace)

- Project: `faster-fixes` (Handee workspace), service from this repo.
- First deploys use `railway up` from this directory; connect the GitHub repo
  later if auto-deploys are wanted.
- Service variables: `DATABASE_URL` (`${{Postgres.DATABASE_URL}}`),
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DOMAIN_NAME`, `BASE_URL`,
  `NEXT_PUBLIC_FF_API_ORIGIN`, `NEXT_PUBLIC_STORAGE_BASE_URL`,
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `STORAGE_REGION`, `STORAGE_BUCKET_NAME`, `RESEND_API_KEY`, `EMAIL_FROM`,
  `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `PORT=3000`.
- `NEXT_PUBLIC_*` values are baked at build time: after changing them, redeploy.
- Migrations run automatically via the Railway pre-deploy command.

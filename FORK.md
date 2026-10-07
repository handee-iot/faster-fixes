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

Adopted from `brian-muzza/faster-fixes` (cherry-picked; candidates for upstream
PRs):

2. Deferred optional integration configuration (`4230020e`) — the Stripe plugin
   is built lazily and only when `NEXT_PUBLIC_IS_CLOUD=true`; `GITHUB_PRIVATE_KEY`
   is read on call; the Jira/Linear/Slack token ciphers are created on first use,
   so self-hosted builds need no encryption keys. Supersedes our earlier
   hand-rolled versions of these fixes.
3. Verified mail domain (`378616b7`) — `MAIL_FROM_DOMAIN` decouples the sender
   domain from the app domain. We added `EMAIL_FROM` on top as a full-address
   override (e.g. Resend's onboarding sender before a domain is verified), with
   a test case in `constants.test.ts`.

Deploy artifacts:

- `Dockerfile` — multi-stage build (pnpm install, `build:packages`, prisma
  generate, `next build`; runtime runs `next start`).
- `railway.json` — Dockerfile builder, pre-deploy `prisma migrate deploy`,
  start command, healthcheck at `/login`.
- `.dockerignore`.

Notes for upstream PRs (see upstream issue #246): patch 1, the adopted
brian-muzza fixes, and the self-hosting docs correction (`migrate:prod` runs
`prisma migrate deploy`, not `migrate:dev`).

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

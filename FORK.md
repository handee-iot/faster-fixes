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

Adopted from `ongrowww/faster-fixes` (evaluated against our Dockerfile and
ported selectively; candidates for upstream PRs):

4. SMTP mailer — `MAILER_PROVIDER=smtp` sends through any SMTP server, so a
   self-hosted install no longer needs a Resend or Plunk account. Contact
   management is a provider concept and throws for SMTP.
5. `/api/health` — a database round-trip health endpoint for platforms and
   uptime checks.
6. `docker/entrypoint.sh` — loads `VAR_FILE` Docker secrets before start and
   can drop privileges (`RUN_AS_UID`/`RUN_AS_GID`) for compose deployments.
7. Dockerfile hardening — the runtime runs as a non-root `app` user with the
   corepack cache pre-seeded (no download at container start) and a pnpm store
   cache mount for faster rebuilds. Their Next standalone runner and separate
   migrator container were not ported: Railway's pre-deploy command already
   runs `prisma migrate deploy` in the app image.
8. Email branding — `BRAND_NAME`, `BRAND_URL` and `BRAND_LOGO_URL` brand every
   email (sender display name, header lockup with an accent rule, footer), the
   email palette follows Handee's ink/red, and the welcome email drops
   upstream's founder persona. The logo asset lives at
   `apps/web/public/images/handee-logo.png` (black on transparent, from
   `~/Documents/Brand/handee-iot-trans-black.png`). Candidate for an upstream
   PR: self-hosters should brand their own instance the same way.
9. Widget embed snippet in project settings — the API-key migration notice is
   replaced by an Embed section showing the plain `<script>` tag (pointing at
   the instance's own `/widget.iife.js`) with a copy button. The snippet
   builder (`install-snippets.ts`) moved from the onboarding feature to
   `_domains/project/_helpers/` so both surfaces share it. Candidate for an
   upstream PR: a self-hosted instance should surface its own embed snippet.
10. Portal embed hand-off — `GET /portal/handoff?token=…` sets the Reviewer's
    token as an HttpOnly cookie and redirects to `/portal/embed`, which renders
    the board with no portal chrome; `frame-ancestors` on `/portal/*` lets the
    Handee CRM frame it (ADR-0022). Candidate for an upstream PR: any
    self-hoster embedding the board in their own back office.
11. Reviewer invites — creating a Reviewer with an email sends them the board
    hand-off link and the widget link for their site, as a `reviewer/created`
    Inngest event (ADR-0023), and a **Resend invite** button re-sends them. The
    raw token is stored encrypted (`REVIEWER_TOKEN_ENCRYPTION_KEY`, ADR-0024)
    so a resend never changes the links a client already has; a Reviewer from
    before that column gets a fresh token, and the UI says so. Candidates for
    upstream PRs alongside the portal.
12. The widget's eye control clears the view — one press hides the pins and
    closes the issues list, and the choice sticks in `localStorage`
    (`ff_issues_hidden`), so a Reviewer who does not want to see their issues
    keeps them hidden across pages and visits. The `hideMarkers`/`showMarkers`
    label defaults read "Hide my issues"/"Show my issues" for the same reason
    (the keys are unchanged, so overrides keep working).

Deploy artifacts:

- `Dockerfile` — multi-stage build (pnpm install, `build:packages`, prisma
  generate, `next build`; runtime runs `next start` as a non-root user behind
  `docker/entrypoint.sh`).
- `railway.json` — Dockerfile builder, pre-deploy `prisma migrate deploy`,
  start command, healthcheck at `/api/health`.
- `.dockerignore`.
- **Inngest needs a manual Sync** after a deploy that adds or changes a
  function: the Inngest app does not re-sync on its own (there is no
  Vercel-style integration). Until you hit Sync in the dashboard (Apps →
  `faster-fixes`), events arrive but nothing triggers, so the background emails
  silently never send. Bit us on 19 Oct 2026: the app listed 17 of 20
  functions, so the reviewer invite, resolve and reply emails had never
  delivered.

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

- Project: `faster-fixes` (Handee workspace). Custom domain:
  https://faster-fixes.handee.co.za (Cloudflare-proxied CNAME to Railway); the
  Railway service domain also remains active.
- First deploys use `railway up` from this directory; connect the GitHub repo
  later if auto-deploys are wanted.
- **Service settings live on the Railway service, not in `railway.json`** — for
  upload-based deploys the config-as-code file is not applied. Pre-deploy:
  `pnpm --filter @workspace/db exec prisma migrate deploy`; healthcheck:
  `/api/health` (a database round-trip, switched from `/login` on 8 Oct). Keep
  `railway.json` only as documentation / for a future repo-linked service.
- Service variables: `DATABASE_URL` (`${{Postgres.DATABASE_URL}}`),
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DOMAIN_NAME`, `BASE_URL`,
  `NEXT_PUBLIC_FF_API_ORIGIN`, `NEXT_PUBLIC_STORAGE_BASE_URL`,
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `STORAGE_REGION`, `STORAGE_BUCKET_NAME`, `RESEND_API_KEY`, `EMAIL_FROM`,
  `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `PORT=3000`.
- `NEXT_PUBLIC_*` values are baked at build time: after changing them, rebuild
  and deploy (`railway up`).

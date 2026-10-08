# syntax=docker/dockerfile:1.7
# Handee self-host fork of Faster Fixes, deployed on Railway.
# Divergences from upstream are logged in FORK.md.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_HOME=/opt/corepack \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates util-linux \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_IS_CLOUD=false
ARG NEXT_PUBLIC_FF_API_ORIGIN
ARG NEXT_PUBLIC_STORAGE_BASE_URL
ENV NEXT_PUBLIC_IS_CLOUD=${NEXT_PUBLIC_IS_CLOUD} \
    NEXT_PUBLIC_FF_API_ORIGIN=${NEXT_PUBLIC_FF_API_ORIGIN} \
    NEXT_PUBLIC_STORAGE_BASE_URL=${NEXT_PUBLIC_STORAGE_BASE_URL}
# Placeholders so module-scope env checks pass during the build. Runtime values
# come from the platform; none of these are baked into the client bundle.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only \
    BETTER_AUTH_URL=http://localhost:3000 \
    DOMAIN_NAME=localhost \
    BASE_URL=http://localhost:3000 \
    RESEND_API_KEY=re_build_only \
    R2_ACCOUNT_ID=build-only \
    R2_ACCESS_KEY_ID=build-only \
    R2_SECRET_ACCESS_KEY=build-only
COPY . .
# The store lives in a cache mount, so repeat builds skip the downloads.
# Railway requires cache mount ids in the `s/<service id>-<target path>` form.
RUN --mount=type=cache,id=s/308b652c-4b2b-4b82-b822-15102c5a53bb-/pnpm/store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
RUN pnpm build:packages \
 && pnpm --filter @workspace/db db:gen \
 && pnpm --filter web build

FROM base AS run
ENV NODE_ENV=production
# The app runs as a non-root user; the corepack cache is copied over so the
# pnpm shim never downloads at container start.
RUN groupadd --system --gid 1001 app \
 && useradd --system --uid 1001 --gid app --create-home app
COPY --from=build --chown=app:app /app /app
COPY --from=build --chown=app:app /opt/corepack /opt/corepack
RUN chmod 0755 /app/docker/entrypoint.sh
USER app
EXPOSE 3000
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["sh", "-c", "pnpm --filter web exec next start -p ${PORT:-3000}"]

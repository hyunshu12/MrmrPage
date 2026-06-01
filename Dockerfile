# syntax=docker/dockerfile:1

# =============================================================
# Pinned Bun base image. Do NOT use :latest in production.
# oven/bun:1.2 is a stable major.minor tag (verified on Docker
# Hub) that auto-tracks 1.2.x patch releases without unexpected
# major upgrades. For a hard pin, swap to an exact patch tag
# (e.g. oven/bun:1.2.17) or a digest (oven/bun@sha256:...).
# =============================================================
ARG BUN_IMAGE=oven/bun:1.2

# -------------------------------------------------------------
# Stage 1 — deps: install node_modules from the lockfile only.
# Copying just package.json + bun.lock keeps this layer cached
# until dependencies actually change. devDependencies (tailwind,
# typescript, biome) ARE installed here because they are needed
# at build time.
# -------------------------------------------------------------
FROM ${BUN_IMAGE} AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# -------------------------------------------------------------
# Stage 2 — build: compile the Next.js app.
# Reuses the installed node_modules from the deps stage, then
# copies the source and produces the .next build output.
# No NOTION_* / NEXT_PUBLIC_* secrets are required at build time:
# all /api routes are force-dynamic and every Notion-consuming
# page is a client component fetching via React Query at runtime.
# -------------------------------------------------------------
FROM ${BUN_IMAGE} AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# -------------------------------------------------------------
# Stage 3 — runner: minimal runtime image.
# next.config.ts does NOT use output:'standalone', so we ship
# .next + public + package.json + node_modules + next.config.ts
# and run `next start` via `bun run start`. node_modules is
# required so the `next` binary resolves at runtime, and
# next.config.ts is required so the security headers / CSP /
# image remotePatterns apply (Bun loads the TS config natively).
# -------------------------------------------------------------
FROM ${BUN_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user. The oven/bun image ships a
# preexisting non-root "bun" user (uid/gid 1000, created via
# groupadd/useradd in the official image).
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/.next ./.next
COPY --from=build --chown=bun:bun /app/public ./public
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/next.config.ts ./next.config.ts

USER bun

EXPOSE 3000

CMD ["bun", "run", "start"]

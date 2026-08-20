# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------
# Dependencies
# ----------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Cached independently of source changes; npm ci is reproducible from the lockfile.
COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------------------------------------------------
# Build
# ----------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# No build arguments: the backend location is read at runtime, so this image
# is identical across every environment.
RUN npm run build

# ----------------------------------------------------------------------
# Runtime
# ----------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# output: "standalone" traces only the modules actually imported, so the
# runtime layer carries no full node_modules tree.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]

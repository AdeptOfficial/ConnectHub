FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN bun install --frozen-lockfile

# Copy source
COPY shared/ shared/
COPY server/ server/
COPY client/ client/

# Build client
FROM base AS client-build
RUN cd client && bun run build

# Production
FROM oven/bun:1-slim AS production
WORKDIR /app

COPY --from=base /app/package.json /app/bun.lock ./
COPY --from=base /app/shared/ shared/
COPY --from=base /app/server/ server/
COPY --from=base /app/node_modules/ node_modules/
COPY --from=base /app/server/node_modules/ server/node_modules/
COPY --from=client-build /app/client/dist/ client/dist/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Data volume for SQLite
VOLUME ["/app/data"]

CMD ["bun", "run", "server/src/index.ts"]

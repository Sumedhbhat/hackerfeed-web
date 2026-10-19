# The node deploy target as a container: runs on any host with Docker.
# Build args are the public VITE_* values baked into the browser bundle.
FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_WORKOS_CLIENT_ID
ARG VITE_WORKOS_REDIRECT_URI
ARG VITE_WORKOS_API_HOSTNAME
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ARG VITE_SENTRY_TRACES_SAMPLE_RATE
ARG VITE_APP_TITLE
ARG VITE_DEMO_DATA
RUN DEPLOY_TARGET=node bun run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	DATABASE_URL=file:/data/hackerfeed.db
COPY --from=build /app/.output ./.output
VOLUME /data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

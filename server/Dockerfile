# ClipFlow API.
#
# The backend needs a persistent process, a writable disk, and the yt-dlp and
# FFmpeg binaries — none of which a serverless platform provides. This image
# runs anywhere that takes a container: Railway, Render, Fly.io, Docker on a
# VPS, and so on.
#
# Build from the REPOSITORY ROOT so the workspace lockfile is available:
#   docker build -f server/Dockerfile -t clipflow-api .
#   docker run -p 4000:4000 -e CORS_ORIGINS=https://your-site.example clipflow-api

FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
# Install only the server workspace; the web app is deployed separately.
RUN npm ci --workspace server --include-workspace-root

COPY server ./server
RUN npm run build --workspace server


FROM node:22-bookworm-slim AS runtime

# yt-dlp needs Python; FFmpeg does the muxing and audio conversion.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        ffmpeg \
        python3 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp tracks its nightly channel for the same reason the local installer
# does: platform extraction changes constantly and stable lags behind.
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && /usr/local/bin/yt-dlp --update-to nightly || true

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --workspace server --include-workspace-root --omit=dev \
    && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist

# Temporary media is the only thing written to disk, and it is swept on a TTL.
RUN mkdir -p /app/server/.tmp && chown -R node:node /app/server/.tmp
USER node

ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/server
CMD ["node", "dist/index.js"]

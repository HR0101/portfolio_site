# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS workspace
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Compose overlays the source tree and isolates Linux dependencies/build output.
FROM workspace AS development
ENV NODE_ENV=development
EXPOSE 3001
CMD ["sh", "-c", "npm ci && exec npm run dev -- --hostname 0.0.0.0"]

# No bind mounts: checks run against the source copied into this image.
FROM workspace AS test
CMD ["npm", "run", "check"]

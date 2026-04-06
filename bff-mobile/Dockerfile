# ==============================================================================
# Dockerfile para BFF Mobile (NestJS)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder /app/package.json /app/package-lock.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3001

CMD ["dumb-init", "node", "dist/main"]

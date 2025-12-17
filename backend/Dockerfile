# ==============================================================================
# Dockerfile para Backend NestJS + Prisma
# Otimizado para deploy no Render
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder - Instala dependências e compila o TypeScript
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências primeiro (cache optimization)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production - Imagem final otimizada
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependências de runtime (dumb-init para signals, openssl para Prisma)
# e criar usuário não-root para segurança
RUN apk add --no-cache dumb-init openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar package.json para npm scripts
COPY --from=builder /app/package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copiar Prisma schema e client gerado
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copiar aplicação compilada
COPY --from=builder /app/dist ./dist

# Usar usuário não-root
USER nestjs

# Expor porta (Render usa variável PORT)
EXPOSE 3000

# Usar dumb-init como PID 1 para handling correto de signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:prod"]

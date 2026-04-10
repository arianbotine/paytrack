import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Instância do better-auth dedicada exclusivamente ao fluxo OAuth social.
 * Usa tabelas com prefixo "ba_" para não conflitar com as tabelas existentes.
 * Rota base: /api/auth-social (separado do /api/auth do NestJS).
 *
 * Após o callback OAuth, o frontend chama o endpoint bridge NestJS
 * POST /api/auth/google/token que converte a sessão better-auth no JWT
 * existente da aplicação — mantendo 100% de compatibilidade.
 */
export const socialAuth = betterAuth({
  baseURL: process.env.API_URL || 'http://localhost:3000',
  basePath: '/api/auth-social',

  // Origens confiáveis lidas da mesma variável que o CORS do NestJS usa.
  // Em produção o CORS_ORIGINS tem formato "https://a.com,https://b.com".
  trustedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Mapeamento para as tabelas com prefixo "ba_"
  user: { modelName: 'baUser' },
  session: { modelName: 'baSession' },
  account: { modelName: 'baAccount' },
  verification: { modelName: 'baVerification' },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: 'select_account',
    },
  },

  /**
   * Após criar um novo usuário no ba_user, sincroniza com a tabela
   * "users" existente da aplicação.
   * - Se o e-mail já existe: vincula silenciosamente (suporte a e-mail/senha + Google)
   * - Se o e-mail não existe: cria conta nova com password = null
   */
  databaseHooks: {
    user: {
      create: {
        after: async baUser => {
          const existingUser = await prisma.user.findUnique({
            where: { email: baUser.email },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: baUser.email,
                name: baUser.name,
                // password omitido → null (campo nullable, sem senha p/ usuários OAuth)
                isSystemAdmin: false,
                isActive: true,
              },
            });
          }
        },
      },
    },
  },
});

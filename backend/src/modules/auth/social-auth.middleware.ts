import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { socialAuth } from './better-auth.config';

const isProduction = process.env.NODE_ENV === 'production';

// Em produção restringe às origens definidas em CORS_ORIGINS;
// em desenvolvimento libera qualquer origem para facilitar o trabalho local.
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: isProduction
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed`));
        }
      }
    : (_origin, callback) => callback(null, true),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
};

const socialAuthCors = cors(corsOptions);
const socialAuthHandler = toNodeHandler(socialAuth);

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Middleware Express que intercepta rotas /api/auth-social/*.
 * Deve ser montado ANTES dos body-parsers do NestJS para que o
 * toNodeHandler possa ler o corpo bruto das requisições OAuth.
 *
 * Responsabilidades:
 * - Redirecionar /api/auth-social/error para o frontend com o código de erro
 * - Aplicar CORS adequado às rotas do better-auth
 * - Delegar o processamento OAuth ao handler do better-auth
 */
export function socialAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.url?.startsWith('/api/auth-social')) {
    next();
    return;
  }

  if (req.url.startsWith('/api/auth-social/error')) {
    const qs = req.url.split('?')[1] ?? '';
    const error = new URLSearchParams(qs).get('error') ?? 'oauth_error';
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/google/callback?error=${encodeURIComponent(error)}`
    );
    return;
  }

  socialAuthCors(req, res, () => socialAuthHandler(req, res));
}

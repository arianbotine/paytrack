import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { socialAuth } from './better-auth.config';

const isProduction = process.env.NODE_ENV === 'production';

// Origens confiáveis para redirecionar após OAuth (mesmo valor de CORS_ORIGINS)
const trustedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = trustedOrigins;

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
 * - GET /api/auth-social/initiate: inicia OAuth via navegação direta do browser
 *   (evita que CDN/Fastly do Railway suprima o Set-Cookie do cookie de estado)
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

  // Endpoint de iniciação via navegação direta do browser.
  // Ao contrário de um fetch CORS, uma navegação top-level não passa pela
  // lógica de CDN que suprime Set-Cookie, garantindo que o cookie de estado
  // do OAuth (better-auth.state) chegue ao browser.
  if (req.method === 'GET' && req.url.startsWith('/api/auth-social/initiate')) {
    void handleInitiate(req, res);
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

/**
 * Inicia o fluxo OAuth via navegação direta do browser (GET).
 * Chama o handler interno do better-auth para obter a URL do Google e os
 * cookies de estado/PKCE, depois faz 302 → Google com Set-Cookie no response.
 *
 * Por ser uma navegação top-level (não CORS/fetch), a CDN do Railway
 * não suprime o Set-Cookie, e o cookie chega corretamente ao browser.
 */
async function handleInitiate(req: Request, res: Response): Promise<void> {
  const qs = req.url.split('?')[1] ?? '';
  const params = new URLSearchParams(qs);
  const provider = params.get('provider') ?? '';
  const callbackURL = params.get('callbackURL') ?? '';

  const isTrusted = trustedOrigins.some(o => callbackURL.startsWith(o));
  if (!provider || !isTrusted) {
    res.writeHead(400).end('Bad Request');
    return;
  }

  try {
    // Chama o handler do better-auth diretamente (sem round-trip HTTP)
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const internalReq = new globalThis.Request(
      `${apiUrl}/api/auth-social/sign-in/social`,
      {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ provider, callbackURL }),
      }
    );

    const authResponse = await socialAuth.handler(internalReq);
    const body = (await authResponse.json()) as { url?: string };

    // Copia todos os Set-Cookie do better-auth para o response do browser
    const cookies: string[] =
      typeof authResponse.headers.getSetCookie === 'function'
        ? authResponse.headers.getSetCookie()
        : authResponse.headers.get('set-cookie')
          ? [authResponse.headers.get('set-cookie') as string]
          : [];

    if (cookies.length > 0) {
      res.setHeader('set-cookie', cookies);
    }

    if (body.url) {
      res.writeHead(302, { Location: body.url }).end();
    } else {
      res.writeHead(500).end('OAuth initiation failed');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[SocialAuth] initiate failed:', msg);
    res.writeHead(500).end('OAuth initiation failed');
  }
}

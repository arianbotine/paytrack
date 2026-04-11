import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { socialAuth } from './better-auth.config';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const FRONTEND_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

const trustedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: isProduction
    ? (origin, callback) => {
        if (!origin || trustedOrigins.includes(origin)) {
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

/**
 * Middleware Express que intercepta rotas /api/auth-social/*.
 * Deve ser montado ANTES dos body-parsers do NestJS.
 *
 * - /initiate : inicia OAuth via navegação top-level (garante Set-Cookie do estado)
 * - /callback/*: extrai o session token do Set-Cookie e o passa via URL para o
 *   frontend (?session=TOKEN), contornando a supressão de cookies pelo CDN Railway
 * - /error    : redireciona erros OAuth para a página de callback do frontend
 * - demais    : delegado ao toNodeHandler do better-auth com CORS aplicado
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

  if (req.method === 'GET' && req.url.startsWith('/api/auth-social/initiate')) {
    void handleInitiate(req, res);
    return;
  }

  if (
    req.method === 'GET' &&
    req.url.startsWith('/api/auth-social/callback/')
  ) {
    void handleCallback(req, res);
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
 * Inicia o fluxo OAuth via navegação top-level.
 * Chama socialAuth.handler internamente para obter a URL do Google e os
 * cookies de estado/PKCE, depois faz 302 → Google com Set-Cookie no response.
 * Navegações top-level não são interceptadas pelo Fastly do Railway,
 * então o cookie de estado chega ao browser corretamente.
 */
async function handleInitiate(req: Request, res: Response): Promise<void> {
  const qs = req.url.split('?')[1] ?? '';
  const params = new URLSearchParams(qs);
  const provider = params.get('provider') ?? '';
  const callbackURL = params.get('callbackURL') ?? '';

  if (!provider || !trustedOrigins.some(o => callbackURL.startsWith(o))) {
    res.writeHead(400).end('Bad Request');
    return;
  }

  try {
    const authResponse = await socialAuth.handler(
      new Request(`${API_URL}/api/auth-social/sign-in/social`, {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ provider, callbackURL }),
      })
    );

    const body = (await authResponse.json()) as { url?: string };
    const setCookies = getSetCookies(authResponse.headers);

    if (setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }

    if (body.url) {
      res.writeHead(302, { Location: body.url }).end();
    } else {
      res.writeHead(500).end('OAuth initiation failed');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[SocialAuth] initiate failed:',
      err instanceof Error ? err.message : err
    );
    res.writeHead(500).end('OAuth initiation failed');
  }
}

/**
 * Processa o callback do Google interceptando a resposta interna do better-auth.
 *
 * O Railway/Fastly suprime Set-Cookie em respostas 302 cross-origin, portanto
 * o cookie de sessão nunca chegaria ao browser. A solução é chamar o handler
 * internamente, extrair o token do Set-Cookie e incluí-lo na URL de
 * redirecionamento (?session=TOKEN) para que o frontend o envie via body no
 * POST /api/auth/google/token — sem depender de cookies cross-origin.
 *
 * Notas sobre encoding:
 * - Em HTTPS (produção), better-auth nomeia o cookie __Secure-better-auth.session_token
 * - Os valores são URL-encoded pelo better-call (+ → %2B, = → %3D); decodificamos
 *   e re-encodamos para evitar double-encoding (%252B) que quebra a assinatura HMAC
 */
async function handleCallback(req: Request, res: Response): Promise<void> {
  try {
    const authResponse = await socialAuth.handler(
      new Request(`${API_URL}${req.url}`, {
        method: 'GET',
        headers: new Headers({ cookie: req.headers.cookie ?? '' }),
      })
    );

    const setCookies = getSetCookies(authResponse.headers);
    const rawToken =
      extractCookieValue(setCookies, '__Secure-better-auth.session_token') ??
      extractCookieValue(setCookies, 'better-auth.session_token');

    const sessionToken =
      rawToken != null
        ? encodeURIComponent(decodeURIComponent(rawToken))
        : null;

    const location = authResponse.headers.get('location') ?? FRONTEND_ORIGIN;

    if (sessionToken) {
      const sep = location.includes('?') ? '&' : '?';
      res
        .writeHead(302, {
          Location: `${location}${sep}session=${sessionToken}`,
        })
        .end();
    } else {
      res.writeHead(302, { Location: location }).end();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[SocialAuth] callback failed:',
      err instanceof Error ? err.message : err
    );
    res
      .writeHead(302, {
        Location: `${FRONTEND_ORIGIN}/auth/google/callback?error=oauth_error`,
      })
      .end();
  }
}

/** Retorna todos os valores Set-Cookie de um Headers fetch-compatible. */
function getSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

/** Extrai o valor de um cookie específico de um array de strings Set-Cookie. */
function extractCookieValue(setCookies: string[], name: string): string | null {
  const prefix = `${name}=`;
  const entry = setCookies.find(c => c.startsWith(prefix));
  if (!entry) return null;
  return entry.slice(prefix.length).split(';')[0] ?? null;
}

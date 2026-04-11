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

  // Intercepta o callback do OAuth ANTES do toNodeHandler.
  // O Fastly (Railway CDN) suprime Set-Cookie em respostas 302 cross-origin,
  // portanto o cookie better-auth.session_token nunca chega ao browser.
  // A solução: extrair o token da sessão do Set-Cookie da resposta interna
  // do better-auth e passá-lo na URL de redirecionamento para o frontend
  // (?session=TOKEN). O frontend envia o token no body do POST /auth/google/token
  // — sem depender de cookies cross-origin.
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

/**
 * Processa o callback do Google interceptando a resposta interna do better-auth.
 *
 * Problema: Railway/Fastly suprime Set-Cookie em respostas 302 cross-origin,
 * então o cookie better-auth.session_token nunca chega ao browser.
 *
 * Solução: chamar socialAuth.handler internamente, extrair o token de sessão
 * do Set-Cookie da resposta e incluí-lo na URL de redirecionamento para o
 * frontend (?session=TOKEN). O frontend então envia o token no body do POST
 * /api/auth/google/token — sem cookies cross-origin.
 */
async function handleCallback(req: Request, res: Response): Promise<void> {
  try {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const internalReq = new globalThis.Request(`${apiUrl}${req.url}`, {
      method: 'GET',
      headers: new globalThis.Headers({ cookie: req.headers.cookie ?? '' }),
    });

    const authResponse = await socialAuth.handler(internalReq);

    const setCookies: string[] =
      typeof authResponse.headers.getSetCookie === 'function'
        ? authResponse.headers.getSetCookie()
        : authResponse.headers.get('set-cookie')
          ? [authResponse.headers.get('set-cookie') as string]
          : [];

    // Em produção (HTTPS) better-auth usa o prefixo __Secure- no cookie.
    // Tenta o nome seguro primeiro; fallback para desenvolvimento (HTTP).
    const rawToken =
      extractCookieValue(setCookies, '__Secure-better-auth.session_token') ??
      extractCookieValue(setCookies, 'better-auth.session_token');

    // Os valores de cookie são URL-encoded pelo serializeSignedCookie do better-call
    // (%2B para +, %3D para =). Decodifica antes de encodeURIComponent para
    // evitar double-encoding (%252B) que quebraria a verificação HMAC.
    const sessionToken = rawToken != null
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
      // Sem token = erro no callback (ex: state_mismatch) — redireciona como está
      res.writeHead(302, { Location: location }).end();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[SocialAuth] callback failed:', msg);
    const sep = FRONTEND_ORIGIN.includes('?') ? '&' : '?';
    res
      .writeHead(302, {
        Location: `${FRONTEND_ORIGIN}/auth/google/callback${sep}error=oauth_error`,
      })
      .end();
  }
}

/** Extrai o valor de um cookie específico de um array de strings Set-Cookie. */
function extractCookieValue(setCookies: string[], name: string): string | null {
  const prefix = `${name}=`;
  const entry = setCookies.find(c => c.startsWith(prefix));
  if (!entry) return null;
  return entry.slice(prefix.length).split(';')[0] ?? null;
}

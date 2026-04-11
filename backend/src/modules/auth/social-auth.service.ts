import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { socialAuth } from './better-auth.config';

// Cookie names used by better-auth:
// - HTTP  (dev) : better-auth.session_token
// - HTTPS (prod): __Secure-better-auth.session_token
const SESSION_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
] as const;

@Injectable()
export class SocialAuthService {
  /**
   * Obtém a sessão do better-auth a partir dos cookies da requisição.
   * Retorna null quando não há sessão OAuth ativa.
   */
  async getSession(req: Request) {
    const cookie = req.headers.cookie ?? '';
    if (!cookie) return null;

    return socialAuth.api.getSession({
      headers: new Headers({ cookie }),
    });
  }

  /**
   * Obtém a sessão pelo token passado explicitamente (sem cookie).
   * Usado em produção (cross-origin), onde o CDN do Railway suprime Set-Cookie
   * e o token é enviado via URL (?session=TOKEN) pelo handleCallback do middleware.
   *
   * Passa ambos os nomes de cookie para funcionar em HTTP (dev) e HTTPS (prod):
   * better-auth usa getSignedCookie que exige o nome exato do cookie.
   */
  async getSessionByToken(token: string) {
    const cookieHeader = SESSION_COOKIES.map(name => `${name}=${token}`).join(
      '; '
    );
    return socialAuth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    });
  }

  /**
   * Encerra a sessão do better-auth invalidando-a no banco e limpando
   * os cookies do browser. Chamado no logout para evitar que cookie residual
   * cause "invalid_code" no próximo login com Google.
   */
  async signOut(req: Request, res: Response): Promise<void> {
    const cookie = req.headers.cookie ?? '';
    const isProduction = process.env.NODE_ENV === 'production';

    // 'better-auth.session_token' é substring do nome seguro também,
    // portanto esta checagem cobre ambos os ambientes.
    if (cookie.includes('better-auth.session_token')) {
      try {
        await socialAuth.api.signOut({ headers: new Headers({ cookie }) });
      } catch {
        // Sessão pode já estar expirada — continua para limpar o cookie
      }
    }

    // Limpa ambos os nomes de cookie para cobrir HTTP e HTTPS
    for (const name of SESSION_COOKIES) {
      res.clearCookie(name, {
        path: '/',
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
      });
    }
  }
}

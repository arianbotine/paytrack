import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { socialAuth } from './better-auth.config';

const SESSION_COOKIE = 'better-auth.session_token';

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
   * Encerra a sessão do better-auth, invalidando o registro no banco
   * e instruindo o browser a remover o cookie de sessão.
   *
   * Deve ser chamado no logout para evitar que o cookie residual
   * cause "invalid_code" no próximo login com Google.
   */
  async signOut(req: Request, res: Response): Promise<void> {
    const cookie = req.headers.cookie ?? '';

    if (cookie.includes(SESSION_COOKIE)) {
      try {
        await socialAuth.api.signOut({
          headers: new Headers({ cookie }),
        });
      } catch {
        // Sessão pode já estar expirada — garante limpeza do cookie mesmo assim
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie(SESSION_COOKIE, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    });
  }
}

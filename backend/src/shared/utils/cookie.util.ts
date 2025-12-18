import { Response } from 'express';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge?: number;
}

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Opções padrão para refresh token cookie
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

/**
 * Define refresh token como httpOnly cookie
 */
export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string
): void => {
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
};

/**
 * Limpa refresh token cookie
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  const options = getRefreshTokenCookieOptions();
  delete options.maxAge; // Remove maxAge para limpar cookie
  res.clearCookie('refreshToken', options);
};

import { createAuthClient } from 'better-auth/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Cliente better-auth para lidar exclusivamente com o fluxo OAuth social.
 * Aponta para /api/auth-social, separado do /api/auth do NestJS.
 *
 * Uso:
 *   await socialAuthClient.signIn.social({ provider: 'google', callbackURL: '...' })
 *
 * Após o callback, o frontend chama POST /api/auth/google/token para obter o JWT.
 */
export const socialAuthClient = createAuthClient({
  baseURL: `${API_URL}/api/auth-social`,
});

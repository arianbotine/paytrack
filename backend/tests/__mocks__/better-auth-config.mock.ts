/// <reference types="jest" />

/**
 * Mock do módulo better-auth.config para testes E2E.
 * O pacote better-auth é pure ESM e incompatível com o Jest no modo CommonJS.
 * Este mock expõe a interface mínima usada por SocialAuthService.
 */
export const socialAuth = {
  api: {
    getSession: jest.fn().mockResolvedValue(null),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  handler: jest.fn().mockResolvedValue(undefined),
};

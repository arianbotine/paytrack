import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';
import { LoginDto, SelectOrganizationDto, RefreshTokenDto } from './auth.dto';

interface BackendAuthBody {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    isSystemAdmin: boolean;
    currentOrganization?: {
      id: string;
      name: string;
      role: string;
    };
    availableOrganizations: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };
}

export interface BackendAuthResponse extends BackendAuthBody {
  refreshToken: string | null;
}

/**
 * Parse the refresh token value out of a Set-Cookie header.
 * Backend sets: refreshToken=<value>; Path=/; HttpOnly; ...
 */
function extractRefreshToken(
  setCookie: string | string[] | undefined
): string | null {
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookies) {
    const match = cookie.match(/^refreshToken=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

@Injectable()
export class AuthService {
  constructor(private readonly httpClient: HttpClientService) {}

  /**
   * Login via backend.
   * Backend stores refreshToken in HttpOnly cookie; BFF extracts it and
   * returns it in the JSON body so the mobile app can store it securely.
   */
  async login(dto: LoginDto): Promise<BackendAuthResponse> {
    const { data, setCookie } =
      await this.httpClient.postWithHeaders<BackendAuthBody>(
        '/auth/login',
        dto
      );
    return { ...data, refreshToken: extractRefreshToken(setCookie) };
  }

  /**
   * Refresh tokens.
   * Mobile sends refreshToken in body; BFF forwards it as a cookie to the
   * backend (which only reads cookies), then returns the new tokens in body.
   */
  async refresh(dto: RefreshTokenDto): Promise<BackendAuthResponse> {
    const { data, setCookie } =
      await this.httpClient.postWithHeaders<BackendAuthBody>(
        '/auth/refresh',
        undefined,
        undefined,
        { headers: { Cookie: `refreshToken=${dto.refreshToken}` } }
      );
    const newRefreshToken = extractRefreshToken(setCookie) ?? dto.refreshToken;
    return { ...data, refreshToken: newRefreshToken };
  }

  /**
   * Select organization for multi-org users.
   */
  async selectOrganization(
    dto: SelectOrganizationDto,
    accessToken: string
  ): Promise<BackendAuthResponse> {
    const { data, setCookie } =
      await this.httpClient.postWithHeaders<BackendAuthBody>(
        '/auth/select-organization',
        dto,
        accessToken
      );
    return { ...data, refreshToken: extractRefreshToken(setCookie) };
  }

  /**
   * Get current user profile.
   */
  async getProfile(accessToken: string) {
    return this.httpClient.get('/auth/me', accessToken);
  }
}

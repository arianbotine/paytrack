import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService, BackendAuthResponse } from './auth.service';
import { LoginDto, SelectOrganizationDto, RefreshTokenDto } from './auth.dto';
import { Public } from '../shared/public.decorator';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';

@ApiTags('Auth')
@ApiBearerAuth('JWT')
@Controller('auth')
@UseGuards(JwtGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login with email and password.
   * Returns tokens in body (not cookies) for mobile storage.
   */
  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Autenticar usuário',
    description:
      'Realiza login com e-mail e senha. Retorna tokens no corpo da resposta (sem cookies) para armazenamento seguro no dispositivo móvel.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login realizado com sucesso. Tokens retornados.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'admin@paytrack.com',
          name: 'Administrador',
          isSystemAdmin: false,
          currentOrganization: {
            id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            name: 'Empresa Exemplo Ltda',
            role: 'OWNER',
          },
          availableOrganizations: [
            {
              id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
              name: 'Empresa Exemplo Ltda',
              role: 'OWNER',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(@Body() dto: LoginDto): Promise<BackendAuthResponse> {
    return this.authService.login(dto);
  }

  /**
   * Refresh access token using refresh token.
   */
  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Gera um novo par de tokens (access + refresh) a partir de um refresh token válido.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Tokens renovados com sucesso.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'admin@paytrack.com',
          name: 'Administrador',
          isSystemAdmin: false,
          currentOrganization: {
            id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            name: 'Empresa Exemplo Ltda',
            role: 'OWNER',
          },
          availableOrganizations: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado.',
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<BackendAuthResponse> {
    return this.authService.refresh(dto);
  }

  /**
   * Select organization for multi-org users.
   */
  @Post('select-organization')
  @ApiOperation({
    summary: 'Selecionar organização',
    description:
      'Troca a organização ativa do usuário. Útil para usuários que pertencem a mais de uma organização. Retorna novos tokens escopados à organização escolhida.',
  })
  @ApiBody({ type: SelectOrganizationDto })
  @ApiResponse({
    status: 201,
    description:
      'Organização selecionada com sucesso. Novos tokens retornados.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'admin@paytrack.com',
          name: 'Administrador',
          isSystemAdmin: false,
          currentOrganization: {
            id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            name: 'Filial Sul',
            role: 'ADMIN',
          },
          availableOrganizations: [],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido.' })
  @ApiResponse({ status: 404, description: 'Organização não encontrada.' })
  async selectOrganization(
    @Body() dto: SelectOrganizationDto,
    @CurrentUser('accessToken') accessToken: string
  ): Promise<BackendAuthResponse> {
    return this.authService.selectOrganization(dto, accessToken);
  }

  /**
   * Get current user profile.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Perfil do usuário autenticado',
    description: 'Retorna os dados do usuário logado e a organização ativa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil retornado com sucesso.',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'admin@paytrack.com',
        name: 'Administrador',
        role: 'OWNER',
        organization: {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          name: 'Empresa Exemplo Ltda',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async getProfile(@CurrentUser('accessToken') accessToken: string) {
    return this.authService.getProfile(accessToken);
  }
}

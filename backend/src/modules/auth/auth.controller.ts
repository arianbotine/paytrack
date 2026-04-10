import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import {
  LoginDto,
  AuthResponseDto,
  SelectOrganizationDto,
  GoogleTokenDto,
} from './dto/auth.dto';
import {
  Public,
  CurrentUser,
  SkipOrganizationCheck,
} from '../../shared/decorators';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../shared/utils';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialAuthService: SocialAuthService
  ) {}

  @Public()
  @SkipOrganizationCheck()
  @Post('login')
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas. Tente novamente mais tarde.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(loginDto);
    setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('select-organization')
  @ApiBearerAuth()
  @SkipOrganizationCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Selecionar organização ativa' })
  @ApiResponse({
    status: 200,
    description: 'Organização selecionada com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Organização não disponível' })
  async selectOrganization(
    @CurrentUser('sub') userId: string,
    @Body() dto: SelectOrganizationDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.selectOrganization(userId, dto);
    setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @SkipOrganizationCheck()
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas. Tente novamente mais tarde.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    let refreshToken = req.cookies?.['refreshToken'];

    // For tests, also accept refresh token in Authorization header
    if (!refreshToken && process.env.NODE_ENV === 'test') {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
      }
    }

    if (!refreshToken) {
      throw new HttpException(
        'Refresh token não encontrado',
        HttpStatus.UNAUTHORIZED
      );
    }
    const result = await this.authService.refreshTokens(refreshToken);
    setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('logout')
  @ApiBearerAuth()
  @SkipOrganizationCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout do usuário' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    clearRefreshTokenCookie(res);
    await this.socialAuthService.signOut(req, res);
    return { message: 'Logout realizado com sucesso' };
  }

  @Get('me')
  @ApiBearerAuth()
  @SkipOrganizationCheck()
  @ApiOperation({ summary: 'Obter perfil do usuário logado' })
  @ApiResponse({ status: 200, description: 'Perfil do usuário' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Public()
  @SkipOrganizationCheck()
  @Post('google/token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trocar sessão OAuth do Google por JWT da aplicação',
  })
  @ApiResponse({
    status: 200,
    description: 'Login social realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão OAuth inválida ou expirada',
  })
  async googleToken(
    @Body() body: GoogleTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    // Tenta obter sessão pelo token passado no body (produção cross-origin:
    // CDN Railway suprime Set-Cookie → token enviado via URL → body).
    // Fallback: cookie (funciona em desenvolvimento local same-origin).
    const session = body.session
      ? await this.socialAuthService.getSessionByToken(body.session)
      : await this.socialAuthService.getSession(req);

    if (!session?.user?.email) {
      throw new UnauthorizedException('Sessão OAuth inválida ou expirada');
    }

    const result = await this.authService.loginWithGoogle(session.user.email);
    setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }
}

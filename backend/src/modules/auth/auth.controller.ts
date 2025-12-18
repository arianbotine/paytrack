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
import {
  LoginDto,
  AuthResponseDto,
  SelectOrganizationDto,
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
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipOrganizationCheck()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
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
    const refreshToken = req.cookies?.['refreshToken'];
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
  async logout(@Res({ passthrough: true }) res: Response) {
    clearRefreshTokenCookie(res);
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
}

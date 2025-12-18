import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../modules/auth/dto/auth.dto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const SKIP_ORGANIZATION_CHECK = 'skipOrganizationCheck';

/**
 * Guard que valida se o usuário tem uma organização selecionada
 * Endpoints multi-tenant DEVEM ter organizationId no JWT payload
 * Exceção: System admins podem acessar sem organizationId
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Allow OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return true;
    }

    // Endpoints públicos não precisam de validação de organização
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Verificar se o endpoint deve pular a validação de organização
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORGANIZATION_CHECK,
      [context.getHandler(), context.getClass()]
    );

    if (skipCheck) {
      return true;
    }

    const user = request.user as JwtPayload;

    // System admins podem acessar sem organizationId
    if (user?.isSystemAdmin) {
      return true;
    }

    // Usuários regulares DEVEM ter organizationId
    if (!user?.organizationId) {
      throw new ForbiddenException(
        'Selecione uma organização antes de continuar'
      );
    }

    return true;
  }
}

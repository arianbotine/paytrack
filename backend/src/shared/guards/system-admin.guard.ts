import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/dto/auth.dto';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Allow OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return true;
    }

    const user = request.user as JwtPayload;

    if (!user?.isSystemAdmin) {
      throw new ForbiddenException(
        'Acesso restrito a administradores do sistema'
      );
    }

    return true;
  }
}

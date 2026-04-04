import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current user or a specific field from the JWT payload.
 * Also provides access to the raw accessToken for forwarding to backend.
 *
 * Usage:
 *   @CurrentUser() user: JwtPayload
 *   @CurrentUser('organizationId') orgId: string
 *   @CurrentUser('accessToken') token: string
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (field === 'accessToken') {
      return request.accessToken;
    }

    if (field) {
      return user?.[field];
    }

    return user;
  }
);

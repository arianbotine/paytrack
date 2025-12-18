import { SetMetadata } from '@nestjs/common';
import { SKIP_ORGANIZATION_CHECK } from '../guards/organization.guard';

/**
 * Decorator para pular a validação de organização em endpoints específicos
 * Use em endpoints que não dependem de multi-tenancy (ex: /auth/me, /auth/select-organization)
 */
export const SkipOrganizationCheck = () =>
  SetMetadata(SKIP_ORGANIZATION_CHECK, true);

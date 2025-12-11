import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import {
  OrganizationsController,
  AdminOrganizationsController,
} from './organizations.controller';

@Module({
  controllers: [OrganizationsController, AdminOrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}

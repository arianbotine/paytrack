import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { BaseEntityService } from '../shared/base-entity.service';
import { Vendor } from '@prisma/client';

@Injectable()
export class VendorsService extends BaseEntityService<
  Vendor,
  CreateVendorDto,
  UpdateVendorDto
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Vendor', prisma.vendor, 'Credor');
  }

  /**
   * Check if vendor has related payables
   */
  protected async checkIfInUse(id: string): Promise<boolean> {
    const count = await this.prisma.payable.count({
      where: { vendorId: id },
    });
    return count > 0;
  }

  /**
   * Vendors ordered by name
   */
  protected getDefaultOrderBy() {
    return { name: 'asc' };
  }
}

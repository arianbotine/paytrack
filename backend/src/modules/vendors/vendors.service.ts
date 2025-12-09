import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, includeInactive = false) {
    return this.prisma.vendor.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException("Credor não encontrado");
    }

    return vendor;
  }

  async create(organizationId: string, createDto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        organizationId,
        ...createDto,
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateVendorDto) {
    await this.findOne(id, organizationId);

    return this.prisma.vendor.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const vendor = await this.findOne(id, organizationId);

    // Check if vendor has payables
    const hasPayables = await this.prisma.payable.count({
      where: { vendorId: id },
    });

    if (hasPayables > 0) {
      // Soft delete - just deactivate
      return this.prisma.vendor.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await this.prisma.vendor.delete({ where: { id } });
    return vendor;
  }
}

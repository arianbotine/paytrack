import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrismaErrorHandler } from '../../shared/utils/prisma-error-handler';

/**
 * Base service with common CRUD operations
 * Reduces code duplication across entity services
 *
 * @template TModel - Prisma model type
 * @template TCreateDto - DTO for create operation
 * @template TUpdateDto - DTO for update operation
 */
export abstract class BaseEntityService<TModel, TCreateDto, TUpdateDto> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly modelName: string,
    private readonly modelDelegate: any,
    private readonly entityDisplayName: string
  ) {}

  /**
   * Find all entities for an organization
   * Optionally include inactive entities
   */
  async findAll(
    organizationId: string,
    includeInactive = false
  ): Promise<TModel[]> {
    try {
      const where: any = { organizationId };

      if (!includeInactive && this.hasIsActiveField()) {
        where.isActive = true;
      }

      return await this.modelDelegate.findMany({
        where,
        orderBy: this.getDefaultOrderBy(),
      });
    } catch (error) {
      PrismaErrorHandler.handleError(error, this.entityDisplayName);
    }
  }

  /**
   * Find one entity by ID and organization
   */
  async findOne(id: string, organizationId: string): Promise<TModel> {
    try {
      const entity = await this.modelDelegate.findFirst({
        where: { id, organizationId },
      });

      if (!entity) {
        throw new NotFoundException(
          `${this.entityDisplayName} não encontrado(a)`
        );
      }

      return entity;
    } catch (error) {
      PrismaErrorHandler.handleError(error, this.entityDisplayName);
    }
  }

  /**
   * Create a new entity
   */
  async create(organizationId: string, createDto: TCreateDto): Promise<TModel> {
    try {
      // Check for unique constraint violations before creating
      await this.checkUniqueConstraints(organizationId, createDto);

      return await this.modelDelegate.create({
        data: {
          organizationId,
          ...createDto,
        },
      });
    } catch (error) {
      PrismaErrorHandler.handleError(error, this.entityDisplayName);
    }
  }

  /**
   * Update an existing entity
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: TUpdateDto
  ): Promise<TModel> {
    try {
      // Verify entity exists and belongs to organization
      await this.findOne(id, organizationId);

      // Check for unique constraint violations
      await this.checkUniqueConstraints(organizationId, updateDto, id);

      return await this.modelDelegate.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      PrismaErrorHandler.handleError(error, this.entityDisplayName);
    }
  }

  /**
   * Remove an entity (soft or hard delete based on usage)
   */
  async remove(id: string, organizationId: string): Promise<TModel> {
    try {
      const entity = await this.findOne(id, organizationId);

      // Check if entity is in use
      const isInUse = await this.checkIfInUse(id);

      if (isInUse && this.hasIsActiveField()) {
        // Soft delete - deactivate
        return await this.modelDelegate.update({
          where: { id },
          data: { isActive: false },
        });
      }

      // Hard delete
      await this.modelDelegate.delete({ where: { id } });
      return entity;
    } catch (error) {
      PrismaErrorHandler.handleError(error, this.entityDisplayName);
    }
  }

  /**
   * Override this to check if entity is in use (for soft delete logic)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async checkIfInUse(_id: string): Promise<boolean> {
    return false; // Default: allow hard delete
  }

  /**
   * Override this to check unique constraints before create/update
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async checkUniqueConstraints(
    _organizationId: string,
    _dto: Partial<TCreateDto | TUpdateDto>,
    _excludeId?: string
  ): Promise<void> {
    // Default: no additional checks
  }

  /**
   * Override this to customize default ordering
   */
  protected getDefaultOrderBy(): any {
    return { createdAt: 'desc' };
  }

  /**
   * Check if model has isActive field
   */
  private hasIsActiveField(): boolean {
    // Models with isActive: Vendor, Customer, Category, User, Organization
    return ['vendor', 'customer', 'category', 'user', 'organization'].includes(
      this.modelName.toLowerCase()
    );
  }
}

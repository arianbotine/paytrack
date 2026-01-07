import { NotFoundException, ConflictException } from '@nestjs/common';
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
      await this.findOne(id, organizationId);

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

      const isInUse = await this.checkIfInUse(id);

      if (isInUse) {
        if (this.hasIsActiveField()) {
          // Soft delete: marca como inativo
          return await this.modelDelegate.update({
            where: { id },
            data: { isActive: false },
          });
        } else {
          // Entidade não suporta soft delete, bloquear exclusão
          throw new ConflictException(
            `${this.entityDisplayName} não pode ser excluído(a) pois está em uso`
          );
        }
      }

      await this.modelDelegate.delete({ where: { id } });
      return entity;
    } catch (error) {
      PrismaErrorHandler.handleError(error, this.entityDisplayName);
    }
  }

  /**
   * Override this to check if entity is in use (for soft delete logic).
   * This base implementation returns false - subclasses should override to implement their own logic.
   */
  protected async checkIfInUse(id: string): Promise<boolean> {
    return false;
  }

  /**
   * Override this to check unique constraints before create/update.
   * This base implementation does nothing - subclasses should implement their own validation logic.
   */
  protected async checkUniqueConstraints(
    organizationId: string,
    dto: Partial<TCreateDto | TUpdateDto>,
    excludeId?: string
  ): Promise<void> {
    // Implementation should be provided by subclasses
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
    return ['vendor', 'customer', 'category', 'user', 'organization'].includes(
      this.modelName.toLowerCase()
    );
  }
}

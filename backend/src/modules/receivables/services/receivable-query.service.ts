import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivablesRepository } from '../repositories';
import { ReceivableFilterDto } from '../dto/receivable.dto';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Serviço responsável por executar queries de contas a receber
 */
@Injectable()
export class ReceivableQueryService {
  constructor(private readonly receivablesRepository: ReceivablesRepository) {}

  /**
   * Executa query paginada de receivables
   */
  async findManyPaginated(
    where: Prisma.ReceivableWhereInput,
    filters?: ReceivableFilterDto,
    include?: Prisma.ReceivableInclude
  ): Promise<{ data: any[]; total: number }> {
    const take = filters?.take
      ? Math.min(filters.take, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.receivablesRepository.findMany(where, {
        include,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.receivablesRepository.count(where),
    ]);

    return { data, total };
  }

  /**
   * Busca um receivable por ID
   */
  async findOne(
    id: string,
    organizationId: string,
    include?: Prisma.ReceivableInclude
  ): Promise<any> {
    return this.receivablesRepository.findFirst(
      { id, organizationId },
      include
    );
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayablesRepository } from '../repositories';
import { PayableFilterDto } from '../dto/payable.dto';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Serviço responsável por executar queries de contas a pagar
 */
@Injectable()
export class PayableQueryService {
  constructor(private readonly payablesRepository: PayablesRepository) {}

  /**
   * Executa query paginada de payables
   */
  async findManyPaginated(
    where: Prisma.PayableWhereInput,
    filters?: PayableFilterDto,
    include?: Prisma.PayableInclude
  ): Promise<{ data: any[]; total: number }> {
    const take = filters?.take
      ? Math.min(filters.take, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.payablesRepository.findMany(where, {
        include,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.payablesRepository.count(where),
    ]);

    return { data, total };
  }

  /**
   * Busca um payable por ID
   */
  async findOne(
    id: string,
    organizationId: string,
    include?: Prisma.PayableInclude
  ): Promise<any> {
    return this.payablesRepository.findFirst({ id, organizationId }, include);
  }
}

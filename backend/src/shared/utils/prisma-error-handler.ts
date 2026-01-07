import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PRISMA_ERROR_CODES } from '../constants';

/**
 * Centralized Prisma error handler
 * Converts Prisma errors into appropriate HTTP exceptions
 */
@Injectable()
export class PrismaErrorHandler {
  /**
   * Handle Prisma errors and throw appropriate HTTP exceptions
   */
  static handleError(error: unknown, entityName: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT:
          throw new ConflictException(
            this.getUniqueConstraintMessage(error, entityName)
          );

        case PRISMA_ERROR_CODES.NOT_FOUND:
          throw new NotFoundException(`${entityName} não encontrado(a)`);

        case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT:
          throw new BadRequestException(
            `Não é possível completar a operação: existe relacionamento com outros registros`
          );

        case PRISMA_ERROR_CODES.REQUIRED_FIELD:
          throw new BadRequestException(
            `Campo obrigatório ausente: ${error.meta?.field?.toString() || 'desconhecido'}`
          );

        default:
          throw new BadRequestException(
            `Erro ao processar ${entityName.toLowerCase()}: ${error.message}`
          );
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException(
        `Erro de validação nos dados do ${entityName.toLowerCase()}`
      );
    }

    // Re-throw if it's already an HTTP exception
    if (
      error instanceof NotFoundException ||
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    // Unknown error
    throw new BadRequestException(
      `Erro interno ao processar ${entityName.toLowerCase()}`
    );
  }

  /**
   * Extract user-friendly message from unique constraint error
   */
  private static getUniqueConstraintMessage(
    error: Prisma.PrismaClientKnownRequestError,
    entityName: string
  ): string {
    const target = error.meta?.target as string[] | undefined;

    if (target?.includes('name') && target?.includes('type')) {
      return `${entityName} já existe com este nome e tipo`;
    }

    if (target?.includes('name')) {
      return `${entityName} já existe com este nome`;
    }

    if (target?.includes('email')) {
      return `${entityName} já existe com este e-mail`;
    }

    if (target?.includes('document')) {
      return `${entityName} já existe com este documento`;
    }

    return `${entityName} com estes dados já existe`;
  }
}

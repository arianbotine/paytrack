import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PeriodCalculator {
  /**
   * Calcula o período anterior ao fornecido (mesmo intervalo de tempo deslocado para trás)
   */
  getPreviousPeriod(
    startDate: Date,
    endDate: Date
  ): { start: Date; end: Date } {
    const diffMs = endDate.getTime() - startDate.getTime();

    // prevEnd = 1 dia antes do startDate atual
    const prevEnd = new Date(startDate.getTime() - 86400000);

    // prevStart = mesmo intervalo antes de prevEnd
    const prevStart = new Date(prevEnd.getTime() - diffMs);

    return { start: prevStart, end: prevEnd };
  }

  /**
   * Valida se o período não excede 365 dias
   */
  validateMaxPeriod(startDate: Date, endDate: Date): void {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > 365) {
      throw new BadRequestException('Período máximo permitido é de 1 ano');
    }
  }
}

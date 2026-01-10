import { Injectable, BadRequestException } from '@nestjs/common';
import { ReportPeriodEnum } from '../dto';

@Injectable()
export class PeriodCalculator {
  /**
   * Converte enum de período em datas UTC
   */
  parsePeriodEnum(period: ReportPeriodEnum): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    );
    let start: Date;

    switch (period) {
      case ReportPeriodEnum.SEVEN_DAYS:
        start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 6); // 7 dias incluindo hoje
        start.setUTCHours(0, 0, 0, 0);
        break;

      case ReportPeriodEnum.THIRTY_DAYS:
        start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 29); // 30 dias incluindo hoje
        start.setUTCHours(0, 0, 0, 0);
        break;

      case ReportPeriodEnum.NINETY_DAYS:
        start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 89); // 90 dias incluindo hoje
        start.setUTCHours(0, 0, 0, 0);
        break;

      case ReportPeriodEnum.MONTH:
        // Primeiro dia do mês atual até hoje
        start = new Date(
          Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        );
        break;

      case ReportPeriodEnum.QUARTER: {
        // Primeiro dia do trimestre atual até hoje
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStartMonth = currentQuarter * 3;
        start = new Date(
          Date.UTC(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0)
        );
        break;
      }

      case ReportPeriodEnum.YEAR:
        // 1º de janeiro até hoje
        start = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0));
        break;

      default:
        throw new BadRequestException(
          'Período inválido. Use startDate e endDate para períodos customizados.'
        );
    }

    return { start, end };
  }

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

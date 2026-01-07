import { Injectable } from '@nestjs/common';

/**
 * Domain Service para cálculos de datas do dashboard
 * Responsabilidade: Lógica pura de manipulação de datas em UTC
 */
@Injectable()
export class DateRangeCalculator {
  /**
   * Retorna a data atual em UTC (sem hora)
   */
  getTodayUTC(): Date {
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
  }

  /**
   * Calcula início do mês vigente em UTC
   */
  getStartOfCurrentMonth(): Date {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  }

  /**
   * Calcula fim do mês vigente em UTC
   */
  getEndOfCurrentMonth(): Date {
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 23, 59, 59)
    );
  }

  /**
   * Calcula data daqui a N dias
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Retorna a menor data entre duas datas
   */
  min(date1: Date, date2: Date): Date {
    return new Date(Math.min(date1.getTime(), date2.getTime()));
  }
}

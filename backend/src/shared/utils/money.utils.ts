import { Decimal } from '@prisma/client/runtime/library';

/**
 * Utilitário para manipulação precisa de valores monetários
 * Centraliza conversões e formatações para evitar inconsistências
 */
export class MoneyUtils {
  /**
   * Converte valor Decimal do Prisma para number com precisão de 2 casas decimais
   * @param value Valor Decimal do Prisma
   * @returns Número com precisão monetária
   */
  static toNumber(value: Decimal | number | string): number {
    if (value instanceof Decimal) {
      // Decimal do Prisma tem método toNumber() preciso
      return value.toNumber();
    }

    if (typeof value === 'string') {
      // Converte string para number com parseFloat
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        throw new TypeError(`Valor monetário inválido: ${value}`);
      }
      return parsed;
    }

    if (typeof value === 'number') {
      // Já é number, retorna como está
      return value;
    }

    throw new Error(`Tipo de valor não suportado: ${typeof value}`);
  }

  /**
   * Converte number para Decimal do Prisma
   * @param value Valor numérico
   * @returns Decimal do Prisma
   */
  static toDecimal(value: number | string): Decimal {
    if (typeof value === 'string') {
      return new Decimal(value);
    }
    return new Decimal(value);
  }

  /**
   * Arredonda valor para 2 casas decimais (padrão monetário)
   * @param value Valor a ser arredondado
   * @returns Valor arredondado
   */
  static roundToCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Formata valor como moeda brasileira
   * @param value Valor numérico
   * @returns String formatada (ex: "R$ 1.234,56")
   */
  static formatBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  /**
   * Valida se um valor é um número monetário válido
   * @param value Valor a validar
   * @returns true se válido
   */
  static isValidMoney(value: Decimal | number | string): boolean {
    if (value instanceof Decimal) {
      return !value.isNaN();
    }

    if (typeof value === 'number') {
      return !Number.isNaN(value) && Number.isFinite(value);
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return !Number.isNaN(parsed) && Number.isFinite(parsed);
    }

    return false;
  }

  /**
   * Converte objeto com campos monetários para formato seguro
   * Útil para transformar respostas de API
   * @param obj Objeto com campos a converter
   * @param moneyFields Nomes dos campos que são monetários
   * @returns Objeto com campos convertidos
   */
  static transformMoneyFields<T extends Record<string, any>>(
    obj: T,
    moneyFields: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const field of moneyFields) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = this.toNumber(result[field]) as any;
      }
    }

    return result;
  }

  /**
   * Converte array de objetos com campos monetários
   * @param items Array de objetos
   * @param moneyFields Campos monetários
   * @returns Array transformado
   */
  static transformMoneyFieldsArray<T extends Record<string, any>>(
    items: T[],
    moneyFields: (keyof T)[]
  ): T[] {
    return items.map(item => this.transformMoneyFields(item, moneyFields));
  }
}

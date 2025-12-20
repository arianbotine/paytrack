import { addMonths } from 'date-fns';
import { AccountStatus } from '../types/account.types';

/**
 * Interface para prévia de parcela
 */
export interface InstallmentPreview {
  number: number;
  dueDate: string; // YYYY-MM-DD format
  amount: number;
}

/**
 * Interface para progresso de parcelas
 */
export interface InstallmentProgress {
  paidCount: number;
  totalCount: number;
  percentage: number;
  paidInstallments: number[]; // números das parcelas pagas
}

/**
 * Gera datas de vencimento mensais a partir de uma data inicial
 * Calcula as datas no frontend e retorna em formato UTC (YYYY-MM-DD)
 *
 * @param firstDueDate Data do primeiro vencimento (YYYY-MM-DD)
 * @param count Quantidade de parcelas
 * @returns Array de datas em formato YYYY-MM-DD
 */
export function generateInstallmentDueDates(
  firstDueDate: string,
  count: number
): string[] {
  const dates: string[] = [];
  // Parse como UTC noon para evitar problemas de timezone
  const baseDate = new Date(firstDueDate + 'T12:00:00.000Z');

  for (let i = 0; i < count; i++) {
    const date = addMonths(baseDate, i);
    // Formatar como YYYY-MM-DD usando UTC
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

/**
 * Calcula valores de parcelas com distribuição igual e arredondamento exato
 * A última parcela absorve o resto para garantir que a soma seja exata
 *
 * @param totalAmount Valor total
 * @param count Quantidade de parcelas
 * @returns Array de valores das parcelas
 */
export function calculateInstallmentAmounts(
  totalAmount: number,
  count: number
): number[] {
  // Arredondar para baixo com 2 casas decimais
  const baseValue = Math.floor((totalAmount * 100) / count) / 100;
  // Calcular resto
  const remainder = totalAmount - baseValue * count;

  // Criar array de valores
  return Array.from({ length: count }, (_, i) =>
    i === count - 1
      ? Math.round((baseValue + remainder) * 100) / 100 // Última parcela absorve o resto
      : baseValue
  );
}

/**
 * Gera prévia completa de parcelas com datas e valores
 *
 * @param totalAmount Valor total
 * @param count Quantidade de parcelas
 * @param firstDueDate Data do primeiro vencimento
 * @returns Array de InstallmentPreview
 */
export function generateInstallmentPreview(
  totalAmount: number,
  count: number,
  firstDueDate: string
): InstallmentPreview[] {
  const dates = generateInstallmentDueDates(firstDueDate, count);
  const amounts = calculateInstallmentAmounts(totalAmount, count);

  return dates.map((date, i) => ({
    number: i + 1,
    dueDate: date,
    amount: amounts[i],
  }));
}

/**
 * Formata label de parcela de forma consistente
 * Ex: "Parcela 3/6" ou "Fornecedor XYZ - 3/6"
 *
 * @param installmentNumberOrParent Número da parcela OU objeto da conta-pai
 * @param totalInstallmentsOrInstallment Total de parcelas OU objeto da parcela
 * @returns String formatada
 */
export function formatInstallmentLabel(
  installmentNumberOrParent:
    | number
    | { description: string }
    | null
    | undefined,
  totalInstallmentsOrInstallment?:
    | number
    | {
        installmentNumber: number;
        totalInstallments: number;
      }
): string {
  // Formato simples: formatInstallmentLabel(3, 6) => "Parcela 3/6"
  if (
    typeof installmentNumberOrParent === 'number' &&
    typeof totalInstallmentsOrInstallment === 'number'
  ) {
    return `Parcela ${installmentNumberOrParent}/${totalInstallmentsOrInstallment}`;
  }

  // Formato completo: formatInstallmentLabel(parent, installment)
  if (
    typeof installmentNumberOrParent === 'object' &&
    typeof totalInstallmentsOrInstallment === 'object'
  ) {
    const parent = installmentNumberOrParent;
    const installment = totalInstallmentsOrInstallment;

    // Sempre mostrar o número da parcela se disponível
    if (installment.installmentNumber && installment.totalInstallments) {
      return `Parcela ${installment.installmentNumber}/${installment.totalInstallments}`;
    }

    // Fallback para descrição do pai
    const base = parent?.description || 'Pagamento único';
    const fraction =
      installment.totalInstallments && installment.totalInstallments > 1
        ? ` - ${installment.installmentNumber || '?'}/${installment.totalInstallments}`
        : '';
    return `${base}${fraction}`;
  }

  // Fallback genérico
  return 'Parcela';
}

/**
 * Calcula progresso de pagamento de parcelas
 *
 * @param installments Array de parcelas com status e número
 * @returns Objeto com contadores, percentual e lista de parcelas pagas
 */
export function formatInstallmentProgress(
  installments: Array<{ status: AccountStatus; installmentNumber: number }>
): InstallmentProgress {
  const paidInstallments = installments
    .filter(i => i.status === 'PAID')
    .map(i => i.installmentNumber)
    .sort((a, b) => a - b);

  const paidCount = paidInstallments.length;
  const totalCount = installments.length;
  const percentage =
    totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  return {
    paidCount,
    totalCount,
    percentage,
    paidInstallments,
  };
}

// Alias para compatibilidade
export const computeInstallmentProgress = formatInstallmentProgress;

/**
 * Computa status agregado da conta-pai baseado nos status das parcelas
 * Regras:
 * - Se qualquer parcela está OVERDUE → OVERDUE (prioridade máxima)
 * - Se todas parcelas estão PAID → PAID
 * - Se alguma parcela está PAID ou PARTIAL → PARTIAL
 * - Caso contrário → PENDING
 *
 * @param installments Array de parcelas com status
 * @returns Status agregado
 */
export function computeParentStatus(
  installments: Array<{ status: AccountStatus }>
): AccountStatus {
  if (!installments || installments.length === 0) {
    return 'PENDING';
  }

  const statuses = installments.map(i => i.status);

  // OVERDUE tem prioridade máxima
  if (statuses.includes('OVERDUE')) {
    return 'OVERDUE';
  }

  // Todas pagas
  if (statuses.every(s => s === 'PAID')) {
    return 'PAID';
  }

  // Alguma paga ou parcialmente paga
  if (statuses.some(s => s === 'PAID' || s === 'PARTIAL')) {
    return 'PARTIAL';
  }

  return 'PENDING';
}

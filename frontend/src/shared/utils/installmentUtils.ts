import { addMonths } from 'date-fns';
import { AccountStatus } from './accountUtils';

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
 * Usa a mesma lógica do backend para consistência
 *
 * @param totalAmount Valor total
 * @param count Quantidade de parcelas
 * @returns Array de valores das parcelas
 */
export function calculateInstallmentAmounts(
  totalAmount: number,
  count: number
): number[] {
  // Usar a mesma lógica do backend: dividir e arredondar para baixo
  const baseValue = Math.floor((totalAmount / count) * 100) / 100;
  // Calcular resto para a última parcela
  const remainder = Math.round((totalAmount - baseValue * count) * 100) / 100;

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

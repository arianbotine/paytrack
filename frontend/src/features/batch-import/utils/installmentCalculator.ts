import { addMonths, format } from 'date-fns';

/**
 * Calcula as datas de vencimento mensais a partir da primeira data.
 * Reutiliza a lógica de InstallmentPreview para consistência.
 *
 * @param firstDueDate - Data do primeiro vencimento
 * @param installmentCount - Quantidade de parcelas (1-120)
 * @returns Array de datas no formato YYYY-MM-DD
 */
export function calculateDueDates(
  firstDueDate: Date,
  installmentCount: number
): string[] {
  const dueDates: string[] = [];

  for (let i = 0; i < installmentCount; i++) {
    const dueDate = addMonths(firstDueDate, i);
    dueDates.push(format(dueDate, 'yyyy-MM-dd'));
  }

  return dueDates;
}

/**
 * Calcula apenas as datas das parcelas subsequentes, mantendo a primeira data intacta.
 * Útil quando o usuário já definiu a primeira data e só quer recalcular as demais.
 *
 * @param firstDueDate - Data do primeiro vencimento (mantida intacta)
 * @param installmentCount - Quantidade de parcelas (1-120)
 * @returns Array de datas onde o primeiro elemento é firstDueDate e os demais são calculados
 */
export function calculateSubsequentDueDates(
  firstDueDate: string,
  installmentCount: number
): string[] {
  const dueDates: string[] = [firstDueDate]; // Mantém a primeira data intacta

  const firstDate = new Date(firstDueDate);

  // Calcula apenas as parcelas subsequentes
  for (let i = 1; i < installmentCount; i++) {
    const dueDate = addMonths(firstDate, i);
    dueDates.push(format(dueDate, 'yyyy-MM-dd'));
  }

  return dueDates;
}

/**
 * Valida se as datas estão em ordem crescente (requisito do backend).
 *
 * @param dueDates - Array de datas no formato YYYY-MM-DD
 * @returns true se estão em ordem crescente, false caso contrário
 */
export function areDatesInOrder(dueDates: string[]): boolean {
  for (let i = 1; i < dueDates.length; i++) {
    if (dueDates[i] <= dueDates[i - 1]) {
      return false;
    }
  }
  return true;
}

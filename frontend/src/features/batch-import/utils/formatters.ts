/**
 * Utilitário para formatação de valores monetários.
 * Centraliza a lógica de formatação para reutilização.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Utilitário para formatar datas em formato local.
 */
export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
}

/**
 * Utilitário para formatar data e hora.
 */
export function formatDateTime(datetime: string): string {
  return new Date(datetime).toLocaleString('pt-BR');
}

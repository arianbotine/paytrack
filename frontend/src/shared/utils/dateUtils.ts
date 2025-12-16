/**
 * Utilitários para manipulação de datas seguindo a premissa:
 * - Backend trabalha apenas com UTC (sem conversões)
 * - Frontend converte datas para UTC antes de enviar ao backend
 * - Frontend converte datas UTC para fuso local antes de exibir
 */

/**
 * Retorna a data no formato YYYY-MM-DD para enviar ao backend.
 * O backend interpreta como meio-dia UTC para evitar problemas de fuso horário.
 *
 * @param dateString - String de data no formato 'YYYY-MM-DD' do input HTML
 * @returns String no formato 'YYYY-MM-DD' para enviar ao backend
 */
export function toUTC(dateString: string): string {
  // Simplesmente retorna a data como está - backend faz a interpretação como meio-dia UTC
  return dateString || '';
}

/**
 * Extrai a parte da data de uma string ISO UTC (recebida do backend).
 * Retorna no formato 'YYYY-MM-DD' para inputs HTML date.
 *
 * @param utcString - String de data em formato ISO UTC (ex: "2025-12-15T12:00:00.000Z")
 * @returns String no formato 'YYYY-MM-DD' para input HTML date
 */
export function toLocalDateInput(utcString: string): string {
  if (!utcString) return '';

  // Interpreta a string ISO como UTC e extrai a data UTC
  const date = new Date(utcString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatLocalDate(
  utcString: string,
  formatOptions?: Intl.DateTimeFormatOptions
): string {
  if (!utcString) return '';

  const date = new Date(utcString);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  return new Intl.DateTimeFormat('pt-BR', {
    ...defaultOptions,
    ...formatOptions,
  }).format(date);
}

/**
 * Converte uma data UTC para objeto Date no fuso horário local.
 * Útil para cálculos de datas (ex: diferença de dias).
 *
 * @param utcString - String de data em formato ISO UTC
 * @returns Objeto Date
 */
export function parseUTCDate(utcString: string): Date {
  if (!utcString) return new Date();
  return new Date(utcString);
}

/**
 * Obtém a data atual no fuso horário local e converte para UTC.
 * Útil para definir valor padrão em formulários.
 *
 * @returns String no formato 'YYYY-MM-DD' da data atual
 */
export function getTodayLocalInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Obtém a data/hora atual em UTC para enviar ao backend.
 *
 * @returns String ISO em UTC
 */
export function getNowUTC(): string {
  return new Date().toISOString();
}

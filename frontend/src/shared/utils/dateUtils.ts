/**
 * Utilitários para manipulação de datas seguindo a premissa:
 * - Backend trabalha apenas com UTC (sem conversões)
 * - Frontend converte datas para UTC antes de enviar ao backend
 * - Frontend converte datas UTC para fuso local antes de exibir
 */

/**
 * Converte uma data local (do input do usuário) para UTC (para enviar ao backend).
 * Exemplo: Se o usuário seleciona 15/12/2025, enviamos "2025-12-15T00:00:00.000Z"
 *
 * @param dateString - String de data no formato 'YYYY-MM-DD' do input HTML
 * @returns String ISO em UTC para enviar ao backend
 */
export function toUTC(dateString: string): string {
  if (!dateString) return '';

  // Garante que a data seja interpretada como local (sem considerar timezone)
  // e então converte para UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  return localDate.toISOString();
}

/**
 * Converte uma data UTC (recebida do backend) para data local (para exibir ao usuário).
 * Retorna no formato 'YYYY-MM-DD' para inputs HTML date.
 *
 * @param utcString - String de data em formato ISO UTC (ex: "2025-12-15T00:00:00.000Z")
 * @returns String no formato 'YYYY-MM-DD' para input HTML date
 */
export function toLocalDateInput(utcString: string): string {
  if (!utcString) return '';

  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Converte uma data UTC (recebida do backend) para formato de exibição local.
 * Retorna no formato 'dd/MM/yyyy' para exibir ao usuário.
 *
 * @param utcString - String de data em formato ISO UTC
 * @param formatOptions - Opções de formatação (opcional)
 * @returns String formatada para exibição (ex: "15/12/2025")
 */
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

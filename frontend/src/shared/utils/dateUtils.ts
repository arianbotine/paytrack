/**
 * Utilitários para manipulação de datas
 *
 * Para campos de data apenas (dueDate):
 * - Não há conversão de timezone
 * - Enviar/receber no formato 'YYYY-MM-DD'
 * - Backend trata como date-only (@db.Date)
 *
 * Para campos de data/hora (paymentDate):
 * - Conversão de timezone aplicada
 * - Enviar/receber ISO string com hora
 */

/**
 * Obtém a data atual no fuso horário local para inputs de data.
 * Retorna no formato 'YYYY-MM-DD'.
 */
export function getTodayLocalInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data ISO para exibição (dd/MM/yyyy).
 * Para campos date-only, extrai apenas a parte da data.
 */
export function formatLocalDate(
  dateString: string,
  formatOptions?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '';

  // Para date-only, extrai apenas a parte da data
  const datePart = dateString.split('T')[0];
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  return new Intl.DateTimeFormat('pt-BR', {
    ...defaultOptions,
    ...formatOptions,
  }).format(new Date(year, month - 1, day));
}

/**
 * Converte uma data/hora local (do input datetime-local) para UTC ISO string.
 */
export function toUTCDatetime(localDatetimeString: string): string {
  if (!localDatetimeString) return '';
  const localDate = new Date(localDatetimeString);
  return localDate.toISOString();
}

/**
 * Converte uma string ISO UTC para formato local para input datetime-local.
 */
export function toLocalDatetimeInput(utcString: string): string {
  if (!utcString) return '';
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formata uma data/hora UTC para exibição no fuso local.
 */
export function formatLocalDatetime(
  utcString: string,
  formatOptions?: Intl.DateTimeFormatOptions
): string {
  if (!utcString) return '';
  const date = new Date(utcString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  return new Intl.DateTimeFormat('pt-BR', {
    ...defaultOptions,
    ...formatOptions,
  }).format(date);
}

/**
 * Formata uma data/hora UTC de forma relativa e intuitiva.
 */
export function formatRelativeDatetime(utcString: string): string {
  if (!utcString) return '';
  const date = new Date(utcString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'agora mesmo';
  if (diffMinutes < 60)
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

  if (diffDays === 1)
    return `ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} dias atrás`;

  return formatLocalDatetime(utcString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Obtém a data/hora atual no fuso local para input datetime-local.
 */
export function getNowLocalDatetimeInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

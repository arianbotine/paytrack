import type {
  PaymentsReportResponse,
  PaymentsReportDetailsResponse,
  ReportFilters,
} from '../types';

/**
 * Formata um número como moeda brasileira
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma data para o padrão brasileiro
 * Trata a data como local (não UTC) para evitar problemas de timezone
 */
function formatDate(dateString: string): string {
  // Se a string está no formato YYYY-MM-DD, parsear como data local
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(
      Number.parseInt(year),
      Number.parseInt(month) - 1,
      Number.parseInt(day)
    );
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Para outros formatos, usar parsing padrão
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata o tipo de agrupamento para texto legível
 */
function formatGroupBy(groupBy?: string): string {
  const labels: Record<string, string> = {
    day: 'Por dia',
    week: 'Por semana',
    month: 'Por mês',
  };
  return labels[groupBy || 'month'] || 'Por mês';
}

/**
 * Converte array de dados para formato CSV
 */
function convertToCSV(data: string[][]): string {
  return data
    .map(row =>
      row
        .map(cell => {
          // Escapar aspas duplas e envolver em aspas se contiver vírgula, quebra de linha ou aspas
          const cellStr = String(cell);
          if (
            cellStr.includes(',') ||
            cellStr.includes('\n') ||
            cellStr.includes('"')
          ) {
            return `"${cellStr.replaceAll('"', '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Faz download de um arquivo CSV
 */
function downloadCSV(content: string, filename: string): void {
  // Adicionar BOM para UTF-8 (garante que o Excel reconheça caracteres especiais)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSummaryRows(data: PaymentsReportResponse): string[][] {
  return [
    ['RESUMO DO PERÍODO SELECIONADO'],
    ['Métrica', 'Valor'],
    ['Total Pago', formatCurrency(data.totals.payables.current)],
    ['Total Recebido', formatCurrency(data.totals.receivables.current)],
    ['Saldo Líquido', formatCurrency(data.totals.netBalance.current)],
    ['Total de Transações', data.totals.transactions.current.toString()],
    [''],
  ];
}

function buildComparisonRows(data: PaymentsReportResponse): string[][] {
  return [
    ['COMPARAÇÃO COM PERÍODO ANTERIOR'],
    ['Métrica', 'Período Atual', 'Período Anterior', 'Variação (%)'],
    [
      'Total Pago',
      formatCurrency(data.totals.payables.current),
      formatCurrency(data.totals.payables.previous),
      `${data.totals.payables.variance.toFixed(2)}%`,
    ],
    [
      'Total Recebido',
      formatCurrency(data.totals.receivables.current),
      formatCurrency(data.totals.receivables.previous),
      `${data.totals.receivables.variance.toFixed(2)}%`,
    ],
    [
      'Saldo Líquido',
      formatCurrency(data.totals.netBalance.current),
      formatCurrency(data.totals.netBalance.previous),
      `${data.totals.netBalance.variance.toFixed(2)}%`,
    ],
    [
      'Total de Transações',
      data.totals.transactions.current.toString(),
      data.totals.transactions.previous.toString(),
      `${data.totals.transactions.variance.toFixed(2)}%`,
    ],
    [''],
  ];
}

function buildTimeSeriesRows(
  data: PaymentsReportResponse,
  groupBy?: string
): string[][] {
  if (!data.timeSeries || data.timeSeries.length === 0) return [];
  return [
    [`EVOLUÇÃO TEMPORAL (${formatGroupBy(groupBy).toUpperCase()})`],
    ['Período', 'Pagamentos', 'Recebimentos', 'Saldo Líquido', 'Transações'],
    ...data.timeSeries.map(item => {
      const netBalance = item.receivables - item.payables;
      return [
        formatDate(item.period),
        formatCurrency(item.payables),
        formatCurrency(item.receivables),
        formatCurrency(netBalance),
        item.count.toString(),
      ];
    }),
    [''],
  ];
}

function buildCategoryBreakdownRows(data: PaymentsReportResponse): string[][] {
  if (data.breakdown.byCategory.data.length === 0) return [];
  return [
    ['DETALHAMENTO POR CATEGORIA'],
    ['Categoria', 'Valor', 'Percentual', 'Transações'],
    ...data.breakdown.byCategory.data.map(item => [
      item.name,
      formatCurrency(item.amount),
      `${item.percentage.toFixed(2)}%`,
      item.count.toString(),
    ]),
    [''],
  ];
}

function buildPaymentMethodBreakdownRows(
  data: PaymentsReportResponse
): string[][] {
  if (data.breakdown.byPaymentMethod.data.length === 0) return [];
  return [
    ['DETALHAMENTO POR MÉTODO DE PAGAMENTO'],
    ['Método', 'Valor', 'Percentual', 'Transações'],
    ...data.breakdown.byPaymentMethod.data.map(item => [
      item.name,
      formatCurrency(item.amount),
      `${item.percentage.toFixed(2)}%`,
      item.count.toString(),
    ]),
  ];
}

/**
 * Exporta o relatório de pagamentos para CSV
 */
export function exportPaymentsReportToCSV(
  data: PaymentsReportResponse,
  filters: ReportFilters,
  filterLabels?: {
    categories?: string[];
    tags?: string[];
    vendors?: string[];
    customers?: string[];
  }
): void {
  const csvData: string[][] = [
    ['RELATÓRIO DE PAGAMENTOS - DADOS DO PERÍODO SELECIONADO'],
    [
      'Período:',
      `${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
    ],
    ['Agrupamento:', formatGroupBy(filters.groupBy)],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [''],
    ...buildFilterRows(filters, filterLabels),
    ...buildSummaryRows(data),
    ...buildComparisonRows(data),
    ...buildTimeSeriesRows(data, filters.groupBy),
    ...buildCategoryBreakdownRows(data),
    ...buildPaymentMethodBreakdownRows(data),
  ];

  const csvContent = convertToCSV(csvData);
  const filename = `relatorio-pagamentos_${filters.startDate}_${filters.endDate}.csv`;
  downloadCSV(csvContent, filename);
}

const TYPE_LABELS: Record<string, string> = {
  payable: 'Pagamento',
  receivable: 'Recebimento',
  mixed: 'Misto',
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BANK_TRANSFER: 'Transferência Bancária',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CHECK: 'Cheque',
  ACCOUNT_DEBIT: 'Débito em Conta',
  OTHER: 'Outro',
};

function buildFilterRows(
  filters: ReportFilters,
  filterLabels?: {
    categories?: string[];
    tags?: string[];
    vendors?: string[];
    customers?: string[];
  }
): string[][] {
  const rows: string[][] = [];
  const hasFilters =
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.vendorIds && filters.vendorIds.length > 0) ||
    (filters.customerIds && filters.customerIds.length > 0);

  if (!hasFilters) return rows;

  rows.push(['FILTROS APLICADOS']);
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    rows.push([
      'Categorias:',
      filterLabels?.categories?.join(', ') ||
        `${filters.categoryIds.length} selecionada(s)`,
    ]);
  }
  if (filters.tagIds && filters.tagIds.length > 0) {
    rows.push([
      'Tags:',
      filterLabels?.tags?.join(', ') ||
        `${filters.tagIds.length} selecionada(s)`,
    ]);
  }
  if (filters.vendorIds && filters.vendorIds.length > 0) {
    rows.push([
      'Fornecedores:',
      filterLabels?.vendors?.join(', ') ||
        `${filters.vendorIds.length} selecionado(s)`,
    ]);
  }
  if (filters.customerIds && filters.customerIds.length > 0) {
    rows.push([
      'Clientes:',
      filterLabels?.customers?.join(', ') ||
        `${filters.customerIds.length} selecionado(s)`,
    ]);
  }
  rows.push(['']);
  return rows;
}

/**
 * Exporta a lista detalhada de transações do relatório de pagamentos para CSV
 */
export function exportPaymentsReportDetailsToCSV(
  data: PaymentsReportDetailsResponse,
  filters: ReportFilters,
  filterLabels?: {
    categories?: string[];
    tags?: string[];
    vendors?: string[];
    customers?: string[];
  }
): void {
  const header: string[][] = [
    ['RELATÓRIO DE PAGAMENTOS - DETALHAMENTO DE TRANSAÇÕES'],
    [
      'Período:',
      `${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
    ],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [''],
    ...buildFilterRows(filters, filterLabels),
    [
      'Data',
      'Tipo',
      'Fornecedor / Cliente',
      'Tags',
      'Categoria',
      'Método',
      'Valor',
      'Referência',
      'Observações',
    ],
  ];

  const rows = data.data.map(item => [
    formatDate(item.paymentDate),
    TYPE_LABELS[item.type] || item.type,
    item.vendorName || item.customerName || '',
    item.tags.map(t => t.name).join(', '),
    item.categoryName || '',
    METHOD_LABELS[item.paymentMethod] || item.paymentMethod,
    formatCurrency(item.amount),
    item.reference || '',
    item.notes || '',
  ]);

  const csvContent = convertToCSV([...header, ...rows]);
  const filename = `detalhamento-pagamentos_${filters.startDate}_${filters.endDate}.csv`;
  downloadCSV(csvContent, filename);
}

import type { PaymentsReportResponse, ReportFilters } from '../types';

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
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
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
            return `"${cellStr.replace(/"/g, '""')}"`;
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
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const csvData: string[][] = [];

  // Cabeçalho do relatório
  csvData.push(['RELATÓRIO DE PAGAMENTOS - DADOS DO PERÍODO SELECIONADO']);
  csvData.push([
    'Período:',
    `${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
  ]);
  csvData.push(['Agrupamento:', formatGroupBy(filters.groupBy)]);
  csvData.push(['Gerado em:', new Date().toLocaleString('pt-BR')]);
  csvData.push(['']); // Linha vazia

  // Filtros aplicados (se houver)
  const hasFilters =
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.vendorIds && filters.vendorIds.length > 0) ||
    (filters.customerIds && filters.customerIds.length > 0);

  if (hasFilters) {
    csvData.push(['FILTROS APLICADOS']);

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      csvData.push([
        'Categorias:',
        filterLabels?.categories?.join(', ') ||
          `${filters.categoryIds.length} selecionada(s)`,
      ]);
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      csvData.push([
        'Tags:',
        filterLabels?.tags?.join(', ') ||
          `${filters.tagIds.length} selecionada(s)`,
      ]);
    }

    if (filters.vendorIds && filters.vendorIds.length > 0) {
      csvData.push([
        'Fornecedores:',
        filterLabels?.vendors?.join(', ') ||
          `${filters.vendorIds.length} selecionado(s)`,
      ]);
    }

    if (filters.customerIds && filters.customerIds.length > 0) {
      csvData.push([
        'Clientes:',
        filterLabels?.customers?.join(', ') ||
          `${filters.customerIds.length} selecionado(s)`,
      ]);
    }

    csvData.push(['']); // Linha vazia
  }

  // Resumo - Totais (apenas período atual - dados exibidos na tela)
  csvData.push(['RESUMO DO PERÍODO SELECIONADO']);
  csvData.push(['Métrica', 'Valor']);
  csvData.push(['Total Pago', formatCurrency(data.totals.payables.current)]);
  csvData.push([
    'Total Recebido',
    formatCurrency(data.totals.receivables.current),
  ]);
  csvData.push([
    'Saldo Líquido',
    formatCurrency(data.totals.netBalance.current),
  ]);
  csvData.push([
    'Total de Transações',
    data.totals.transactions.current.toString(),
  ]);
  csvData.push(['']); // Linha vazia

  // Comparação com período anterior
  csvData.push(['COMPARAÇÃO COM PERÍODO ANTERIOR']);
  csvData.push([
    'Métrica',
    'Período Atual',
    'Período Anterior',
    'Variação (%)',
  ]);
  csvData.push([
    'Total Pago',
    formatCurrency(data.totals.payables.current),
    formatCurrency(data.totals.payables.previous),
    `${data.totals.payables.variance.toFixed(2)}%`,
  ]);
  csvData.push([
    'Total Recebido',
    formatCurrency(data.totals.receivables.current),
    formatCurrency(data.totals.receivables.previous),
    `${data.totals.receivables.variance.toFixed(2)}%`,
  ]);
  csvData.push([
    'Saldo Líquido',
    formatCurrency(data.totals.netBalance.current),
    formatCurrency(data.totals.netBalance.previous),
    `${data.totals.netBalance.variance.toFixed(2)}%`,
  ]);
  csvData.push([
    'Total de Transações',
    data.totals.transactions.current.toString(),
    data.totals.transactions.previous.toString(),
    `${data.totals.transactions.variance.toFixed(2)}%`,
  ]);
  csvData.push(['']); // Linha vazia

  // Série Temporal
  if (data.timeSeries && data.timeSeries.length > 0) {
    csvData.push([
      `EVOLUÇÃO TEMPORAL (${formatGroupBy(filters.groupBy).toUpperCase()})`,
    ]);
    csvData.push([
      'Período',
      'Pagamentos',
      'Recebimentos',
      'Saldo Líquido',
      'Transações',
    ]);
    data.timeSeries.forEach(item => {
      const netBalance = item.receivables - item.payables;
      csvData.push([
        formatDate(item.period),
        formatCurrency(item.payables),
        formatCurrency(item.receivables),
        formatCurrency(netBalance),
        item.count.toString(),
      ]);
    });
    csvData.push(['']); // Linha vazia
  }

  // Breakdown por Categoria
  if (data.breakdown.byCategory.data.length > 0) {
    csvData.push(['DETALHAMENTO POR CATEGORIA']);
    csvData.push(['Categoria', 'Valor', 'Percentual', 'Transações']);
    data.breakdown.byCategory.data.forEach(item => {
      csvData.push([
        item.name,
        formatCurrency(item.amount),
        `${item.percentage.toFixed(2)}%`,
        item.count.toString(),
      ]);
    });
    csvData.push(['']); // Linha vazia
  }

  // Breakdown por Método de Pagamento
  if (data.breakdown.byPaymentMethod.data.length > 0) {
    csvData.push(['DETALHAMENTO POR MÉTODO DE PAGAMENTO']);
    csvData.push(['Método', 'Valor', 'Percentual', 'Transações']);
    data.breakdown.byPaymentMethod.data.forEach(item => {
      csvData.push([
        item.name,
        formatCurrency(item.amount),
        `${item.percentage.toFixed(2)}%`,
        item.count.toString(),
      ]);
    });
  }

  // Converter para CSV e fazer download
  const csvContent = convertToCSV(csvData);
  const filename = `relatorio-pagamentos_${filters.startDate}_${filters.endDate}.csv`;
  downloadCSV(csvContent, filename);
}

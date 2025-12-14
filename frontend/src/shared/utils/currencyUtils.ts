/**
 * Currency formatting utilities
 */

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  const cleaned = value.replaceAll(/[R$\s.]/g, '').replace(',', '.');
  return Number.parseFloat(cleaned) || 0;
};

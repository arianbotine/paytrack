import type { AccountStatus } from './types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

export function translateRole(role: string): string {
  const map: Record<string, string> = {
    OWNER: 'Proprietário',
    ADMIN: 'Administrador',
    ACCOUNTANT: 'Contador',
    VIEWER: 'Visualizador',
  };
  return map[role] ?? role;
}

export function translatePaymentMethod(method: string): string {
  const map: Record<string, string> = {
    PIX: 'PIX',
    CASH: 'Dinheiro',
    BANK_TRANSFER: 'Transferência',
    CREDIT_CARD: 'Cartão de Crédito',
    DEBIT_CARD: 'Cartão de Débito',
    BOLETO: 'Boleto',
    CHECK: 'Cheque',
    ACCOUNT_DEBIT: 'Débito em Conta',
    OTHER: 'Outro',
  };
  return map[method] ?? method;
}

export const STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
};

export const STATUS_LABELS_RECEIVABLE: Record<AccountStatus, string> = {
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Recebido',
};

export const PAYMENT_METHODS: Array<{
  value: string;
  label: string;
  icon: string;
}> = [
  { value: 'PIX', label: 'PIX', icon: 'lightning-bolt' },
  { value: 'CASH', label: 'Dinheiro', icon: 'cash' },
  { value: 'BANK_TRANSFER', label: 'Transferência', icon: 'bank-transfer' },
  { value: 'CREDIT_CARD', label: 'Crédito', icon: 'credit-card' },
  { value: 'DEBIT_CARD', label: 'Débito', icon: 'credit-card-outline' },
  { value: 'BOLETO', label: 'Boleto', icon: 'barcode' },
  { value: 'CHECK', label: 'Cheque', icon: 'checkbook' },
  { value: 'ACCOUNT_DEBIT', label: 'Déb. Conta', icon: 'bank-outline' },
  { value: 'OTHER', label: 'Outro', icon: 'dots-horizontal' },
];

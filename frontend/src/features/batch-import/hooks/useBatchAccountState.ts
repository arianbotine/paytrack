import { useMemo } from 'react';
import { BatchAccount, AccountType } from '../types';
import type { Vendor, Category } from '../../payables/types';
import type { Customer } from '../../receivables/types';

/**
 * Hook customizado que encapsula toda a lógica de estado derivado e computações.
 * Centraliza cálculos e transformações de dados.
 */
export function useBatchAccountState(
  account: BatchAccount,
  accountType: AccountType,
  vendors: Vendor[],
  customers: Customer[],
  categories: Category[],
  hasValidationErrors: boolean
): {
  isDisabled: boolean;
  isError: boolean;
  isProcessing: boolean;
  isSuccess: boolean;
  backgroundColor: string;
  filteredCategories: Category[];
  selectedEntity: Vendor | Customer | undefined;
  entityLabel: string;
  entityList: Vendor[] | Customer[];
  isAccountValid: boolean;
  totalPaymentAmount: number;
  currentPaymentLabels: {
    title: string;
    verb: string;
    statusVerb: string;
    action: string;
  };
} {
  // Status flags
  const isDisabled = useMemo(
    () => account.status === 'processing' || account.status === 'success',
    [account.status]
  );

  const isError: boolean = account.status === 'error';
  const isProcessing: boolean = account.status === 'processing';
  const isSuccess: boolean = account.status === 'success';

  // Background color baseado no status
  const backgroundColor = useMemo<string>(() => {
    if (isProcessing) return 'warning.light';
    if (isSuccess) return 'success.light';
    if (isError) return 'error.light';
    return 'background.paper';
  }, [isProcessing, isSuccess, isError]);

  // Categorias filtradas por tipo
  const filteredCategories = useMemo(
    () =>
      categories.filter(
        cat =>
          cat.type === (accountType === 'payable' ? 'PAYABLE' : 'RECEIVABLE')
      ),
    [categories, accountType]
  );

  // Entidade selecionada (vendor ou customer)
  const selectedEntity = useMemo(
    () =>
      accountType === 'payable'
        ? vendors.find(v => v.id === account.vendorId)
        : customers.find(c => c.id === account.customerId),
    [accountType, vendors, customers, account.vendorId, account.customerId]
  );

  // Labels contextuais
  const entityLabel = accountType === 'payable' ? 'Credor' : 'Devedor';
  const entityList = accountType === 'payable' ? vendors : customers;

  // Validação de conta completa
  const isAccountValid = useMemo<boolean>(() => {
    const hasAmount = account.amount > 0;
    const hasDueDate = Boolean(
      account.dueDates &&
      account.dueDates[0] &&
      account.dueDates[0].trim() !== ''
    );
    const hasEntity =
      accountType === 'payable' ? !!account.vendorId : !!account.customerId;
    const noErrors = !hasValidationErrors;

    return hasAmount && hasDueDate && hasEntity && noErrors;
  }, [
    account.amount,
    account.dueDates,
    account.vendorId,
    account.customerId,
    accountType,
    hasValidationErrors,
  ]);

  // Cálculo do valor total do pagamento
  const totalPaymentAmount = useMemo(() => {
    const selected = account.payment?.installmentNumbers || [];
    if (!selected.length) return 0;

    const installmentAmount = account.amount / account.installmentCount;
    return selected.length * installmentAmount;
  }, [
    account.payment?.installmentNumbers,
    account.amount,
    account.installmentCount,
  ]);

  // Labels de pagamento/recebimento
  const paymentLabels = useMemo(
    () => ({
      payable: {
        title: 'Registrar Pagamento?',
        verb: 'pagar',
        statusVerb: 'pagas',
        action: 'Pagamento',
      },
      receivable: {
        title: 'Registrar Recebimento?',
        verb: 'receber',
        statusVerb: 'recebidas',
        action: 'Recebimento',
      },
    }),
    []
  );

  const currentPaymentLabels = paymentLabels[accountType];

  return {
    // Status
    isDisabled,
    isError,
    isProcessing,
    isSuccess,
    backgroundColor,

    // Dados filtrados/derivados
    filteredCategories,
    selectedEntity,
    entityLabel,
    entityList,

    // Validações e computações
    isAccountValid,
    totalPaymentAmount,
    currentPaymentLabels,
  };
}

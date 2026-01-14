import { useCallback } from 'react';
import { BatchAccount } from '../types';
import {
  calculateDueDates,
  calculateSubsequentDueDates,
} from '../utils/installmentCalculator';
import {
  getTodayLocalInput,
  getNowLocalDatetimeInput,
} from '../../../shared/utils/dateUtils';

/**
 * Hook customizado que encapsula toda a lógica de handlers para manipulação de contas em lote.
 * Separa a lógica de negócio da apresentação.
 */
export function useBatchAccountHandlers(
  account: BatchAccount,
  onUpdate: (accountId: string, updates: Partial<BatchAccount>) => void
) {
  /**
   * Handler genérico para atualizar qualquer campo da conta
   */
  const handleFieldChange = useCallback(
    (field: keyof BatchAccount, value: any) => {
      onUpdate(account.id, { [field]: value });
    },
    [account.id, onUpdate]
  );

  /**
   * Handler especializado para mudança no número de parcelas.
   * Preserva a primeira data e recalcula as subsequentes.
   */
  const handleInstallmentCountChange = useCallback(
    (newCount: number) => {
      const preservedFirstDate = account.dueDates[0];

      if (!preservedFirstDate) {
        const defaultDate = getTodayLocalInput();
        const newDueDates =
          newCount === 1
            ? [defaultDate]
            : calculateSubsequentDueDates(defaultDate, newCount);

        onUpdate(account.id, {
          installmentCount: newCount,
          dueDates: newDueDates,
        });
        return;
      }

      const newDueDates =
        newCount === 1
          ? [preservedFirstDate]
          : calculateSubsequentDueDates(preservedFirstDate, newCount);

      onUpdate(account.id, {
        installmentCount: newCount,
        dueDates: newDueDates,
      });
    },
    [account.id, account.dueDates, onUpdate]
  );

  /**
   * Handler especializado para mudança na primeira data de vencimento.
   * Recalcula todas as datas mantendo a nova primeira data.
   */
  const handleFirstDueDateChange = useCallback(
    (newFirstDate: string) => {
      if (!newFirstDate) {
        onUpdate(account.id, { dueDates: [newFirstDate] });
        return;
      }

      const calculatedDates = calculateDueDates(
        new Date(newFirstDate),
        account.installmentCount
      );

      onUpdate(account.id, { dueDates: calculatedDates });
    },
    [account.id, account.installmentCount, onUpdate]
  );

  /**
   * Handler para toggle de parcelas no registro de pagamento
   */
  const handleTogglePaymentInstallment = useCallback(
    (installmentNumber: number) => {
      const current = account.payment?.installmentNumbers || [];
      const isSelected = current.includes(installmentNumber);

      const newNumbers = isSelected
        ? current.filter(n => n !== installmentNumber)
        : [...current, installmentNumber].sort((a, b) => a - b);

      handleFieldChange('payment', {
        installmentNumbers: newNumbers,
        paymentDate: account.payment?.paymentDate || getNowLocalDatetimeInput(),
        paymentMethod: account.payment?.paymentMethod || '',
        reference: account.payment?.reference,
        notes: account.payment?.notes,
      });
    },
    [account.payment, handleFieldChange]
  );

  /**
   * Handler para atualizar campos do pagamento
   */
  const handlePaymentFieldChange = useCallback(
    (field: string, value: any) => {
      handleFieldChange('payment', {
        installmentNumbers: account.payment?.installmentNumbers || [],
        paymentDate: account.payment?.paymentDate || getNowLocalDatetimeInput(),
        paymentMethod: account.payment?.paymentMethod || '',
        reference: account.payment?.reference,
        notes: account.payment?.notes,
        [field]: value,
      });
    },
    [account.payment, handleFieldChange]
  );

  return {
    handleFieldChange,
    handleInstallmentCountChange,
    handleFirstDueDateChange,
    handleTogglePaymentInstallment,
    handlePaymentFieldChange,
  };
}

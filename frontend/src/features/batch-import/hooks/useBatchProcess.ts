import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { BatchAccount, AccountType } from '../types';
import { validateAllAccounts } from '../utils/batchValidation';

interface ProcessResult {
  successCount: number;
  errorCount: number;
  isProcessing: boolean;
}

/**
 * Hook personalizado para processar contas em lote sequencialmente.
 * Envia uma conta por vez para o backend, atualizando o estado visual conforme processa.
 */
export function useBatchProcess(
  accounts: BatchAccount[],
  accountType: AccountType,
  onUpdateAccount: (accountId: string, updates: Partial<BatchAccount>) => void,
  onRemoveAccount: (accountId: string) => void
) {
  const [result, setResult] = useState<ProcessResult>({
    successCount: 0,
    errorCount: 0,
    isProcessing: false,
  });

  // Mutation para criar payable
  const createPayableMutation = useMutation({
    mutationFn: (data: any) => api.post('/payables', data),
  });

  // Mutation para criar receivable
  const createReceivableMutation = useMutation({
    mutationFn: (data: any) => api.post('/receivables', data),
  });

  /**
   * Processa uma única conta e atualiza seu status.
   */
  const processSingleAccount = useCallback(
    async (account: BatchAccount): Promise<boolean> => {
      // Marcar como processando
      onUpdateAccount(account.id, {
        status: 'processing',
        errorMessage: undefined,
      });

      try {
        // Preparar dados para envio ao backend
        const payload: any = {
          amount: account.amount,
          categoryId: account.categoryId || null,
          tagIds: account.tagIds || [],
          notes: account.notes || undefined,
          installmentCount: account.installmentCount,
          dueDates: account.dueDates,
          payment: account.payment,
        };

        // Adicionar vendor ou customer conforme tipo
        if (accountType === 'payable') {
          payload.vendorId = account.vendorId;
          await createPayableMutation.mutateAsync(payload);
        } else {
          payload.customerId = account.customerId;
          await createReceivableMutation.mutateAsync(payload);
        }

        // Marcar como sucesso
        onUpdateAccount(account.id, {
          status: 'success',
          errorMessage: undefined,
        });

        // Aguardar animação de fade-out antes de remover
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Remover da lista
        onRemoveAccount(account.id);

        return true;
      } catch (error: any) {
        // Extrair mensagem de erro do backend
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Erro ao criar conta';

        // Marcar como erro
        onUpdateAccount(account.id, {
          status: 'error',
          errorMessage,
        });

        return false;
      }
    },
    [
      accountType,
      createPayableMutation,
      createReceivableMutation,
      onUpdateAccount,
      onRemoveAccount,
    ]
  );

  /**
   * Processa todas as contas pendentes sequencialmente.
   * Valida tudo antes de iniciar o processamento.
   */
  const processAllAccounts = useCallback(async () => {
    // Filtrar contas pendentes (idle ou error)
    const pendingAccounts = accounts.filter(
      acc => acc.status === 'idle' || acc.status === 'error'
    );

    if (pendingAccounts.length === 0) {
      return;
    }

    // Validar todas as contas antes de processar
    const validation = validateAllAccounts(pendingAccounts, accountType);

    if (!validation.valid) {
      // Marcar contas com erro de validação
      validation.errors.forEach(error => {
        onUpdateAccount(error.accountId, {
          status: 'error',
          errorMessage: error.errors.join('; '),
        });
      });
      return;
    }

    // Iniciar processamento
    setResult(prev => ({
      ...prev,
      isProcessing: true,
      successCount: 0,
      errorCount: 0,
    }));

    let successCount = 0;
    let errorCount = 0;

    // Processar sequencialmente (uma por vez)
    for (const account of pendingAccounts) {
      const success = await processSingleAccount(account);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Atualizar resultado parcial
      setResult(prev => ({
        ...prev,
        successCount,
        errorCount,
      }));
    }

    // Finalizar processamento
    setResult(prev => ({ ...prev, isProcessing: false }));
  }, [accounts, accountType, processSingleAccount, onUpdateAccount]);

  /**
   * Tenta processar novamente uma conta específica que falhou.
   */
  const retryAccount = useCallback(
    async (accountId: string) => {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;

      await processSingleAccount(account);
    },
    [accounts, processSingleAccount]
  );

  return {
    processAllAccounts,
    retryAccount,
    result,
  };
}

import { memo, useState, useCallback, useEffect } from 'react';
import { Box, Grid, Paper, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { QuickCreateCategory } from '../../../shared/components/QuickCreateCategory';
import { QuickCreateTag } from '../../../shared/components/QuickCreateTag';
import {
  useLatestPayableAccount,
  useLatestPayableByCategory,
  useLatestPayablePaymentMethod,
} from '../../payables/hooks/usePayables';
import {
  useLatestReceivableAccount,
  useLatestReceivableByCategory,
  useLatestReceivablePaymentMethod,
} from '../../receivables/hooks/useReceivables';
import { BatchAccount, AccountType } from '../types';
import { useBatchAccountState } from '../hooks/useBatchAccountState';
import { useBatchAccountHandlers } from '../hooks/useBatchAccountHandlers';
import { useBatchAccountValidation } from '../hooks/useBatchAccountValidation';
import { formatCurrency } from '../utils/formatters';
import { BatchAccountHeader } from './BatchAccountHeader';
import { BatchAccountFormFields } from './BatchAccountFormFields';
import { BatchAccountActions } from './BatchAccountActions';
import { BatchAccountInstallmentsPreview } from './BatchAccountInstallmentsPreview';
import { BatchAccountPaymentSection } from './BatchAccountPaymentSection';
import type { Vendor, Category, Tag } from '../../payables/types';
import type { Customer } from '../../receivables/types';
import { getNowLocalDatetimeInput } from '../../../shared/utils/dateUtils';

interface BatchAccountRowProps {
  account: BatchAccount;
  accountType: AccountType;
  vendors: Vendor[];
  customers: Customer[];
  categories: Category[];
  tags: Tag[];
  onUpdate: (accountId: string, updates: Partial<BatchAccount>) => void;
  onRemove: (accountId: string) => void;
  onRetry: (accountId: string) => void;
  onDuplicate?: (accountId: string) => void;
  index?: number;
}

/**
 * Componente principal de linha de conta no cadastro em lote.
 * Refatorado com separação de responsabilidades e componentes menores.
 *
 * Arquitetura:
 * - Custom Hooks: lógica de estado, handlers, validação
 * - Componentes filhos: apresentação de cada seção
 * - Utilitários: formatação e cálculos
 */
export const BatchAccountRow = memo<BatchAccountRowProps>(
  ({
    account,
    accountType,
    vendors,
    customers,
    categories,
    tags,
    onUpdate,
    onRemove,
    onRetry,
    onDuplicate,
    index = 0,
  }) => {
    // Estados locais para UI
    const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
    const [quickTagOpen, setQuickTagOpen] = useState(false);
    const [showInstallments, setShowInstallments] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [amountInputMode, setAmountInputMode] = useState<
      'total' | 'perInstallment'
    >('total');
    const [amountInputValue, setAmountInputValue] = useState<number | null>(
      account.amount || null
    );
    const [manualCategoryEntityId, setManualCategoryEntityId] = useState<
      string | null
    >(null);
    const [autoAppliedCategoryKey, setAutoAppliedCategoryKey] = useState<
      string | null
    >(null);
    const [copiedAmountKey, setCopiedAmountKey] = useState<string | null>(null);
    const [copiedTagsKey, setCopiedTagsKey] = useState<string | null>(null);

    const vendorId = accountType === 'payable' ? account.vendorId : undefined;
    const customerId =
      accountType === 'receivable' ? account.customerId : undefined;
    const entityId = vendorId || customerId;
    const canRegisterPayment = Boolean(entityId) && account.amount > 0;

    const latestPayableAccountQuery = useLatestPayableAccount(
      vendorId,
      accountType === 'payable'
    );
    const latestReceivableAccountQuery = useLatestReceivableAccount(
      customerId,
      accountType === 'receivable'
    );
    const latestPayableByCategoryQuery = useLatestPayableByCategory(
      vendorId,
      account.categoryId,
      accountType === 'payable'
    );
    const latestReceivableByCategoryQuery = useLatestReceivableByCategory(
      customerId,
      account.categoryId,
      accountType === 'receivable'
    );

    const latestEntityAccount =
      accountType === 'payable'
        ? latestPayableAccountQuery.data
        : latestReceivableAccountQuery.data;
    const isFetchingLatestEntityAccount =
      accountType === 'payable'
        ? latestPayableAccountQuery.isFetching
        : latestReceivableAccountQuery.isFetching;
    const hasLatestEntityAccountError =
      accountType === 'payable'
        ? latestPayableAccountQuery.isError
        : latestReceivableAccountQuery.isError;
    const latestCategoryAccount =
      accountType === 'payable'
        ? latestPayableByCategoryQuery.data
        : latestReceivableByCategoryQuery.data;
    const isFetchingLatestCategoryAccount =
      accountType === 'payable'
        ? latestPayableByCategoryQuery.isFetching
        : latestReceivableByCategoryQuery.isFetching;
    const hasLatestCategoryAccountError =
      accountType === 'payable'
        ? latestPayableByCategoryQuery.isError
        : latestReceivableByCategoryQuery.isError;
    const latestPayablePaymentMethodQuery = useLatestPayablePaymentMethod(
      latestCategoryAccount?.accountId,
      canRegisterPayment && showPayment && accountType === 'payable'
    );
    const latestReceivablePaymentMethodQuery = useLatestReceivablePaymentMethod(
      latestCategoryAccount?.accountId,
      canRegisterPayment && showPayment && accountType === 'receivable'
    );
    const latestPaymentMethod =
      accountType === 'payable'
        ? latestPayablePaymentMethodQuery.data
        : latestReceivablePaymentMethodQuery.data;
    const suggestionKey = `${entityId ?? ''}:${account.categoryId ?? ''}`;
    const paymentMethodSuggestionKey = `${suggestionKey}:${latestCategoryAccount?.accountId ?? ''}`;

    useEffect(() => {
      if (
        !entityId ||
        isFetchingLatestEntityAccount ||
        latestEntityAccount === undefined ||
        manualCategoryEntityId === entityId ||
        account.categoryId
      ) {
        return;
      }

      const categoryId = latestEntityAccount?.categoryId;
      if (!categoryId) return;

      onUpdate(account.id, { categoryId });
      setAutoAppliedCategoryKey(`${entityId}:${categoryId}`);
    }, [
      account.categoryId,
      account.id,
      entityId,
      isFetchingLatestEntityAccount,
      latestEntityAccount,
      manualCategoryEntityId,
      onUpdate,
    ]);

    useEffect(() => {
      if (!autoAppliedCategoryKey) return;

      const timeoutId = window.setTimeout(
        () => setAutoAppliedCategoryKey(null),
        1800
      );
      return () => window.clearTimeout(timeoutId);
    }, [autoAppliedCategoryKey]);

    // Custom hooks para lógica de negócio
    const {
      fieldErrors,
      validateField,
      hasErrors: validationHasErrors,
    } = useBatchAccountValidation(accountType);

    const hasErrors = Boolean(validationHasErrors);

    const state = useBatchAccountState(
      account,
      accountType,
      vendors,
      customers,
      categories,
      hasErrors
    );

    const handlers = useBatchAccountHandlers(account, onUpdate);
    const updateInstallmentCount = handlers.handleInstallmentCountChange;
    const updatePaymentField = handlers.handlePaymentFieldChange;
    const togglePaymentInstallment = handlers.handleTogglePaymentInstallment;

    const [autoPaymentMethodKey, setAutoPaymentMethodKey] = useState<
      string | null
    >(null);
    const [paymentMethodManuallyChanged, setPaymentMethodManuallyChanged] =
      useState(false);
    const suggestedPaymentMethod = paymentMethodManuallyChanged
      ? null
      : latestPaymentMethod;
    const autoFilledPaymentMethod =
      !paymentMethodManuallyChanged &&
      (autoPaymentMethodKey === paymentMethodSuggestionKey ||
        (!account.payment?.paymentMethod && Boolean(latestPaymentMethod)));

    useEffect(() => {
      if (!canRegisterPayment && showPayment) setShowPayment(false);
    }, [canRegisterPayment, showPayment]);

    useEffect(() => {
      if (
        !showPayment ||
        !canRegisterPayment ||
        !latestPaymentMethod ||
        !account.payment?.installmentNumbers.length ||
        paymentMethodManuallyChanged ||
        autoPaymentMethodKey === paymentMethodSuggestionKey ||
        (account.payment.paymentMethod && !autoPaymentMethodKey)
      ) {
        return;
      }

      updatePaymentField('paymentMethod', latestPaymentMethod);
      setAutoPaymentMethodKey(paymentMethodSuggestionKey);
    }, [
      account.payment?.installmentNumbers.length,
      account.payment?.paymentMethod,
      autoPaymentMethodKey,
      canRegisterPayment,
      updatePaymentField,
      latestPaymentMethod,
      paymentMethodManuallyChanged,
      paymentMethodSuggestionKey,
      showPayment,
    ]);

    const clearAutoPaymentMethod = useCallback(() => {
      if (!autoPaymentMethodKey) return;

      setAutoPaymentMethodKey(null);
      if (account.payment?.paymentMethod) {
        onUpdate(account.id, {
          payment: { ...account.payment, paymentMethod: '' },
        });
      }
    }, [account.id, account.payment, autoPaymentMethodKey, onUpdate]);

    const handlePaymentFieldChange = useCallback(
      (field: string, value: any) => {
        if (field === 'paymentMethod') {
          setAutoPaymentMethodKey(null);
          setPaymentMethodManuallyChanged(true);
        }
        updatePaymentField(field, value);
      },
      [updatePaymentField]
    );

    const handleTogglePayment = useCallback(() => {
      const shouldOpen = !showPayment;
      if (shouldOpen && !account.payment?.paymentDate) {
        updatePaymentField('paymentDate', getNowLocalDatetimeInput());
      }
      setShowPayment(shouldOpen);
    }, [account.payment?.paymentDate, updatePaymentField, showPayment]);

    const handleTogglePaymentInstallment = useCallback(
      (installmentNumber: number) => {
        togglePaymentInstallment(installmentNumber, latestPaymentMethod || '');
        if (latestPaymentMethod && !account.payment?.paymentMethod) {
          setAutoPaymentMethodKey(paymentMethodSuggestionKey);
        }
      },
      [
        account.payment?.paymentMethod,
        togglePaymentInstallment,
        latestPaymentMethod,
        paymentMethodSuggestionKey,
      ]
    );

    const handleAmountInputChange = useCallback(
      (value: number | null) => {
        setAmountInputValue(value);
        const enteredValue = value ?? 0;
        const totalAmount =
          amountInputMode === 'perInstallment'
            ? Math.round(enteredValue * account.installmentCount * 100) / 100
            : enteredValue;

        onUpdate(account.id, { amount: totalAmount });
        validateField('amount', totalAmount);
      },
      [
        account.id,
        account.installmentCount,
        amountInputMode,
        onUpdate,
        validateField,
      ]
    );

    const handleToggleAmountInputMode = useCallback(() => {
      const nextMode = amountInputMode === 'total' ? 'perInstallment' : 'total';
      const enteredValue = amountInputValue ?? 0;
      const totalAmount =
        nextMode === 'perInstallment'
          ? Math.round(enteredValue * account.installmentCount * 100) / 100
          : enteredValue;

      setAmountInputMode(nextMode);
      onUpdate(account.id, { amount: totalAmount });
      validateField('amount', totalAmount);
    }, [
      account.id,
      account.installmentCount,
      amountInputMode,
      amountInputValue,
      onUpdate,
      validateField,
    ]);

    const handleInstallmentCountChange = useCallback(
      (count: number) => {
        if (amountInputMode === 'perInstallment') {
          const totalAmount =
            Math.round((amountInputValue ?? 0) * count * 100) / 100;
          onUpdate(account.id, { amount: totalAmount });
          validateField('amount', totalAmount);
          if (count === 1) setAmountInputMode('total');
        }

        updateInstallmentCount(count);
      },
      [
        account.id,
        amountInputMode,
        amountInputValue,
        updateInstallmentCount,
        onUpdate,
        validateField,
      ]
    );

    const handleEntityChange = useCallback(
      (field: 'vendorId' | 'customerId', value: string) => {
        const currentEntityId =
          accountType === 'payable' ? account.vendorId : account.customerId;

        if (currentEntityId !== value) {
          clearAutoPaymentMethod();
          setManualCategoryEntityId(null);
          setAutoAppliedCategoryKey(null);
          setCopiedAmountKey(null);
          setCopiedTagsKey(null);
          onUpdate(account.id, { [field]: value, categoryId: undefined });
          return;
        }

        onUpdate(account.id, { [field]: value });
      },
      [
        account.customerId,
        account.id,
        account.vendorId,
        accountType,
        clearAutoPaymentMethod,
        onUpdate,
      ]
    );

    const handleCategoryChange = useCallback(
      (categoryId: string | undefined) => {
        clearAutoPaymentMethod();
        setManualCategoryEntityId(entityId ?? null);
        setAutoAppliedCategoryKey(null);
        setCopiedAmountKey(null);
        setCopiedTagsKey(null);
        onUpdate(account.id, { categoryId });
      },
      [account.id, clearAutoPaymentMethod, entityId, onUpdate]
    );

    const handleCopyLatestAmount = useCallback(() => {
      const amount = latestCategoryAccount?.amount;
      if (!entityId || !account.categoryId || amount == null) return;

      setAmountInputMode('total');
      setAmountInputValue(amount);
      onUpdate(account.id, { amount });
      validateField('amount', amount);
      setCopiedAmountKey(suggestionKey);
    }, [
      account.categoryId,
      account.id,
      entityId,
      latestCategoryAccount?.amount,
      onUpdate,
      suggestionKey,
      validateField,
    ]);

    const handleCopyLatestTags = useCallback(() => {
      const tagIds = latestCategoryAccount?.tagIds;
      if (!entityId || !account.categoryId || !tagIds?.length) return;

      onUpdate(account.id, { tagIds });
      setCopiedTagsKey(suggestionKey);
    }, [
      account.categoryId,
      account.id,
      entityId,
      latestCategoryAccount?.tagIds,
      onUpdate,
      suggestionKey,
    ]);

    // Callbacks para criação rápida
    const handleCategoryCreated = useCallback(
      (newCategory: Category) => {
        handleCategoryChange(newCategory.id);
        setQuickCategoryOpen(false);
      },
      [handleCategoryChange]
    );

    const handleTagCreated = useCallback(
      (newTag: Tag) => {
        const currentTags = account.tagIds || [];
        handlers.handleFieldChange('tagIds', [...currentTags, newTag.id]);
        setQuickTagOpen(false);
      },
      [account.tagIds, handlers]
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 2.5,
            bgcolor: state.backgroundColor,
            transition: 'all 0.3s ease',
            position: 'relative',
            border: hasErrors ? '2px solid' : '1px solid',
            borderColor: hasErrors ? 'error.main' : 'divider',
            '&:hover': {
              boxShadow: state.isDisabled ? undefined : 3,
              borderColor: state.isDisabled ? 'divider' : 'primary.main',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <BatchAccountHeader
              index={index}
              isProcessing={state.isProcessing}
              isSuccess={state.isSuccess}
              isError={state.isError}
              isAccountValid={state.isAccountValid}
              errorMessage={account.errorMessage}
            />
            <BatchAccountActions
              accountId={account.id}
              isDisabled={state.isDisabled}
              isError={state.isError}
              isProcessing={state.isProcessing}
              isSuccess={state.isSuccess}
              onDuplicate={onDuplicate}
              onRetry={onRetry}
              onRemove={onRemove}
            />
          </Box>

          <Grid container spacing={{ xs: 2, md: 2.5 }}>
            {/* Campos do Formulário */}
            <BatchAccountFormFields
              account={account}
              accountType={accountType}
              isDisabled={state.isDisabled}
              selectedEntity={state.selectedEntity}
              onEntityChange={handleEntityChange}
              entityLabel={state.entityLabel}
              entityList={state.entityList}
              filteredCategories={state.filteredCategories}
              tags={tags}
              fieldErrors={fieldErrors}
              isFetchingLatestEntityAccount={isFetchingLatestEntityAccount}
              hasLatestEntityAccountError={hasLatestEntityAccountError}
              categoryAutoApplied={autoAppliedCategoryKey === suggestionKey}
              amountInputMode={amountInputMode}
              amountInputValue={amountInputValue}
              latestCategoryAccount={latestCategoryAccount}
              isFetchingLatestCategoryAccount={isFetchingLatestCategoryAccount}
              hasLatestCategoryAccountError={hasLatestCategoryAccountError}
              isLatestAmountCopied={copiedAmountKey === suggestionKey}
              isLatestTagsCopied={copiedTagsKey === suggestionKey}
              formatCurrency={formatCurrency}
              showInstallments={showInstallments}
              onFieldChange={handlers.handleFieldChange}
              onAmountInputChange={handleAmountInputChange}
              onToggleAmountInputMode={handleToggleAmountInputMode}
              onCategoryChange={handleCategoryChange}
              onCopyLatestAmount={handleCopyLatestAmount}
              onCopyLatestTags={handleCopyLatestTags}
              onInstallmentCountChange={handleInstallmentCountChange}
              onFirstDueDateChange={handlers.handleFirstDueDateChange}
              onValidateField={validateField}
              onQuickCategoryOpen={() => setQuickCategoryOpen(true)}
              onQuickTagOpen={() => setQuickTagOpen(true)}
              onToggleInstallments={() =>
                setShowInstallments(!showInstallments)
              }
            />

            {/* Preview de Parcelas */}
            <BatchAccountInstallmentsPreview
              account={account}
              showInstallments={showInstallments}
              formatCurrency={formatCurrency}
            />

            {/* Seção de Pagamento/Recebimento */}
            <BatchAccountPaymentSection
              account={account}
              isDisabled={state.isDisabled || !canRegisterPayment}
              showPayment={showPayment}
              suggestedPaymentMethod={suggestedPaymentMethod}
              autoFilledPaymentMethod={autoFilledPaymentMethod}
              paymentLabels={state.currentPaymentLabels}
              totalPaymentAmount={state.totalPaymentAmount}
              formatCurrency={formatCurrency}
              onTogglePayment={handleTogglePayment}
              onTogglePaymentInstallment={handleTogglePaymentInstallment}
              onPaymentFieldChange={handlePaymentFieldChange}
            />

            {/* Error Message */}
            {state.isError && account.errorMessage && (
              <Grid item xs={12}>
                <Alert
                  severity="error"
                  sx={{ py: 0.5, whiteSpace: 'pre-line' }}
                >
                  {account.errorMessage}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Quick Create Dialogs */}
        <QuickCreateCategory
          open={quickCategoryOpen}
          onClose={() => setQuickCategoryOpen(false)}
          onCreated={handleCategoryCreated}
          type={accountType === 'payable' ? 'PAYABLE' : 'RECEIVABLE'}
        />
        <QuickCreateTag
          open={quickTagOpen}
          onClose={() => setQuickTagOpen(false)}
          onCreated={handleTagCreated}
        />
      </motion.div>
    );
  }
);

BatchAccountRow.displayName = 'BatchAccountRow';

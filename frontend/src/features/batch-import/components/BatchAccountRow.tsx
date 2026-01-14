import { memo, useState, useCallback } from 'react';
import { Grid, Paper, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { QuickCreateCategory } from '../../../shared/components/QuickCreateCategory';
import { QuickCreateTag } from '../../../shared/components/QuickCreateTag';
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

    // Callbacks para criação rápida
    const handleCategoryCreated = useCallback(
      (newCategory: Category) => {
        handlers.handleFieldChange('categoryId', newCategory.id);
        setQuickCategoryOpen(false);
      },
      [handlers]
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
            p: 2,
            mb: 2,
            bgcolor: state.backgroundColor,
            opacity: state.isSuccess ? 0.7 : 1,
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
          {/* Header: Número e Status */}
          <BatchAccountHeader
            index={index}
            isProcessing={state.isProcessing}
            isSuccess={state.isSuccess}
            isError={state.isError}
            isAccountValid={state.isAccountValid}
            errorMessage={account.errorMessage}
          />

          <Grid container spacing={2} sx={{ mt: 3 }}>
            {/* Campos do Formulário */}
            <BatchAccountFormFields
              account={account}
              accountType={accountType}
              isDisabled={state.isDisabled}
              selectedEntity={state.selectedEntity}
              entityLabel={state.entityLabel}
              entityList={state.entityList}
              filteredCategories={state.filteredCategories}
              tags={tags}
              fieldErrors={fieldErrors}
              formatCurrency={formatCurrency}
              showInstallments={showInstallments}
              onFieldChange={handlers.handleFieldChange}
              onInstallmentCountChange={handlers.handleInstallmentCountChange}
              onFirstDueDateChange={handlers.handleFirstDueDateChange}
              onValidateField={validateField}
              onQuickCategoryOpen={() => setQuickCategoryOpen(true)}
              onQuickTagOpen={() => setQuickTagOpen(true)}
              onToggleInstallments={() =>
                setShowInstallments(!showInstallments)
              }
            />

            {/* Ações */}
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

            {/* Preview de Parcelas */}
            <BatchAccountInstallmentsPreview
              account={account}
              showInstallments={showInstallments}
              formatCurrency={formatCurrency}
            />

            {/* Seção de Pagamento/Recebimento */}
            <BatchAccountPaymentSection
              account={account}
              isDisabled={state.isDisabled}
              showPayment={showPayment}
              paymentLabels={state.currentPaymentLabels}
              totalPaymentAmount={state.totalPaymentAmount}
              formatCurrency={formatCurrency}
              onTogglePayment={() => setShowPayment(!showPayment)}
              onTogglePaymentInstallment={
                handlers.handleTogglePaymentInstallment
              }
              onPaymentFieldChange={handlers.handlePaymentFieldChange}
            />

            {/* Error Message */}
            {state.isError && account.errorMessage && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ py: 0.5 }}>
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

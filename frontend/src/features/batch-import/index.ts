/**
 * Feature: Batch Import
 * Sistema de cadastro em lote de contas a pagar/receber.
 *
 * Arquitetura refatorada com separação de responsabilidades.
 * Veja ARCHITECTURE.md para detalhes.
 */

// Página principal
export { default as BatchImportPage } from './pages/BatchImportPage';

// Componentes
export { BatchAccountRow } from './components';

// Hooks
export {
  useBatchProcess,
  useBatchStorage,
  useBatchAccountHandlers,
  useBatchAccountValidation,
  useBatchAccountState,
} from './hooks';

// Tipos
export * from './types';

// Utilitários
export {
  validateAllAccounts,
  validateSingleAccount,
  formatCurrency,
  calculateDueDates,
} from './utils';

import { useState, useCallback } from 'react';
import { AccountType } from '../types';

interface ValidationErrors {
  [field: string]: string;
}

/**
 * Hook customizado para gerenciar validação de campos em tempo real.
 * Separa a lógica de validação do componente de apresentação.
 */
export function useBatchAccountValidation(accountType: AccountType): {
  fieldErrors: ValidationErrors;
  validateField: (field: string, value: any) => boolean;
  clearErrors: () => void;
  hasErrors: boolean;
} {
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  /**
   * Valida um campo específico e atualiza os erros
   */
  const validateField = useCallback(
    (field: string, value: any): boolean => {
      const errors: ValidationErrors = { ...fieldErrors };

      switch (field) {
        case 'vendorId':
        case 'customerId':
          if (!value) {
            errors[field] =
              accountType === 'payable'
                ? 'Credor é obrigatório'
                : 'Devedor é obrigatório';
          } else {
            delete errors[field];
          }
          break;
        case 'amount':
          if (!value || value <= 0) {
            errors[field] = 'Valor deve ser maior que zero';
          } else {
            delete errors[field];
          }
          break;
        case 'dueDates':
          if (!value || !value[0]) {
            errors[field] = 'Data de vencimento é obrigatória';
          } else {
            delete errors[field];
          }
          break;
      }

      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [fieldErrors, accountType]
  );

  /**
   * Limpa todos os erros de validação
   */
  const clearErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * Verifica se há algum erro de validação
   */
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    validateField,
    clearErrors,
    hasErrors,
  };
}

import React, { forwardRef, useCallback } from 'react';
import { TextField, TextFieldProps, InputAdornment } from '@mui/material';

interface CurrencyFieldProps extends Omit<
  TextFieldProps,
  'onChange' | 'value'
> {
  value?: number | string | null;
  onChange?: (value: number | null) => void;
  currencySymbol?: string;
}

// Converte valor para string formatada (movido para fora para evitar re-renders)
const formatValue = (num: number | string | null): string => {
  if (num === null || num === undefined || num === '') return '';

  const numericValue = typeof num === 'string' ? Number.parseFloat(num) : num;
  if (Number.isNaN(numericValue)) return '';

  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

export const CurrencyField = forwardRef<HTMLInputElement, CurrencyFieldProps>(
  ({ value, onChange, currencySymbol = 'R$', ...props }, ref) => {
    // Handle input change - memoizado para performance
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;

        // Permite apenas dígitos
        const digitsOnly = inputValue.replaceAll(/\D/g, '');

        if (digitsOnly === '') {
          onChange?.(null);
          return;
        }

        // Interpreta como centavos - especifica base 10
        const numericValue = Number.parseInt(digitsOnly, 10) / 100;
        onChange?.(numericValue);
      },
      [onChange]
    );

    // Handle focus - memoizado
    const handleFocus = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        const currentValue = value;
        if (
          currentValue === 0 ||
          currentValue === null ||
          currentValue === undefined
        ) {
          // Se for 0, deixa vazio
          event.target.value = '';
        } else {
          // Remove formatação para edição
          const numericValue =
            typeof currentValue === 'string'
              ? Number.parseFloat(currentValue)
              : currentValue;
          if (!Number.isNaN(numericValue)) {
            event.target.value = (numericValue * 100).toString();
          }
        }
        props.onFocus?.(event);
      },
      [value, props.onFocus]
    );

    // Handle blur - memoizado
    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        if (inputValue) {
          const numericValue =
            Number.parseInt(inputValue.replaceAll(/\D/g, ''), 10) / 100;
          event.target.value = formatValue(numericValue);
        }
        props.onBlur?.(event);
      },
      [props.onBlur]
    );

    const displayValue = formatValue(value || null);

    return (
      <TextField
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        type="text"
        inputMode="numeric"
        InputProps={{
          ...props.InputProps,
          startAdornment: (
            <InputAdornment position="start">{currencySymbol}</InputAdornment>
          ),
        }}
      />
    );
  }
);

CurrencyField.displayName = 'CurrencyField';

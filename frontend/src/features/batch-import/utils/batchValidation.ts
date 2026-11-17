import { z } from 'zod';
import { BatchAccount, AccountType } from '../types';

// Schema de pagamento opcional - reutilizado dos schemas de payables/receivables
const paymentOnAccountSchema = z
  .object({
    installmentNumbers: z.array(z.number().int().positive()).optional(),
    paymentDate: z
      .string()
      .optional()
      .transform(val => (val === '' ? undefined : val)),
    paymentMethod: z
      .enum([
        'CASH',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'BANK_TRANSFER',
        'PIX',
        'BOLETO',
        'CHECK',
        'ACCOUNT_DEBIT',
        'ACCOUNT_CREDIT',
        'OTHER',
        '',
      ])
      .optional()
      .transform(val => (val === '' ? undefined : val)),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    data => {
      if (!data.installmentNumbers || data.installmentNumbers.length === 0) {
        return true;
      }
      return !!data.paymentDate;
    },
    {
      message: 'Informe a data do pagamento.',
      path: ['paymentDate'],
    }
  )
  .refine(
    data => {
      if (!data.installmentNumbers || data.installmentNumbers.length === 0) {
        return true;
      }
      return !!data.paymentMethod;
    },
    {
      message: 'Selecione o método de pagamento.',
      path: ['paymentMethod'],
    }
  )
  .refine(
    data => {
      if (!data.paymentDate) return true;
      const selected = new Date(data.paymentDate);
      const now = new Date();
      return selected <= now;
    },
    {
      message: 'A data do pagamento não pode ser futura.',
      path: ['paymentDate'],
    }
  )
  .transform(data => {
    if (!data.installmentNumbers || data.installmentNumbers.length === 0) {
      return undefined;
    }
    return data;
  });

// Schema base para validação de uma conta no lote
const batchAccountBaseSchema = z.object({
  amount: z
    .number({
      required_error: 'Informe o valor total da conta.',
      invalid_type_error: 'Informe um valor válido.',
    })
    .positive('Informe um valor maior que zero.'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  installmentCount: z
    .number({
      required_error: 'Informe o número de parcelas.',
      invalid_type_error: 'Informe um número de parcelas válido.',
    })
    .int('Informe um número inteiro de parcelas.')
    .min(1, 'Informe pelo menos uma parcela.')
    .max(120, 'O limite é 120 parcelas.'),
  dueDates: z
    .array(z.string(), {
      required_error: 'Informe uma data de vencimento.',
    })
    .min(1, 'Informe uma data de vencimento.')
    .refine(
      dates => {
        // Validar que as datas estão em ordem crescente
        for (let i = 1; i < dates.length; i++) {
          if (dates[i] <= dates[i - 1]) {
            return false;
          }
        }
        return true;
      },
      { message: 'Organize as datas de vencimento em ordem crescente.' }
    ),
  payment: paymentOnAccountSchema.optional(),
});

// Schema para payables (contas a pagar)
const payableAccountSchema = batchAccountBaseSchema.extend({
  vendorId: z
    .string({
      required_error: 'Selecione um credor para esta conta.',
      invalid_type_error: 'Selecione um credor válido.',
    })
    .min(1, 'Selecione um credor para esta conta.'),
  customerId: z.undefined().optional(),
});

// Schema para receivables (contas a receber)
const receivableAccountSchema = batchAccountBaseSchema.extend({
  customerId: z
    .string({
      required_error: 'Selecione um devedor para esta conta.',
      invalid_type_error: 'Selecione um devedor válido.',
    })
    .min(1, 'Selecione um devedor para esta conta.'),
  vendorId: z.undefined().optional(),
});

const REQUIRED_FIELD_MESSAGES: Record<string, string> = {
  amount: 'Informe o valor total da conta.',
  vendorId: 'Selecione um credor para esta conta.',
  customerId: 'Selecione um devedor para esta conta.',
  installmentCount: 'Informe o número de parcelas.',
  dueDates: 'Informe uma data de vencimento.',
  paymentDate: 'Informe a data do pagamento.',
  paymentMethod: 'Selecione o método de pagamento.',
};

function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map(error => {
    const field = String(error.path[error.path.length - 1] ?? '');
    return error.message === 'Required'
      ? REQUIRED_FIELD_MESSAGES[field] || 'Preencha este campo obrigatório.'
      : error.message;
  });
}

export interface ValidationError {
  accountId: string;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Valida todas as contas do lote antes de iniciar o processamento.
 * Evita envios parciais com erros previsíveis.
 *
 * @param accounts - Array de contas a validar
 * @param accountType - Tipo da conta ('payable' ou 'receivable')
 * @returns Resultado da validação com lista de erros por conta
 */
export function validateAllAccounts(
  accounts: BatchAccount[],
  accountType: AccountType
): ValidationResult {
  const errors: ValidationError[] = [];

  // Filtrar apenas contas que estão idle ou error (não validar as já processadas)
  const accountsToValidate = accounts.filter(
    acc => acc.status === 'idle' || acc.status === 'error'
  );

  for (const account of accountsToValidate) {
    const schema =
      accountType === 'payable'
        ? payableAccountSchema
        : receivableAccountSchema;

    const result = schema.safeParse({
      vendorId: account.vendorId,
      customerId: account.customerId,
      amount: account.amount,
      categoryId: account.categoryId,
      tagIds: account.tagIds,
      notes: account.notes,
      installmentCount: account.installmentCount,
      dueDates: account.dueDates,
      payment: account.payment,
    });

    if (!result.success) {
      errors.push({
        accountId: account.id,
        errors: formatValidationErrors(result.error.errors),
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida uma única conta individualmente.
 * Útil para validação em tempo real durante edição.
 *
 * @param account - Conta a validar
 * @param accountType - Tipo da conta
 * @returns Array de mensagens de erro (vazio se válido)
 */
export function validateSingleAccount(
  account: BatchAccount,
  accountType: AccountType
): string[] {
  const schema =
    accountType === 'payable' ? payableAccountSchema : receivableAccountSchema;

  const result = schema.safeParse({
    vendorId: account.vendorId,
    customerId: account.customerId,
    amount: account.amount,
    categoryId: account.categoryId,
    tagIds: account.tagIds,
    notes: account.notes,
    installmentCount: account.installmentCount,
    dueDates: account.dueDates,
    payment: account.payment,
  });

  if (result.success) {
    return [];
  }

  return formatValidationErrors(result.error.errors);
}

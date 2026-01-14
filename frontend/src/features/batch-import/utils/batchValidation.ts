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
      return !!data.paymentDate && !!data.paymentMethod;
    },
    {
      message:
        'Data e método de pagamento são obrigatórios quando parcelas são selecionadas',
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
      message: 'Data do pagamento não pode ser futura',
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
  amount: z.number().positive('Valor deve ser positivo'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  installmentCount: z.number().int().min(1).max(120),
  dueDates: z
    .array(z.string())
    .min(1, 'Pelo menos uma data de vencimento é necessária')
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
      { message: 'As datas de vencimento devem estar em ordem crescente' }
    ),
  payment: paymentOnAccountSchema.optional(),
});

// Schema para payables (contas a pagar)
const payableAccountSchema = batchAccountBaseSchema.extend({
  vendorId: z.string().min(1, 'Credor é obrigatório'),
  customerId: z.undefined().optional(),
});

// Schema para receivables (contas a receber)
const receivableAccountSchema = batchAccountBaseSchema.extend({
  customerId: z.string().min(1, 'Devedor é obrigatório'),
  vendorId: z.undefined().optional(),
});

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
      const accountErrors = result.error.errors.map(err => {
        const field = err.path.join('.');
        return field ? `${field}: ${err.message}` : err.message;
      });

      errors.push({
        accountId: account.id,
        errors: accountErrors,
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

  return result.error.errors.map(err => {
    const field = err.path.join('.');
    return field ? `${field}: ${err.message}` : err.message;
  });
}

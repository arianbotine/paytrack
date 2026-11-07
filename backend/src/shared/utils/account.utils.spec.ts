import { Prisma } from '@prisma/client';
import { calculateInstallmentAmountsFromCents } from './account.utils';

describe('calculateInstallmentAmountsFromCents', () => {
  it('distributes remainder cents to the final installment exactly', () => {
    const amounts = calculateInstallmentAmountsFromCents(10000, 3);

    expect(amounts.map(amount => amount.toFixed(2))).toEqual([
      '33.33',
      '33.33',
      '33.34',
    ]);
    expect(
      amounts
        .reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0))
        .times(100)
        .toNumber()
    ).toBe(10000);
  });

  it('rejects values that cannot produce at least one cent per installment', () => {
    expect(() => calculateInstallmentAmountsFromCents(1, 2)).toThrow(
      'Valor e quantidade de parcelas inválidos'
    );
  });
});

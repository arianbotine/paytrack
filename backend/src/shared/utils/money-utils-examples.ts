import { Decimal } from '@prisma/client/runtime/library';
import { MoneyUtils } from './money.utils';

// Exemplos de uso da classe MoneyUtils

// 1. Conversão de Decimal para number
const decimalValue = new Decimal('1234.56');
const numberValue = MoneyUtils.toNumber(decimalValue);
console.log('Decimal to number:', numberValue); // 1234.56

// 2. Conversão de string para number
const stringValue = '789.90';
const parsedNumber = MoneyUtils.toNumber(stringValue);
console.log('String to number:', parsedNumber); // 789.9

// 3. Conversão para Decimal
const toDecimal = MoneyUtils.toDecimal(456.78);
console.log('Number to Decimal:', toDecimal.toString()); // "456.78"

// 4. Formatação como moeda brasileira
const formatted = MoneyUtils.formatBRL(1234.56);
console.log('Formatted BRL:', formatted); // "R$ 1.234,56"

// 5. Validação de valores monetários
console.log('Is valid money (number):', MoneyUtils.isValidMoney(123.45)); // true
console.log('Is valid money (string):', MoneyUtils.isValidMoney('123.45')); // true
console.log(
  'Is valid money (Decimal):',
  MoneyUtils.isValidMoney(new Decimal('123.45'))
); // true
console.log('Is valid money (invalid):', MoneyUtils.isValidMoney('abc')); // false

// 6. Transformação de objetos com campos monetários
const transaction = {
  id: '123',
  amount: new Decimal('100.50'),
  paidAmount: new Decimal('50.25'),
  description: 'Test transaction',
};

const transformed = MoneyUtils.transformMoneyFields(transaction, [
  'amount',
  'paidAmount',
]);
console.log('Transformed object:', transformed);
// { id: '123', amount: 100.5, paidAmount: 50.25, description: 'Test transaction' }

// 7. Transformação de arrays
const transactions = [
  { id: '1', amount: new Decimal('100.00'), description: 'Transaction 1' },
  { id: '2', amount: new Decimal('200.00'), description: 'Transaction 2' },
];

const transformedArray = MoneyUtils.transformMoneyFieldsArray(transactions, [
  'amount',
]);
console.log('Transformed array:', transformedArray);
// [{ id: '1', amount: 100, description: 'Transaction 1' }, ...]

# MoneyUtils - Utilitário para Valores Monetários

Classe centralizada para manipulação precisa de valores monetários no PayTrack, garantindo consistência e evitando erros de arredondamento.

## Funcionalidades

### Conversões Seguras

- **Decimal → Number**: Converte objetos `Decimal` do Prisma para `number` JavaScript
- **String → Number**: Parse seguro de strings monetárias
- **Number → Decimal**: Converte para `Decimal` do Prisma

### Validação

- Verifica se valores são monetários válidos
- Trata casos de NaN, infinito e tipos incorretos

### Formatação

- Formatação como moeda brasileira (R$ 1.234,56)
- Arredondamento preciso para 2 casas decimais

### Transformação de Dados

- Converte campos específicos em objetos
- Processa arrays de objetos automaticamente

## Uso nos Serviços

### ReceivablesService

```typescript
// Antes (manual)
amount: Number(item.amount);

// Agora (centralizado)
const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
  "amount",
  "paidAmount",
]);
```

### PayablesService

```typescript
// Conversão para salvar
amount: MoneyUtils.toDecimal(data.amount);

// Conversão para retornar
return MoneyUtils.transformMoneyFields(payable, ["amount", "paidAmount"]);
```

## Benefícios

✅ **Consistência**: Todas as conversões seguem o mesmo padrão
✅ **Precisão**: Usa métodos nativos do Prisma para evitar perdas
✅ **Manutenibilidade**: Mudanças em uma lugar afetam todo o sistema
✅ **Segurança**: Validação automática previne erros
✅ **Reutilização**: Métodos estáticos fáceis de usar

## Exemplos de Uso

```typescript
import { MoneyUtils } from "../../shared/utils/money.utils";

// Conversões básicas
const decimal = new Decimal("123.45");
const number = MoneyUtils.toNumber(decimal); // 123.45

// Formatação
const formatted = MoneyUtils.formatBRL(1234.56); // "R$ 1.234,56"

// Transformação de API responses
const transactions = await service.findAll();
const safeTransactions = MoneyUtils.transformMoneyFieldsArray(transactions, [
  "amount",
]);
```

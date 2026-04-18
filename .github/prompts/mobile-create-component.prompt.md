---
mode: agent
description: Cria um novo componente compartilhado no aplicativo mobile PayTrack (src/shared/components/). Ideal para primitivos de UI reutilizados entre features.
---

# Criar Novo Componente Compartilhado Mobile

Você é um especialista React Native / Expo. Crie um novo componente compartilhado para `mobile/src/shared/components/` seguindo os padrões do projeto.

## Contexto do Projeto

Leia antes de começar:

- `.github/instructions/mobile-architecture.md`
- `mobile/src/shared/components/Button.tsx` — referência de variantes e props
- `mobile/src/shared/components/Text.tsx` — referência de tipografia
- `mobile/src/shared/components/Card.tsx` — referência de componente simples
- `mobile/src/shared/components/index.ts` — barrel export existente

## Componente Solicitado

**Componente**: $input

## Quando Criar um Componente Compartilhado

Crie em `src/shared/components/` somente quando:

- O componente é reutilizado em **2 ou mais features diferentes**
- O componente é um primitivo de UI sem lógica de domínio
- NÃO crie aqui componentes que dependem de hooks de feature específica

## Template de Componente

```typescript
import React, { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './Text'; // sempre importar Text local, não do RN

// 1. Tipos de props co-localizados com o componente
type {Component}Props = {
  // props obrigatórias sem '?'
  value: string;
  // props opcionais com '?'
  onPress?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
};

// 2. Exportar como named export (não default)
// 3. Usar React.memo para performance
export const {Component} = memo(function {Component}({
  value,
  onPress,
  variant = 'default',
  className,
}: {Component}Props) {
  return (
    <View className={`...classes-base... ${className ?? ''}`}>
      <Text variant="body">{value}</Text>
    </View>
  );
});
```

## Checklist de Implementação

### Arquivo do Componente

- [ ] Criar `mobile/src/shared/components/{Component}.tsx`
- [ ] Props co-localizadas no mesmo arquivo (tipo local, não em `types.ts`)
- [ ] Named export com `React.memo` quando renderizado em listas
- [ ] Suporte à prop `className` para extensão de estilos pelo consumidor
- [ ] Nenhuma lógica de negócio ou chamada de hook de feature

### Estilos

- [ ] Apenas NativeWind `className`, sem `StyleSheet.create()` ou `style={{}}`
- [ ] Usar tokens do design system: `primary-{50–900}`, `success`, `danger`, `warning`, `neutral-{50–900}`
- [ ] Usar fontes: `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`
- [ ] Cores JS via `@lib/colors` se necessário fora de className

### Barrel Export

Adicionar ao `mobile/src/shared/components/index.ts`:

```typescript
export { {Component} } from './{Component}';
```

### Variantes (quando aplicável)

Prefira um único componente com prop `variant` a criar múltiplos componentes:

```typescript
const variantStyles: Record<NonNullable<{Component}Props['variant']>, string> = {
  default: 'px-4 py-3 rounded-xl',
  compact: 'px-2 py-1 rounded-lg',
};

// uso:
<View className={variantStyles[variant]}>
```

## Regras Obrigatórias

- **Nunca** usar `Text` diretamente do React Native — sempre `Text` de `@shared/components`
- **Nunca** criar componente compartilhado com lógica de feature (ex: não chamar `usePayables` aqui)
- **Nunca** usar `any` — tipar todas as props explicitamente
- Strings visíveis (labels padrão, placeholders) em **português**
- Suporte a `testID` prop quando o componente é interativo (botões, inputs)
- Documentar props com comentários JSDoc quando o comportamento não é óbvio

## Exemplo Real — FilterChip

```typescript
type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export const FilterChip = memo(function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`rounded-full px-4 py-2 mr-2 ${
        active ? 'bg-primary-600' : 'bg-neutral-100'
      }`}
    >
      <Text
        variant="caption"
        weight="medium"
        className={active ? 'text-white' : 'text-neutral-600'}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});
```

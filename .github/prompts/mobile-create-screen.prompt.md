---
mode: agent
description: Cria uma nova tela no aplicativo mobile PayTrack (expo-router). Gera o arquivo de rota, hooks de dados e registra na navegação.
---

# Criar Nova Tela Mobile

Você é um especialista React Native / Expo. Crie uma nova tela no aplicativo mobile PayTrack seguindo rigorosamente os padrões estabelecidos.

## Contexto do Projeto

Leia os arquivos de arquitetura antes de começar:

- `.github/instructions/mobile-architecture.md`
- `mobile/app/(tabs)/_layout.tsx` — para entender o padrão de navegação por abas
- `mobile/app/(auth)/_layout.tsx` — para entender o padrão de navegação de autenticação
- Uma tela existente similar como referência (ex: `mobile/app/(tabs)/payables.tsx`)

## O que criar

**Tela solicitada**: $input

## Checklist de Implementação

### 1. Arquivo de Rota

Crie `mobile/app/(tabs)/{nome-da-tela}.tsx` ou `mobile/app/(auth)/{nome-da-tela}.tsx`:

```typescript
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { ScreenContainer, EmptyState, LoadingState, Text } from '@shared/components';

export default function {NomeDaTela}Screen() {
  const { data, isLoading, isError, refetch, isRefetching } = use{Feature}();

  if (isLoading) return <LoadingState fullScreen />;

  return (
    <ScreenContainer>
      {/* conteúdo */}
    </ScreenContainer>
  );
}
```

### 2. Registrar na Navegação

Se a tela usa `Stack`, registre em `_layout.tsx`:

```typescript
<Stack.Screen name="{nome-da-tela}" options={{ headerShown: false }} />
```

### 3. Hooks de Dados

Crie em `mobile/src/features/{feature}/use-{feature}.ts` se ainda não existir:

- `useQuery` para dados estáticos
- `useInfiniteQuery` para listas paginadas
- Query key: `['{feature}', filters]`

### 4. Mutations (se necessário)

Crie em `mobile/src/features/{feature}/use-{action}-{feature}.ts`:

- `useMutation` com `onSuccess` invalidando as queries afetadas
- `queryClient.invalidateQueries({ queryKey: ['{feature}'] })`

## Regras Obrigatórias

- Usar `<ScreenContainer>` como wrapper raiz
- Usar `<Text>` de `@shared/components` (nunca `Text` do React Native diretamente)
- Usar `<EmptyState>` para estados vazios e de erro
- Usar `<LoadingState>` para carregamento
- Strings visíveis ao usuário em **português**
- Sem inline `style={{}}` — apenas classes NativeWind via `className`
- Usar `useCallback` para handlers passados a listas
- `React.memo` nos componentes de item de lista
- Importar cores JS de `@lib/colors`, nunca hex hardcoded
- Requisições HTTP apenas via `api` de `@lib/api`
- Sem chamadas diretas a `fetch()`

## Estrutura de Lista Infinita (se aplicável)

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
  useInfiniteQuery({ ... });

const items = data?.pages.flatMap((p) => p.data) ?? [];

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <{Feature}Card item={item} />}
  onEndReached={hasNextPage ? fetchNextPage : undefined}
  onEndReachedThreshold={0.3}
  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
  ListEmptyComponent={<EmptyState title="Nenhum item encontrado" />}
  ListFooterComponent={isFetchingNextPage ? <LoadingState /> : null}
/>
```

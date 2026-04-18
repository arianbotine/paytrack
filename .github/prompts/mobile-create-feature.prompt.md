---
mode: agent
description: Cria um novo feature completo no aplicativo mobile PayTrack (hooks + componentes de lista/card + bottom sheet de criação).
---

# Criar Novo Feature Mobile

Você é um especialista React Native / Expo. Crie um novo feature completo no aplicativo mobile PayTrack, incluindo hooks de dados, componentes visuais e integração com a BFF.

## Contexto do Projeto

Leia antes de começar:

- `.github/instructions/mobile-architecture.md`
- `mobile/src/lib/types.ts` — para entender os tipos existentes
- `mobile/src/features/payables/` — use como referência canônica de implementação

## Feature Solicitado

**Feature**: $input

## Estrutura a Criar

```
mobile/src/features/{feature}/
├── use-{feature}s.ts           # useInfiniteQuery (lista paginada)
├── use-{feature}.ts            # useQuery (item único, se necessário)
├── use-create-{feature}.ts     # useMutation POST
├── use-update-{feature}.ts     # useMutation PATCH (se necessário)
├── use-delete-{feature}.ts     # useMutation DELETE (se necessário)
└── components/
    ├── {Feature}Card.tsx        # Card para exibição em lista
    └── Create{Feature}Sheet.tsx # Bottom sheet de criação/edição
```

## 1. Tipos (`src/lib/types.ts`)

Adicione os novos tipos ao arquivo existente:

```typescript
export type {Feature}ListItem = {
  id: string;
  // campos do item
  createdAt: string;
  updatedAt: string;
};

export type Create{Feature}Input = {
  // campos para criação
};
```

## 2. Hook de Lista — `use-{feature}s.ts`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { ListResponse, {Feature}ListItem } from '@lib/types';

type {Feature}Filters = {
  status?: string;
  // outros filtros
};

export function use{Feature}s(filters: {Feature}Filters = {}) {
  return useInfiniteQuery({
    queryKey: ['{feature}s', filters],
    queryFn: ({ pageParam = 1 }) =>
      api
        .get<ListResponse<{Feature}ListItem>>('/{feature}s', {
          params: { ...filters, page: pageParam, limit: 20 },
        })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      last.meta.hasNextPage ? all.length + 1 : undefined,
  });
}
```

## 3. Hook de Criação — `use-create-{feature}.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { Create{Feature}Input } from '@lib/types';

export function useCreate{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create{Feature}Input) =>
      api.post('/{feature}s', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature}s'] });
    },
  });
}
```

## 4. Componente Card — `{Feature}Card.tsx`

```typescript
import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text, Card, StatusBadge, CurrencyDisplay } from '@shared/components';
import type { {Feature}ListItem } from '@lib/types';

type {Feature}CardProps = {
  item: {Feature}ListItem;
  onPress?: (item: {Feature}ListItem) => void;
};

export const {Feature}Card = memo(function {Feature}Card({ item, onPress }: {Feature}CardProps) {
  return (
    <Card className="mb-3">
      <TouchableOpacity onPress={() => onPress?.(item)} activeOpacity={0.7}>
        <View className="flex-row items-center justify-between">
          <Text variant="body" weight="semibold" className="text-neutral-900 flex-1">
            {item.name}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        {/* demais campos */}
      </TouchableOpacity>
    </Card>
  );
});
```

## 5. Bottom Sheet de Criação — `Create{Feature}Sheet.tsx`

```typescript
import { useRef, useCallback } from 'react';
import { View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Text } from '@shared/components';
import { useCreate{Feature} } from '../use-create-{feature}';

const schema = z.object({
  // campos com mensagens em português
  name: z.string().min(1, 'Nome é obrigatório'),
});

type FormData = z.infer<typeof schema>;

type Create{Feature}SheetProps = {
  onSuccess?: () => void;
};

export function Create{Feature}Sheet({ onSuccess }: Create{Feature}SheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const mutation = useCreate{Feature}();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const open = useCallback(() => sheetRef.current?.expand(), []);
  const close = useCallback(() => {
    sheetRef.current?.close();
    reset();
  }, [reset]);

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        close();
        onSuccess?.();
      },
    });
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['60%', '90%']}
      enablePanDownToClose
      backgroundStyle={{ borderRadius: 24 }}
    >
      <BottomSheetView className="flex-1 px-4 pb-8">
        <Text variant="heading" weight="bold" className="mb-4 text-neutral-900">
          Novo {Feature}
        </Text>
        {/* campos do formulário */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={mutation.isPending}
          fullWidth
        >
          Salvar
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
```

## Regras Obrigatórias

- **Tipos**: adicionar em `src/lib/types.ts`, nunca criar `types.ts` local no feature (exceto se realmente local)
- **Query keys**: array com string + filtros — `['{feature}s', filters]`
- **Invalidação**: sempre invalidar queries relacionadas no `onSuccess`
- **Memo**: `React.memo` em todos os componentes de card/lista
- **Bottom sheet**: declarado na tela que o usa, não dentro de itens de lista
- **Strings**: todas as mensagens visíveis em **português**
- **Estilo**: apenas `className` NativeWind, sem `style={{}}` inline
- **HTTP**: apenas via `api` de `@lib/api`
- **Erros de formulário**: exibir mensagem sob o campo, nunca apenas console

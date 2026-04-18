# Mobile Architecture — React Native / Expo

## Stack

| Concern       | Tool                         | Version         |
| ------------- | ---------------------------- | --------------- |
| Framework     | Expo SDK                     | ~54             |
| Runtime       | React Native                 | 0.81            |
| Routing       | expo-router                  | ~6 (file-based) |
| UI Styling    | NativeWind v4                | Tailwind for RN |
| Global State  | Zustand                      | ^4              |
| Server State  | TanStack Query               | v5              |
| Forms         | react-hook-form + zod        | ^7 / ^3         |
| HTTP Client   | Axios → BFF                  | 120s timeout    |
| Bottom Sheets | @gorhom/bottom-sheet         | ^5              |
| Auth Storage  | expo-secure-store            | ^15             |
| Icons         | @expo/vector-icons           | ^15             |
| Animations    | react-native-reanimated      | ~4              |
| Gestures      | react-native-gesture-handler | ~2              |

---

## Directory Structure

```
mobile/
├── app/                        # expo-router file-based routes
│   ├── _layout.tsx             # Root layout (providers, OTA update check)
│   ├── index.tsx               # Auth gate: redirects to (tabs) or (auth)/login
│   ├── (auth)/
│   │   ├── _layout.tsx         # Stack navigator for auth screens
│   │   ├── login.tsx           # Email/password + Google OAuth
│   │   └── select-organization.tsx
│   └── (tabs)/
│       ├── _layout.tsx         # Custom top TabBar + TabBarHeightContext
│       ├── index.tsx           # Dashboard
│       ├── payables.tsx        # A Pagar
│       ├── receivables.tsx     # A Receber
│       └── profile.tsx         # Perfil
├── src/
│   ├── features/               # Domain features
│   │   └── {feature}/
│   │       ├── use-{feature}.ts           # Data hooks
│   │       ├── use-create-{feature}.ts    # Mutation hooks
│   │       └── components/
│   │           └── {Feature}Card.tsx
│   ├── lib/                    # Cross-cutting concerns
│   │   ├── api.ts              # Axios instance + interceptors
│   │   ├── auth-store.ts       # Zustand auth store
│   │   ├── types.ts            # All shared TypeScript types
│   │   ├── formatters.ts       # formatCurrency, formatDate, labels
│   │   ├── secure-storage.ts   # Platform-aware credential storage
│   │   ├── colors.ts           # JS color constants (mirrors tailwind)
│   │   └── index.ts            # Barrel export
│   └── shared/
│       ├── context/
│       │   └── tab-bar-height-context.tsx
│       └── components/
│           ├── index.ts        # Barrel export
│           ├── Text.tsx        # Typed typography component
│           ├── Button.tsx      # Primary/secondary/ghost/danger variants
│           ├── Card.tsx        # Elevated/flat card wrapper
│           ├── ScreenContainer.tsx
│           ├── StatusBadge.tsx
│           ├── CurrencyDisplay.tsx
│           ├── FilterChip.tsx
│           ├── EmptyState.tsx
│           ├── LoadingState.tsx
│           ├── PaymentModal.tsx
│           └── ...             # Other shared UI primitives
├── assets/
├── global.css                  # NativeWind CSS entry
├── tailwind.config.js          # NativeWind palette + fonts
├── metro.config.js             # Metro + NativeWind integration
├── app.json                    # Expo config (bundle IDs, OTA, plugins)
└── eas.json                    # EAS Build / Update channels
```

---

## Routing (expo-router v6)

### File-Based Convention

- Every `.tsx` file inside `app/` becomes a route.
- Route groups `(auth)` and `(tabs)` are folders that group screens without contributing to the URL path.
- Layouts (`_layout.tsx`) wrap child routes.
- `app/index.tsx` is the entry point and acts as the auth gate.

### Auth Gate Pattern

```typescript
// app/index.tsx
export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <LoadingState fullScreen />;
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
```

### Navigation

- Use `router.push()`, `router.replace()`, `router.back()` from `expo-router`.
- Use `<Link href="...">` for declarative navigation.
- Pass params via `router.push({ pathname, params })` and read with `useLocalSearchParams()`.

```typescript
import { router, useLocalSearchParams } from 'expo-router';

// Navigate
router.push('/(tabs)/payables');
router.replace('/(auth)/login');

// Typed params
const { id } = useLocalSearchParams<{ id: string }>();
```

---

## Feature Structure

Each feature lives in `src/features/{feature}/`:

```
src/features/payables/
├── use-payables.ts           # useInfiniteQuery list hook
├── use-pay-installment.ts    # useMutation action hook
├── use-create-payable.ts     # useMutation create hook
└── components/
    ├── PayableCard.tsx        # List item card
    └── CreatePayableSheet.tsx # Bottom sheet form
```

### Rules

- One file per hook. No hook file should contain multiple `useQuery`/`useMutation` calls unrelated to the same resource.
- Components within a feature are private to that feature. Only export through the screen file or an `index.ts` if reused.
- `src/shared/components/` is for primitives reused across multiple features.

---

## Data Fetching — TanStack Query v5

### Query Hook Pattern

```typescript
// src/features/payables/use-payables.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { ListResponse, PayableListItem } from '@lib/types';

interface Filters {
  status?: string;
  month?: string;
  vendorId?: string;
}

export function usePayables(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['payables', filters],
    queryFn: ({ pageParam = 1 }) =>
      api
        .get<ListResponse<PayableListItem>>('/payables', {
          params: { ...filters, page: pageParam, limit: 20 },
        })
        .then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      last.meta.hasNextPage ? all.length + 1 : undefined,
  });
}
```

### Mutation Hook Pattern

```typescript
// src/features/payables/use-pay-installment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';

export function usePayInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payableId, installmentId, payload }: PayInput) =>
      api.post(
        `/payables/${payableId}/installments/${installmentId}/pay`,
        payload
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

### Query Key Convention

```
['resource']                    // all records
['resource', filters]           // filtered list
['resource', id]                // single record
['resource', 'summary']         // aggregated data
```

### QueryClient Config (Root Layout)

- `staleTime: 5 * 60 * 1000` — 5 minutes
- `retry: 2`
- On logout: `queryClient.clear()` to flush all cached data.

---

## State Management — Zustand

Only use Zustand for **global client state** (auth session, user info). Server state belongs in TanStack Query.

### Auth Store Pattern

```typescript
// src/lib/auth-store.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  // ...
}));
```

- Access with `useAuthStore((s) => s.field)` (selector pattern for performance).
- Never store server-fetched lists or entity data in Zustand.

---

## Forms — react-hook-form + zod

```typescript
// In a screen or bottom sheet component
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  amount: z.number({ invalid_type_error: 'Valor obrigatório' }).positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data obrigatória'),
  vendorId: z.string().uuid('Fornecedor obrigatório'),
});

type FormData = z.infer<typeof schema>;

export function CreatePayableSheet() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <Controller
      control={control}
      name="amount"
      render={({ field: { onChange, value } }) => (
        <TextInput
          value={String(value ?? '')}
          onChangeText={(v) => onChange(parseFloat(v) || 0)}
          className="..."
        />
      )}
    />
  );
}
```

- All validation messages in **Portuguese**.
- Numeric fields use `z.number()`, not `z.string()`. Parse at the input level.
- Use `Controller` for all controlled inputs — never uncontrolled refs.

---

## Styling — NativeWind v4

### Rules

- All styling uses Tailwind utility classes via `className` prop.
- Never use inline `style={{}}` objects except for dynamic values unavailable in Tailwind (e.g., measured pixel offsets).
- Use the design tokens from `tailwind.config.js`:
  - Colors: `primary-{50–900}`, `success`, `danger`, `warning`, `neutral-{50–900}`
  - Fonts: `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`

### Typography

Always use the `<Text>` component from `@shared/components`, never raw `<Text>` from React Native:

```typescript
import { Text } from '@shared/components';

<Text variant="heading" weight="bold" className="text-neutral-900">Título</Text>
<Text variant="body" className="text-neutral-600">Corpo</Text>
<Text variant="caption" className="text-neutral-400">Legenda</Text>
```

### Layout Primitives

```typescript
// Screens must use ScreenContainer to respect safe areas + tab bar offset
import { ScreenContainer } from '@shared/components';

export default function MyScreen() {
  return (
    <ScreenContainer>
      {/* content */}
    </ScreenContainer>
  );
}
```

### Color Constants

When using colors in JS (e.g., `tintColor` props, chart config), import from `src/lib/colors.ts`, not hardcoded hex values:

```typescript
import { colors } from '@lib/colors';
// colors.primary[500], colors.success, colors.danger, etc.
```

---

## Bottom Sheets — @gorhom/bottom-sheet v5

```typescript
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useRef, useCallback } from 'react';

export function MySheet({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<BottomSheet>(null);

  const open = useCallback(() => sheetRef.current?.expand(), []);
  const close = useCallback(() => sheetRef.current?.close(), []);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={['50%', '90%']}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <BottomSheetView className="flex-1 px-4 pb-8">
        {/* content */}
      </BottomSheetView>
    </BottomSheet>
  );
}
```

- Sheets requiring a scrollable list: use `BottomSheetFlatList` or `BottomSheetScrollView`.
- Every sheet that opens from a FAB or button must be declared at the screen level, not nested inside list items.
- `BottomSheetModalProvider` is already mounted at the root layout — do not add it again.

---

## HTTP Client — Axios + BFF

All requests go through the BFF (Backend For Frontend), not directly to the API.

```typescript
// src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BFF_URL + '/bff',
  timeout: 120_000,
});
```

### Interceptors

- **Request**: Attaches `Authorization: Bearer {accessToken}` from the auth store.
- **Response**: On `401`, queues requests and attempts a token refresh (`POST /auth/refresh`). On refresh failure, calls `logout()` and clears the queue.

### Convention

- Use `api.get<ResponseType>(path, { params })` for queries.
- Use `api.post<ResponseType>(path, body)` for mutations.
- Never call `fetch()` directly. Always use `api`.

---

## Navigation Context — TabBarHeightContext

The custom top tab bar measures its own rendered height and exposes it via context so that `ScreenContainer` can push content below it:

```typescript
// Already provided by (tabs)/_layout.tsx
import { useTabBarHeight } from '@shared/context/tab-bar-height-context';

// ScreenContainer uses this internally — you do not call it manually in screens.
```

- Never hard-code pixel offsets for the tab bar.
- If a screen needs content to start below the tab bar, use `ScreenContainer`.

---

## Performance Patterns

### Infinite Scroll Lists

```typescript
<FlatList
  data={pages.flatMap((p) => p.data)}
  keyExtractor={(item) => item.id}
  onEndReached={hasNextPage ? fetchNextPage : undefined}
  onEndReachedThreshold={0.3}
  onRefresh={refetch}
  refreshing={isRefetching}
  ListEmptyComponent={<EmptyState ... />}
  ListFooterComponent={isFetchingNextPage ? <LoadingState /> : null}
  renderItem={({ item }) => <PayableCard item={item} />}
/>
```

### Memoization

- `React.memo` for list item cards (e.g., `PayableCard`, `InstallmentRow`).
- `useCallback` for callbacks passed to list items.
- `useMemo` only when computation is genuinely expensive — do not add it prematurely.

### Image Loading

- Use `expo-image` for optimized image loading with caching when displaying user/org avatars.

---

## Platform-Aware Code

```typescript
import { Platform } from 'react-native';

const paddingBottom = Platform.OS === 'ios' ? 34 : 16;
```

- `src/lib/secure-storage.ts` is already platform-aware: uses `expo-secure-store` on native and `localStorage` on web (dev only).
- Never access `localStorage` directly in feature code.

---

## Error Handling

- TanStack Query surfaces errors via `isError` / `error` — show `<EmptyState>` with a retry button.
- Mutations: show user-friendly toast/alert on `onError`. All error messages in **Portuguese**.
- Network errors from Axios are caught by the response interceptor. Do not duplicate error handling in hooks.

---

## TypeScript Conventions

- All shared types live in `src/lib/types.ts`. Do not create `types.ts` inside features unless the type is truly feature-local.
- Use `type` (not `interface`) for all type definitions.
- Avoid `any`. Use `unknown` and narrow.
- All props interfaces are co-located with the component file.

```typescript
type PayableCardProps = {
  item: PayableListItem;
  onPay: (installmentId: string) => void;
};

export function PayableCard({ item, onPay }: PayableCardProps) { ... }
```

---

## Naming Conventions

| Item            | Convention         | Example                       |
| --------------- | ------------------ | ----------------------------- |
| Screen files    | kebab-case         | `select-organization.tsx`     |
| Component files | PascalCase         | `PayableCard.tsx`             |
| Hook files      | kebab-case         | `use-pay-installment.ts`      |
| Util/lib files  | kebab-case         | `formatters.ts`               |
| CSS classes     | Tailwind utilities | `className="flex-1 bg-white"` |
| Query keys      | camelCase array    | `['payables', filters]`       |

---

## Checklist for New Screens

1. Create file in `app/(tabs)/` or `app/(auth)/` following expo-router convention.
2. Register in the parent `_layout.tsx` if using Stack.
3. Wrap content in `<ScreenContainer>`.
4. Use `<Text>` from `@shared/components`, never raw RN `Text`.
5. Data fetching: custom hook in `src/features/{feature}/`.
6. Mutations: separate hook file per action.
7. Bottom sheets: declared at screen level, not inside list items.
8. All empty/error/loading states handled.
9. `React.memo` on list item components.
10. All user-visible strings in **Portuguese**.

# Frontend Patterns

## React + Vite Setup

- Framework: React 18 with Vite.
- Structure: `frontend/src/features/{feature}/` for features, `lib/` for utilities, `shared/` for common components.
- Entry: `main.tsx`, `App.tsx`.

## Feature Structure

Each feature: `frontend/src/features/{feature}/`

- `components/` - Reusable components.
- `hooks/` - Custom hooks.
- `pages/{Feature}Page.tsx` - Main page.
- `types.ts` - TypeScript types.
- `utils/` - Helpers.
- `index.ts` - Barrel exports.

## Forms

Use `react-hook-form` + `zod` + MUI:

```typescript
const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
});
const { control, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

## Data Fetching

TanStack Query for API calls:

```typescript
const { data } = useQuery({
  queryKey: ['payables'],
  queryFn: () => api.get('/payables'),
});
const mutation = useMutation({
  mutationFn: data => api.post('/payables', data),
});
```

## State Management

Zustand for global state:

- Auth store with localStorage persistence.
- API client auto-refreshes tokens on 401.

## Components & Hooks

- PascalCase for components.
- Custom hooks for logic reuse.
- MUI for UI components.</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/frontend-patterns.md
# Dashboard — Agent Instructions

React 19 + TanStack Router v1 + TanStack Query v5 SPA. Entry: `src/main.tsx`. Pages in `src/pages/`.

## Data layer — mandatory rules

All data access from pages/components goes through the shared hooks layer. Do NOT call `fetch()` or `api.*` directly inside a page or component file.

### Layout

```
src/lib/
  http/
    client.ts     # thin wrapper over src/api.ts + typed re-exports
    errors.ts     # ApiError class used by the wrapper
  queries/
    keys.ts       # all query-key factories — edit here when adding a domain
    keys.test.ts  # smoke tests — add cases when you add a factory
    <domain>.ts   # queryOptions + useXxx hooks per domain
  mutations/
    <domain>.ts   # useXxx mutation hooks with invalidation
```

Domain files today: `agents`, `analytics`, `approvals`, `channels`, `config`, `goals`, `hands`, `mcp`, `media`, `memory`, `models`, `network`, `overview`, `plugins`, `providers`, `runtime`, `schedules`, `sessions`, `skills`, `workflows`.

### Adding a new endpoint

1. Add the raw call in `src/api.ts` (or re-export via `src/lib/http/client.ts`).
2. If it is a new domain, add a factory in `src/lib/queries/keys.ts` following the hierarchical pattern:
   ```ts
   export const fooKeys = {
     all: ["foo"] as const,
     lists: () => [...fooKeys.all, "list"] as const,
     list: (filters: FooFilters = {}) => [...fooKeys.lists(), filters] as const,
     details: () => [...fooKeys.all, "detail"] as const,
     detail: (id: string) => [...fooKeys.details(), id] as const,
   };
   ```
   Every sub-key MUST be anchored with `...fooKeys.all` so broad invalidation works.
3. Add the query in `src/lib/queries/<domain>.ts`:
   ```ts
   export const fooQueryOptions = (filters?: FooFilters) =>
     queryOptions({
       queryKey: fooKeys.list(filters ?? {}),
       queryFn: () => listFoo(filters),
       staleTime: 30_000,
     });
   export function useFoo(filters?: FooFilters) {
     return useQuery(fooQueryOptions(filters));
   }
   ```
4. Add mutations in `src/lib/mutations/<domain>.ts`. **Every write MUST invalidate**:
   ```ts
   export function useCreateFoo() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: createFoo,
       onSuccess: () => qc.invalidateQueries({ queryKey: fooKeys.all }),
     });
   }
   ```
5. Update `src/lib/queries/keys.test.ts` — at minimum add the new factory to the `all factories exist` list. Add anchoring/hierarchy tests for non-trivial factories.

### Consuming in pages

```tsx
import { useFoo } from "../lib/queries/foo";
import { useCreateFoo } from "../lib/mutations/foo";

function FooPage() {
  const { data, isLoading } = useFoo({ active: true });
  const createFoo = useCreateFoo();
  // ...
}
```

Never build a `queryKey` inline — always call the factory. Never subscribe to the same endpoint with a different key just to get a subset; use `select` on the shared `queryOptions`.

### Exceptions (not cached data)

Streaming / SSE, imperative fire-and-forget control channels (e.g. `src/components/TerminalTabs.tsx` terminal window lifecycle), and one-shot probes that must not be cached may call `fetch` directly. Keep these narrow and comment why.

## Build & verify

```bash
pnpm typecheck                # tsc --noEmit — must be green
pnpm test --run               # vitest — all tests pass
pnpm build                    # vite build — must succeed
```

Run all three after any change to `src/lib/queries/`, `src/lib/mutations/`, or `src/api.ts`. A passing typecheck alone is not enough — the key-factory tests catch anchoring regressions that the compiler does not.

## Conventions

- TypeScript strict. No `any` in new hooks; lean on types from `src/api.ts` or `openapi/generated.ts`.
- Keep `staleTime` / `refetchInterval` in the `queryOptions` (not at call sites) so every consumer shares the same caching policy.
- Mutation invalidation lives in the hook, never at the call site. Callers should not need to know which keys a mutation touches.
- Commit convention matches the root repo: `feat(dashboard/<area>): ...`, `refactor(dashboard/queries): ...`, `fix(dashboard/<area>): ...`. Never include a `Co-Authored-By` footer.

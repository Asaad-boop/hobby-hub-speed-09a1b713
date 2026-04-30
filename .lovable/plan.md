# Migration: TanStack Start → Plain Vite + React Router

## Goal

Pura project ke TanStack Start (SSR framework) theke shoraye **plain Vite + React 19 + React Router DOM v6** e migrate kora. Backend Supabase Edge Functions diye replace kora hobe.

## Important Trade-offs

Migration korle eigula chole jabe:

- **SSR / SEO**: Pages client-side render hobe, initial HTML khali thakbe. Google indexing weak hobe LP/product pages er jonno.
- **Per-route meta tags**: `head()` API thakbe na — `react-helmet-async` use korte hobe.
- **`createServerFn`**: 4 ta file (courier, order-lookup, staff, vercel-deploy) Supabase Edge Functions e port korte hobe.
- **File-based routing**: Manual route table maintain korte hobe.
- **Server routes** (`/api/public/*`): Edge Functions e jabe.
- **Auth middleware** (`requireSupabaseAuth`): Edge Function side e re-implement.

## Scope

### 1. Build/Config Layer

- `vite.config.ts` rewrite: TanStack plugin remove, plain `@vitejs/plugin-react` use.
- `package.json`: `@tanstack/react-start`, `@tanstack/react-router`, `nitro`, `@lovable.dev/vite-tanstack-config` remove. Add `react-router-dom`, `react-helmet-async`.
- `index.html` create (entry HTML).
- `src/main.tsx` create (ReactDOM.createRoot entry).
- `wrangler.jsonc`, `vercel.json` simplify for SPA.
- `tsconfig.json` adjust.

### 2. Routing Layer

- `src/routes/__root.tsx` → `src/App.tsx` (root layout with providers + Routes).
- Sob `createFileRoute(...)` files convert to plain components:
  - `src/routes/index.tsx` → `src/pages/Home.tsx`
  - `src/routes/admin.*` → `src/pages/admin/*`
  - `src/routes/lp.*`, `product.$id`, `category.$slug`, `order-success.$orderId`, `track.$orderId`, etc.
- `<Link to="/foo">` (TanStack) → `<Link to="/foo">` (RR DOM) — API similar but params different.
- `Route.useParams()` / `Route.useLoaderData()` → `useParams()` + manual fetch in `useEffect` / TanStack Query.
- `routeTree.gen.ts` delete.
- `robots.txt`, `sitemap.xml` routes → static files in `public/` ba edge function.

### 3. Server Logic Layer

Migrate to **Supabase Edge Functions** (project already connected):

- `src/lib/courier.functions.ts` → `supabase/functions/courier-stats/`
- `src/lib/order-lookup.functions.ts` → `supabase/functions/order-lookup/`
- `src/lib/staff.functions.ts` → `supabase/functions/staff-mgmt/`
- `src/lib/vercel-deploy.functions.ts` → `supabase/functions/vercel-deploy/`
- `src/routes/api/public/*` (jodi thake) → edge functions.

Client side: `useServerFn(...)` calls → `supabase.functions.invoke(...)`.

### 4. SEO / Meta Layer

- `react-helmet-async` install kore prottek page e `<Helmet>` diye title/description/og tags set kora.
- Root level `<HelmetProvider>` wrap.

### 5. Cleanup

- `src/integrations/supabase/auth-middleware.ts` delete (TanStack-specific).
- `src/lib/server-fn-auth.ts` delete.
- `src/lib/admin.ts`, `permissions.ts` — review for TanStack imports.
- `.lovable/plan.md` update.

## Migration Order (Implementation Steps)

1. **Setup new shell**: `index.html`, `main.tsx`, new `vite.config.ts`, `package.json` deps swap.
2. **Create App.tsx with React Router**: All routes mapped, providers wired (QueryClient, Helmet, Cart, Wishlist).
3. **Convert each route file**: Strip `createFileRoute`, export plain component, fix params/links/loaders.
4. **Port server functions to Edge Functions**: One by one, with proper auth via JWT verification.
5. **Update all `useServerFn` callers** to `supabase.functions.invoke`.
6. **Add Helmet meta tags** to key pages (home, LP, product, category).
7. **Delete dead files**: routeTree.gen, auth-middleware, server-fn-auth, .functions.ts files.
8. **Test build**: `bun run build` should pass; preview should serve all routes.

## Estimated Impact

- **Files touched**: ~60+ files (every route file + supporting libs).
- **Files deleted**: ~10.
- **New edge functions**: 4.
- **Build time**: App will be **broken during migration** until all steps complete.
- **Functionality risk**: High — admin panel, checkout, order tracking, courier integration sob ek shathe re-test korte hobe.

## Recommended Alternative

Bhai, **shotti boli** — current setup TanStack Start + Vite already. "Plain Vite" e jaowar shudhu ekta benefit (simpler mental model), kintu cost onek beshi (SSR loss, SEO loss, sob server fn rewrite). Tumi ki specific kichu problem face kortecho TanStack Start niye? Seta solve kora better hote pare. Plan approve korar age ektu bhabo.

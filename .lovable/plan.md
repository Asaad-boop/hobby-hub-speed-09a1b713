# Full Admin Rebuild — Dashboard + Order Management

Clean slate theke notun admin banabo. DB tables/server functions ja ache shob thakbe (already solid), shudhu UI/UX layer notun + ekta awesome polished feel debo.

## 1. Cleanup (purano shob bad)

Delete korbo:
- `src/routes/admin.*` — shob current admin route files
- `src/components/admin/*` — old shell, sidebar, integration components
- Related orphan components (order list, drawers, web-orders) ja shudhu admin e use hocche

Rakhbo:
- `src/server/orders.functions.ts`, `customers.functions.ts`, `inventory.functions.ts` (already built — verify + extend if needed)
- All DB tables, RLS policies, triggers
- `BDCourierIntegration` logic (move into new structure)

## 2. New Admin Shell

```text
/admin                    -> Dashboard home
/admin/orders             -> Order management (list + drawer)
/admin/orders/$id         -> Full order page (deep link)
/admin/products           -> Coming-soon stub
/admin/customers          -> Coming-soon stub
/admin/settings           -> Coming-soon stub
```

**Shell features:**
- Collapsible sidebar with icons + labels, active state, role-based visibility
- Top bar: global search, notification bell (low stock + new orders count), user menu
- Command palette (⌘K) for quick navigation
- Dark mode toggle
- Toast system for all mutations

## 3. Dashboard (`/admin`)

**KPI strip (4 cards):**
- Today's revenue + % vs yesterday (sparkline)
- Today's orders + pending confirmations badge
- AOV (avg order value) — 7d
- Delivery success rate — 30d

**Charts row:**
- Sales trend (line, last 30 days, switch 7d/30d/90d)
- Top 5 products (horizontal bar)

**Live activity feed (right rail):**
- Recent orders (last 10, click → drawer)
- Low stock alerts
- Pending call queue count
- Abandoned carts count

**Quick actions (sticky top):**
- Pending confirmations (count badge)
- Ready to ship
- Today's deliveries

## 4. Order Management (`/admin/orders`)

**Filter bar:**
- Status tabs with live counts: All / New / Confirmed / Packaging / Shipped / Delivered / Returned / Cancelled
- Search: phone / name / order ID / tracking
- Date range, courier, priority, payment status filters
- Saved views (My pending, Today's deliveries, etc.)

**Table:**
- Checkbox select, order ID, customer (name + phone), items count + total, status pill, courier, age (hours), priority flag, assigned-to avatar
- Pagination (server-side, 25/50/100)
- Row click → drawer; ID click → full page

**Bulk action toolbar (appears on selection):**
- Bulk status transition (with confirmation)
- Bulk assign to staff
- Bulk courier book (Pathao/Steadfast/Redx)
- Bulk export CSV
- Bulk print invoices

**Slide-in drawer (Sheet, right side, 720px):**
- Header: order ID, status pill, priority, quick close
- Tabs:
  - **Overview** — items list, totals, customer info (click-to-call, WhatsApp), shipping address, payment
  - **Timeline** — full status history + activity log (who did what, when)
  - **Notes** — internal notes thread, add new note inline
  - **Courier** — book/track, BDCourier fraud check stats, tracking ID
- Footer action bar: status transition buttons (only valid next states), priority toggle, payment status, assign

**Full order page** (`/admin/orders/$id`) — same content, wider 2-column layout for power users.

## 5. Courier Integration

In drawer "Courier" tab:
- Show BDCourier fraud risk before booking (cached 7 days)
- One-click book to Pathao / Steadfast / Redx (creates `courier_shipments` row)
- Live tracking status pull
- Auto-update `tracking_number`, `courier_name`, `shipped_at` on success

Phase 1 will ship UI + booking call shape; actual provider HTTP calls wired via existing `BD_COURIER_API_KEY` and stub providers ready for keys.

## 6. Design Direction

"Just awesome" interpretation:
- **Aesthetic:** modern SaaS — soft shadows, rounded-xl, generous spacing, gradient accents on KPI cards
- **Color:** semantic tokens in `src/styles.css` — define a fresh primary (deep indigo), success/warning/danger, status-specific tokens (new, confirmed, shipped, delivered, returned, cancelled)
- **Motion:** subtle — drawer slide, fade-in tables, smooth tab transitions (framer-motion already in project)
- **Density:** comfortable on dashboard, compact toggle on orders table
- **Typography:** clear hierarchy, tabular nums for money/counts
- **Empty states:** illustrated, with CTA
- **Loading:** skeleton everywhere, never spinners on full page

## 7. Build Order

1. Define new design tokens + status color system in `styles.css`
2. New admin shell (`AdminShell`, `AppSidebar`, `TopBar`, `CommandPalette`)
3. Dashboard page (KPIs + charts + activity feed) — needs new `dashboard.functions.ts`
4. Orders list page + drawer + full page
5. Courier tab inside drawer
6. Coming-soon stubs for products/customers/settings
7. Polish: animations, empty states, loading skeletons, error boundaries

## Technical Details

- **Routes:** TanStack file-based, `admin.tsx` as layout with `<Outlet />`, child routes flat-dot named
- **Data:** TanStack Query + `ensureQueryData` in loaders, `useSuspenseQuery` in components
- **Server fns:** new `src/server/dashboard.functions.ts` for KPIs + activity; reuse existing orders/customers/inventory
- **Auth gate:** `admin.tsx` layout checks `has_role(admin|customer_service|operations)` server-side, redirects unauthenticated to `/login`
- **State:** URL params for filters/pagination (shareable), Query for cache, optimistic updates on status mutations
- **Charts:** `recharts` (already standard)
- **Tables:** custom built on shadcn `Table` with sticky header, virtualization later if needed

Approve korle shuru kori — step 1 (cleanup + tokens + shell) diye start, then dashboard, then orders. Each step e preview e dekhabo.
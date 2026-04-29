## Goal
HobbyShop admin dashboard ke ekta modern, beautiful, professional design e redesign kori — sathe Payments + Discounts page add kori. Existing functionality ekdom intact thakbe.

## Design Direction
- **Sidebar**: shadcn `Sidebar` component, **collapsible** (icon mode), **light theme** with subtle premium feel — grouped nav (Overview / Catalog / Sales / Customers / Marketing / System), active route indicator, smooth collapse animation.
- **Color system**: Existing dark `#111827` ke replace kori semantic tokens diye — soft white background, indigo/violet primary accent, glassy cards, subtle shadows, rounded-xl, gradient KPI cards.
- **Typography**: Inter, tighter tracking on headers, clear hierarchy.
- **All colors via `src/styles.css` design tokens** — no hardcoded hex in components.

## Pages (sidebar order)

**Overview**
1. Dashboard — KPI cards (Revenue, Orders, Customers, Conversion %), sales chart (recharts, 14-day), low stock list, recent orders.

**Sales**
2. Web Orders — existing, redesigned header/filters.
3. Orders Pipeline — existing, redesigned status tabs (new / processing / shipped / delivered / cancelled).
4. **Payments (NEW)** — derived from `orders` table: Order ID, Customer, Method (bKash/Nagad/Card/COD badge), Amount, Status, Date. Filters by method + status. CSV export. *No new table — cleaner & no data duplication.*

**Catalog**
5. Products — existing, redesigned grid/list.
6. Categories — existing.
7. Inventory — existing low-stock view, polished.

**Customers**
8. Customers — existing.
9. Reviews — existing.

**Marketing**
10. **Discounts (NEW)** — UI on existing `coupons` table: list (code, type, value, used/limit, valid_until, status), create/edit/delete dialog, toggle active. *Uses existing table — no migration needed.*

**Insights**
11. Reports — sales summary table + **CSV export button**.

**System**
12. Settings — store name, currency, timezone (uses existing `site_settings`). Logo upload via existing `product-images` bucket or notun general bucket if needed.

## Technical Plan
- New file: `src/components/admin/AppSidebar.tsx` (shadcn Sidebar, grouped, collapsible).
- Rewrite: `src/components/admin/AdminShell.tsx` to use SidebarProvider + AppSidebar + topbar with SidebarTrigger.
- Update: `src/styles.css` — add admin-specific tokens (sidebar bg, accent, KPI gradients).
- New files:
  - `src/routes/admin.payments.tsx` — derived transactions view.
  - `src/routes/admin.discounts.tsx` — coupons CRUD.
- Light polish on existing admin pages (header style, card style) — no logic changes.
- Reports CSV export button — client-side CSV generation from existing query.

## Out of scope
- No DB migration (Payments derived; Discounts uses existing `coupons`).
- No changes to checkout, orders logic, products schema.
- No customer-facing site changes.

## Risks
- Sidebar collapse + mobile bottom nav — mobile e shadcn Sidebar `offcanvas` mode use korbo, existing bottom nav remove korbo.
- Touching 1 shared file (`AdminShell`) affects all admin pages — visual only, routing intact.
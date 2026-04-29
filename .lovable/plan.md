
# Notun Order Management System (OMS)

Tomar existing Supabase database (orders, products, profiles, courier_shipments tables) use kore notun ekta clean, professional OMS banabo `/admin` route e. Mock data nai — sob real database theke ashbe.

## Page structure (sidebar)

1. **Dashboard** — Today's orders, Confirmed orders, Total revenue, Pending count, status-wise pie chart, recent orders list
2. **Orders** — Main order management with full status flow + actions
3. **Inventory** — Product stock manage, low-stock alerts, stock adjustments
4. **Customers** — Customer list with order history, flagged customers
5. **Reports** — Sales report, courier performance, product performance, date-range filter
6. **Analytics** — Daily/weekly/monthly trends, charts
7. **Settings** — Pathao API credentials, store info, courier settings

## Order status flow (jemon tumi cheyecho)

`Processing → Call Not Received → On Hold → Advance Payment → Confirmed → Cancelled → Shipped → Delivered → Returned`

Database e ei field gula already ase:
- `status` (order_status enum) — main lifecycle
- `confirmation_status` — pending/confirmed/cancelled
- `call_status` — not_called/answered/no_answer/etc.
- `hold_until`, `hold_reason` — hold er jonno
- `advance_amount` — advance payment er jonno
- `cancel_reason`, `return_type`, `return_note`

Ami ekta unified "workflow stage" ber kore frontend e ei 9 ta stage e map korbo, ar action button click korle right field update hobe.

## Orders page — features

- **List view**: filterable table (search, status filter, courier filter, date range)
- **Detail panel**: order click korle right side e khulbe — items, customer info, address, payment, history log
- **Action buttons** (single ba bulk):
  - Move to next status (Processing → Call Not Received → ... → Delivered)
  - **Print Invoice** (PDF download — `src/lib/pdf/invoice.ts` already ase, use korbo)
  - **Print Picking List** (`src/lib/pdf/picking-list.ts` already ase)
  - **1-Click Pathao Courier** — Pathao API call kore consignment create korbe, tracking number save korbe `tracking_number` + `courier_shipments` table e
  - Cancel / Hold / Mark return
  - Add internal note
- **Bulk select**: multiple order ekshathe status update / courier assign
- Live update — Supabase realtime subscription

## Inventory page

- All products list with stock count
- Color-coded: red (0), yellow (≤5), green (healthy)
- Inline stock edit → `stock_movements` table e log hobe
- Low stock filter, search, category filter
- Quick add stock modal

## Pathao integration

- Existing `src/server/pathao.functions.ts` ase, ami eta upgrade korbo
- Settings page e form: Client ID, Client Secret, Store ID, Sender info, Sandbox/Production toggle
- Credentials Supabase secrets e store hobe (already `BD_COURIER_API_KEY` ase, Pathao er jonno notun secrets add korbo)
- 1-click button click = server function call = Pathao OAuth → consignment create → tracking save

## Technical approach

- **Routes**: `/admin/dashboard`, `/admin/orders`, `/admin/inventory`, `/admin/customers`, `/admin/reports`, `/admin/analytics`, `/admin/settings` — separate route files
- **Layout**: `/admin` route a layout with sidebar + outlet (existing `admin.tsx` ke layout banabo)
- **Existing files delete**: mock OMS er files (AdminShell, OrdersPlaceholder, mock-data.ts, ops-store.ts, all `pages/*.tsx` under admin) — sorai diye notun banabo
- **Existing real admin routes** (admin.web-orders, admin.products, etc.) — eitao sorabo karon tumi notun chao
- **Data layer**: `createServerFn` + `requireSupabaseAuth` middleware, RLS respected
- **Auth**: `/admin` ke admin role-protected korbo (existing `has_role` function ase)
- **Realtime**: Supabase channel subscription for live order updates
- **PDF**: existing `src/lib/pdf/*` files use korbo
- **Charts**: recharts (already installed)

## Pre-build steps

1. Pathao API secrets add korbo (PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_STORE_ID) — tumi Settings page theke o set korte parba, kintu server-side default secret hisebe rakhle better
2. Onek admin route file ase (admin.products, admin.web-orders ityadi) — eigula delete korte hobe karon notun chao

## Scope confirmation

- Auth/login system already toiri — tomar admin role login lagbe `/admin` access er jonno
- Database schema change lagbe na — sob field already ase
- Customer-facing site (homepage, product pages, checkout) untouched thakbe — sudhu admin panel notun

---

**Confirm korle ami build start korchi.** Ekta question — Pathao credentials ki ekhon Settings UI theke set korbe (database e store), naki Lovable secrets e add korbe (more secure)?

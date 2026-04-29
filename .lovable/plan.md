
# Order Management System — Full Rebuild Plan

Existing `orders`, `order_items`, `products`, `profiles` tables thakbe — schema extend hobe, data intact thakbe. Kichu kichu legacy column purify korbo.

## What you'll get

Ekta ecommerce-grade order backend, jate thakbe:

1. **Order Pipeline** — clean status flow with timestamps, assigned staff, audit log
2. **Inventory Engine** — real-time stock, variant-wise, low-stock alerts, restock log
3. **Customer 360** — segment, lifetime value, fake/risk flag, order history
4. **Courier Hub** — Pathao / Steadfast / RedX booking + tracking + COD reconciliation + BDCourier fraud check
5. **Admin UI** — single Orders page with everything (no separate pipeline page, as you removed it)

Telegram notify (already ache) — keep as is.

---

## Phase 1 — Database foundation (Migration 1)

### Order status flow (clean enum)

```text
new → confirmed → packaging → packed → ready_to_ship → shipped → in_transit → delivered
                                                              ↘ returned / partial_returned
       ↘ on_hold        ↘ cancelled / fake
```

### Tables (extend, don't replace)

- **orders** — add: `priority` (low/normal/high/urgent), `expected_delivery_date`, `cod_amount`, `payment_status` (unpaid/partial/paid/refunded), `refund_amount`, `customer_ip`, `device_info`. Already has most fields.
- **order_items** — add: `cost_price` (for profit calc), `tax_amount`. Already has variant.
- **order_status_history** (NEW) — every status change with `from_status`, `to_status`, `changed_by`, `reason`, `note`, `at`. Replaces messy `status_log` jsonb.
- **order_notes** (NEW) — threaded notes/comments per order, `is_internal` flag, `created_by`.
- **inventory_movements** (rename existing `stock_movements`, add `variant_id`, `order_id`, `reference_type`)
- **low_stock_alerts** (NEW) — auto-generated when stock < threshold per product/variant.
- **customer_metrics** (NEW view) — materialized per-user: total_orders, ltv, avg_order, last_order, return_rate, fake_count, segment.
- **courier_bookings** (rename `courier_shipments`, add `tracking_url`, `last_synced_at`, `delivery_attempts`, `failure_reason`).
- **fraud_checks** (NEW) — store BDCourier results per phone with score, risk_level, checked_at, expires_at (7 days).

### Functions / triggers

- `transition_order_status(order_id, new_status, reason, note)` — single source of truth, validates allowed transitions, writes to history, fires stock/courier hooks.
- `recalc_customer_metrics(user_id)` — runs on order status change.
- `check_low_stock()` — runs after inventory_movement, inserts/clears low_stock_alerts.
- `auto_fraud_check_on_new_order()` — calls BDCourier check via pg_net (async).
- All RLS policies updated for staff roles.

---

## Phase 2 — Server functions (`src/server/`)

```text
src/server/
├── orders.functions.ts         # list, get, create, update, transition, bulk
├── orders.server.ts            # query helpers, joins
├── inventory.functions.ts      # adjust, restock, history, low-stock
├── customers.functions.ts      # list, get, metrics, flag
├── courier.functions.ts        # exists — extend with book/sync/cod
├── fraud.functions.ts          # BDCourier check + cache
└── reports.functions.ts        # daily revenue, top products, cohorts
```

All authenticated via `requireSupabaseAuth`, role-checked (admin / customer_service / operations).

---

## Phase 3 — Admin UI rebuild

Single `/admin/orders` page (replaces current `web-orders` & old pipeline) with:

- **Top bar**: search, date range, status chips, courier chip, assigned-to, source, tags, saved filters
- **Bulk toolbar**: change status, assign staff, book courier, print invoices, export CSV
- **Table**: virtualized, columns user-toggleable (status, customer, items, total, courier, age, last action)
- **Detail drawer** (slides in, no page reload): customer card, items, payment, courier, status timeline, notes thread, fraud score, quick actions

New supporting pages:
- `/admin/inventory` — extend with low-stock dashboard, variant view, bulk restock
- `/admin/customers/$id` — full customer 360
- `/admin/reports` — already exists, add cohort + courier success rate

---

## Phase 4 — Automation

- BDCourier auto-check on `INSERT` into orders (already partially wired — finalize)
- Auto stock reserve on `confirmed`, release on `cancelled/fake` (already exists — verify)
- Auto courier booking option (per integration setting)
- Telegram notify on new order (already ache — keep)

---

## Build order (so nothing breaks)

```text
Step 1  Migration: new tables + extend orders/order_items + status flow function
Step 2  Server functions: orders + inventory + customers
Step 3  Rewrite /admin/orders page with detail drawer
Step 4  Inventory dashboard upgrade
Step 5  Customer 360 page
Step 6  Courier hub (book + sync) + fraud check finalize
Step 7  Reports + cohort analysis
```

Each step ships independently — preview thik thakbe protibar.

---

## Confirm before I start

1. **Step 1 (Migration) age korbo?** — eta foundation, baki sob er upor depend kore. Tomar approval lagbe migration run korar age.
2. **Existing `web_status` enum + `status_log` jsonb** — eigula ami new `order_status_history` table e migrate kore purono column gulo deprecated kore dibo (drop korbo na, safe).
3. **Build size** — total ~15 file create/edit, ~3 migrations. Ami ek ek step kore korbo, protibar tomar approval er por next step.

**Bolo: "step 1 shuru koro" — ami migration likhe approval er jonno pathabo.**

## Goal
Rebuild `/admin/settings` as a tabbed admin shell with a Live Status header, three configuration tabs (Tracking, General, Advanced), and per-section Save. Phase 1 covers Tracking + General + Live Status. COD, Courier, SEO, Homepage tabs come in Phase 2 (those already have separate admin pages; we'll add links from here).

## Layout

```text
┌───────── PageHeader: Settings ─────────────────────────────────┐
│ LIVE STATUS DASHBOARD (auto-refresh 60s)                        │
│ 🟢 Store · 🟢 Pixel · 🟢 CAPI · 🟢 GA4 · 🟢 Clarity · 🟡 …      │
├──────────────┬──────────────────────────────────────────────────┤
│ Left nav     │ Right content (per-section, own Save button)     │
│ • Tracking   │                                                  │
│ • General    │                                                  │
│ • Advanced   │                                                  │
│ • Staff      │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

VS Code style: left rail = tab list, right pane = active section. Each card has its own Save button (no global save).

## Tab 1 — Tracking
Cards, each with own Save:

1. **Meta Pixel** — Pixel ID (editable, default `2024086381823502`), Enabled toggle. Saves to `site_settings` keys `meta_pixel_id`, `meta_pixel_enabled`.
2. **Meta CAPI** — read-only status card:
   - "Configured ✅" / "Not configured ❌" (checks server env)
   - Test Event Code input (saves to `meta_test_event_code`)
   - `[Send test Purchase event]` button → calls server fn, shows result
   - Link: "Update token in Lovable → Project Settings → Secrets"
   - Link: "Open Events Manager →" (deep link to Meta)
3. **Live Pixel Stats** (last 24h) — counts of `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` from `analytics_events`. Auto-refresh 60s.
4. **GA4** — Measurement ID + Enabled toggle. Keys `ga4_measurement_id`, `ga4_enabled`. Status badge live.
5. **Microsoft Clarity** — Project ID + Enabled toggle. Keys `clarity_project_id`, `clarity_enabled`.

## Tab 2 — General Store
Single form, one Save:
- Store name (`site_title`), tagline (`site_tagline`)
- Logo URL, OG image URL, Favicon URL (text inputs only — no upload yet)
- Contact phone, contact email, address, WhatsApp number
- Social: Facebook, Instagram, TikTok, YouTube
All map to existing keys in `site-settings.ts` (no schema changes — JSONB store).

## Tab 3 — Advanced
The current raw key/value editor (preserved as-is) for any setting not in the typed UI.

## Tab 4 — Staff
Existing user_roles table (moved from main page into its own tab).

## Live Status Dashboard (top of page)
Strip of 6 status pills. Each pulls from one source, refreshed every 60s via React Query:
- **Store** — always 🟢 (page rendered = backend reachable)
- **Meta Pixel** — 🟢 if `meta_pixel_enabled` && `meta_pixel_id` set
- **Meta CAPI** — server fn returns `tokenConfigured: boolean`
- **GA4** — 🟢 if `ga4_measurement_id` set
- **Clarity** — 🟢 if `clarity_project_id` set
- **Pathao** — 🟢 if `erp_courier_settings` row has `pathao` credentials (read-only check)

## Technical

### Server functions (new) — `src/lib/admin-settings.functions.ts`
1. `getTrackingStatus()` → `{ capi: {tokenConfigured, hasTestCode}, pixelId, ga4Id, clarityId, pathaoConfigured }`. Reads `process.env.META_CAPI_TOKEN` and `META_TEST_EVENT_CODE`; admin-gated via `requireSupabaseAuth` + `has_role('admin')`.
2. `getEventCounts24h()` → counts by `event_name` from `analytics_events` last 24h. Admin-gated.
3. `sendTestCapiEvent()` → calls existing `sendMetaCapiEvent` with a synthetic Purchase event using current test code, returns success/failure. Admin-gated.

### Frontend changes
- **Rewrite** `src/routes/admin.settings.tsx` — tabbed shell + Live Status header
- **New** `src/components/admin/settings/LiveStatusBar.tsx`
- **New** `src/components/admin/settings/TrackingTab.tsx` (Pixel, CAPI, Pixel Stats, GA4, Clarity cards)
- **New** `src/components/admin/settings/GeneralTab.tsx`
- **New** `src/components/admin/settings/AdvancedTab.tsx` (existing key/value editor extracted)
- **New** `src/components/admin/settings/StaffTab.tsx` (existing roles table extracted)
- **New** `src/lib/admin-settings.functions.ts`
- Reuse existing `Card`, `Btn`, `Input`, `Badge`, `Loading` from `@/components/admin/ui`

### Storage
- All values → `site_settings` (key/JSONB). Upsert helper `setSetting(key, value)`.
- Sensitive: only CAPI token (kept in Lovable secret, never in DB or browser).
- Reads: bulk fetch all keys once via existing `useSiteSettings()` pattern.

### Access control
- `/admin/settings` already lives in admin shell which gates by role. Server fns additionally `requireSupabaseAuth` + `has_role('admin')` to prevent leaking CAPI status to non-admins.

## Out of scope (Phase 2 — TODOs left as links in tabs)
- COD & Payment Settings
- Courier credentials editor (read-only status only in Live Bar)
- SEO meta editor
- Homepage CMS (already has dedicated admin page — link only)
- File uploads (Supabase Storage bucket setup)

## After completion
1. **Files changed:** `src/routes/admin.settings.tsx` (rewrite) + 4 new tab components + `src/lib/admin-settings.functions.ts`
2. **Sections live:** Live Status, Tracking, General, Advanced, Staff
3. **Live status sources:** `site_settings` (Pixel/GA4/Clarity), `process.env.META_CAPI_TOKEN` (CAPI), `analytics_events` 24h (pixel stats), `erp_courier_settings` (Pathao)

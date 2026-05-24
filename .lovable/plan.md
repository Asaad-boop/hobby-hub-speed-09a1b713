# Checkout Order Bump — Compressed Travel Towel

## Goal
Checkout page e ekta "Add this to your order" bump checkbox dekhabe — **Compressed Travel Towel (10pcs) — ৳199**. User check korle eta cart subtotal e jog hobe and order e ekta extra line item hisebe save hobe.

## Current State
`src/routes/checkout.tsx` te ager scaffolding ache kintu kaaj korche na:
- `const [bump] = useState(false)` — setter nei, toggle kora jay na
- `bumpItem = allProducts[1]` — random product, specific na
- `bumpPrice = 199` hardcoded
- Submission e include hoy (`allItems = bump ? [...items, bumpItem]`)
- Kintu UI te kono checkbox nei

## Changes

**File: `src/routes/checkout.tsx`**

1. `useState` — `[bump, setBump]` korbo (setter expose)
2. `bumpItem` — `allProducts` theke specifically slug `compressed-travel-towel-disposable-face-towel` find korbo (fallback null)
3. `bumpPrice` — `bumpItem?.price ?? 199` (DB price respect korbe)
4. Bump card render — only jodi `bumpItem` exist kore **and** already cart e na thake. Order summary er upore ba payment section er age, ekta highlighted card:
   - Product image (small thumb)
   - Title + "Only ৳199" + old price strikethrough
   - "🎁 Special offer — Add to your order" label
   - Checkbox / toggle button → `setBump(!bump)`
   - Selected hole green border + checkmark
5. Existing `{bump && ...}` summary line ta thakbe (already wired)
6. Submission flow already correct — kichu change lagbe na

## Out of Scope
- DB te new product add (already exists)
- Other pages e cross-sell
- Bump analytics tracking (future)

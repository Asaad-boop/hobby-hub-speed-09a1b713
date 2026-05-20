## Flower Pearl Curtain Buckle — Landing Page Plan

প্রজেক্টে already `lp.aurora-lamp.tsx`, `lp.origami-combo.tsx`, `lp.scratch-art-hue-board.tsx` এর মতো landing page pattern আছে — সেই same pattern follow করে নতুন route তৈরি করব।

### Route

- New file: `src/routes/lp.flower-pearl-curtain-buckle.tsx` → URL: `/lp/flower-pearl-curtain-buckle`
- SEO meta (title, description, og:*) + canonical
- Reuses existing checkout/order flow (`placeOrder` server fn) ঠিক aurora-lamp এর মতো

### Assets (user uploads → `src/assets/`)

- `curtain-buckle-before-after.webp` (before/after hero)
- `curtain-buckle-basket.jpg` (lifestyle in basket)
- `curtain-buckle-hand.webp` (size/hand reference)
- `curtain-buckle-brown.webp` (brown pair in use)
- `curtain-buckle-beige.webp` (beige pair in use)

### Page Sections (top → bottom)

1. **Sticky Top Banner** — "🌸 Free Delivery on 6 Pcs Set | Cash on Delivery"
2. **Hero**
  - Left: Before/After image, badges (COD, 7-day return, In stock)
  - Right: Title (Bangla + English), short pitch, rating stars, price range (৳549 – ৳899), "এখনই অর্ডার করুন" CTA → scrolls to order form
3. **Why You Need It** — 4 icon cards: Clean look, No drilling, Magnetic close, Reusable
4. **Color Options** — Beige & Brown swatches with lifestyle photo for each
5. **Variant & Pricing Cards** (3 cards, click-to-select, syncs with order form)
  - 3 Pcs Set — ৳549
  - 4 Pcs Set — ৳699
  - 6 Pcs Set — ৳899 (Best Value badge)
6. **How It Works** — 3 steps: Wrap around curtain → Magnet snap → Pearl tassel drops elegantly
7. **Lifestyle Gallery** — 4 image grid (room shots, nursery, hand-held detail)
8. **Specifications** — Material (fabric flower + braided rope + pearl + magnet), petal size, rope length, weight
9. **Social Proof** — 3-4 customer review cards (Bangla testimonials, star ratings)
10. **FAQ Accordion** — Magnet kotota strong? Pordar size matter kore? Wash kora jabe? Delivery koto din?
11. **Order Form** (the conversion section)
  - Variant selector (3/4/6 Pcs)
    - Color selector (Beige / Brown)
    - Name, Phone, District (BD_DISTRICTS dropdown), Full address, Note
    - Shipping: Inside Dhaka ৳70 / Outside ৳130
    - Live order summary (subtotal + shipping + total)
    - Big "অর্ডার কনফার্ম করুন (Cash on Delivery)" button
    - Submits via existing `placeOrder` server fn → redirects to `/order-success/$orderId`
12. **Floating mobile bottom bar** — Price + "Order Now" button (scrolls to form)

### Backend / DB

- কোনো নতুন backend লাগবে না — existing `placeOrder` server fn & `products` table reuse করব
- প্রোডাক্টটি `products` table এ insert করতে হবে (slug: `flower-pearl-curtain-buckle`) — title, description, base price, image, stock সহ — যাতে order flow valid product ID পায়
- Variants 3 টি price option হিসেবে landing page UI তে handle হবে; line item হিসেবে quantity/variant note pass করব order এর সাথে

### Design tokens

- Soft, cozy home-decor palette: cream/beige background, warm brown accents, pearl-white highlights — সব semantic tokens (`src/styles.css`) থেকে। কোনো hardcoded color না।
- Typography: existing site fonts; serif touch headings এ optional।
- Mobile-first responsive, smooth scroll, subtle fade-in animations।

### Tracking

- `fbTrack("ViewContent")` on mount
- `fbTrack("AddToCart")` on variant select
- `fbTrack("InitiateCheckout")` on form focus
- `fbTrack("Purchase")` after success (existing pattern)

### Deliverables

1. `src/routes/lp.flower-pearl-curtain-buckle.tsx` (new)
2. 5 image assets copied into `src/assets/`
3. One migration/insert to add the product row (so order succeeds)

Confirm করলে implement শুরু করব।  
  
  
new ekta shundor pattern e koro

&nbsp;

&nbsp;

&nbsp;
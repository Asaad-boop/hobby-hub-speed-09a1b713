## Color & Package Selector — Premium Redesign

দুটো selector ke aro premium, conversion-friendly আর tactile feel দেব। শুধু এই দুই section ই touch করব, বাকি page unchanged।

### 1. Color Selector (Color Showcase section)

**Current:** Big 2-column image cards with small swatch + "Selected" badge — feels flat।

**New design:**
- Section heading এ ছোট "Step 1 of 2" pill (visual flow cue)
- Side-by-side cards with:
  - Bigger lifestyle image with subtle gradient overlay at bottom
  - **Floating circular swatch** (overlapping image bottom-edge) — bigger, ring outline, glossy highlight
  - Active state: thick warm-brown ring + soft glow shadow + tiny "✓" check inside the swatch
  - Inactive: hover lifts card slightly, swatch ring stays subtle
  - Color name typography larger + Bangla mini tagline (e.g. "Warm & Neutral" / "Rich & Bold")
  - Animated "Selected" pill slides in from bottom when active
- Mobile: 2 columns retained (already small viewport friendly), but card height adjusted so swatch never clips

### 2. Package Selector (Pricing/Packs section)

**Current:** 3 equal cards, flat layout, badge top-right।

**New design:**
- Heading এ "Step 2 of 2" pill
- 3 cards in grid; **middle/best card scaled up** (md:scale-105) with thicker accent border and a glossy gradient header strip ("⭐ Best Value")
- Each card structured top→bottom:
  1. Top ribbon (only on badged packs) — gradient bg, white text
  2. Big pack icon (Flower2) in a soft circle background
  3. Pack label (e.g. "4 Pcs Set")
  4. **Price row redesign**: huge price + small "৳" + old price strikethrough on right with red "Save ৳X" pill below
  5. Per-pc cost in muted small text
  6. **Mini benefits list** (3 ticks): "Free gift wrap" / "COD Available" / "7-day return" — subtle
  7. CTA pill at bottom — when active: filled brown with check + "Selected"; when inactive: outlined "Tap to choose"
- Active card: thicker border, elevated shadow, subtle warm-tint background, scale-[1.02]
- Smooth transition (200ms) between states
- Mobile (390px): stack vertically, badged card still slightly emphasized via border + ribbon (no scale to avoid overflow)

### Microinteractions

- Both selectors: `transition-all duration-200`, active card gets soft glow shadow using existing warm-brown token
- Tap feedback: brief scale-down on press (`active:scale-[0.98]`)
- Keep all existing `fbTrack("AddToCart")` and state logic — purely visual upgrade

### Files

- `src/routes/lp.flower-pearl-curtain-buckle.tsx` — only the Color Showcase block (~lines 487–540) and Pricing/Packs block (~lines 542–610)

কোনো backend, state, বা analytics logic change নেই — pure UI polish।

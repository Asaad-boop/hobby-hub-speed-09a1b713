import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_title: string;
  site_tagline: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string; // digits only with country code, e.g. 8801865230553
  whatsapp_message: string;
  address: string;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  hero_badge: string;
  hero_heading: string;
  hero_heading_highlight: string;
  hero_subheading: string;
  free_delivery_threshold: number;
  // Homepage CMS (legacy fields — still consumed by section configs)
  hero_product_ids: string[];
  homepage_banner_url: string;
  homepage_banner_link: string;
  featured_product_ids: string[];
  new_arrival_product_ids: string[];
  reels: ReelItem[];
  // Advanced homepage builder
  homepage_sections: HomepageSection[];
};

export type ReelItem = {
  id: string;
  video_url: string;
  caption: string;
  product_id: string;
};

// ===== Homepage section types =====
export type SectionType =
  | "hero"
  | "video_hero"
  | "banner"
  | "categories"
  | "products"
  | "reels"
  | "rich_text"
  | "image_with_text"
  | "category_grid"
  | "testimonials"
  | "newsletter"
  | "countdown"
  | "trust_badges"
  | "track_order"
  | "faq"
  | "brand_logos"
  | "spacer";

export type HomepageSection = {
  id: string;
  type: SectionType;
  enabled: boolean;
  config: Record<string, unknown>;
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero showcase",
  video_hero: "Video hero",
  banner: "Promotional banner",
  categories: "Category cards",
  products: "Product grid",
  reels: "Watch & Shop reels",
  rich_text: "Rich text",
  image_with_text: "Image with text",
  category_grid: "Category image grid",
  testimonials: "Customer reviews",
  newsletter: "Newsletter signup",
  countdown: "Countdown timer",
  trust_badges: "Trust badges",
  track_order: "Track order box",
  faq: "FAQ accordion",
  brand_logos: "Brand logos strip",
  spacer: "Spacer",
};

export const SECTION_DEFAULT_CONFIG: Record<SectionType, Record<string, unknown>> = {
  hero: { product_ids: [] as string[] },
  banner: { image_url: "", link: "", caption: "" },
  categories: { heading: "Shop by Category", subheading: "Find exactly what you need" },
  products: {
    heading: "Trending Now",
    subheading: "Most loved by our customers",
    source: "featured", // 'featured' | 'new_arrival' | 'manual'
    product_ids: [] as string[],
    columns: 4,
    badge: "",
    badge_color: "primary",
  },
  reels: { heading: "Watch & Shop" },
  rich_text: {
    heading: "About our store",
    body: "Write something great here.",
    align: "center",
    cta_label: "",
    cta_link: "",
    background: "muted",
  },
  image_with_text: {
    image_url: "",
    heading: "Featured collection",
    body: "Tell a story about your products.",
    cta_label: "Shop now",
    cta_link: "/shop",
    image_position: "left",
  },
  category_grid: {
    heading: "Browse collections",
    items: [] as Array<{ image_url: string; label: string; link: string }>,
  },
  testimonials: { heading: "Customer Reviews", subheading: "Real feedback from happy customers" },
  newsletter: {
    heading: "Get 10% off your first order",
    subheading: "Subscribe for exclusive offers and new drops.",
    button_label: "Subscribe",
    success_message: "Thanks! Check your inbox soon.",
  },
  countdown: {
    heading: "Flash Sale ends in",
    subheading: "Limited time offers — don't miss out!",
    target_iso: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    cta_label: "Shop the sale",
    cta_link: "/shop",
  },
  trust_badges: {},
  track_order: {},
  spacer: { size: "md" }, // sm | md | lg
  video_hero: {
    video_url: "",
    poster_url: "",
    heading: "Discover what's new",
    subheading: "Bold drops, fast delivery — built for hobbyists.",
    cta_label: "Shop now",
    cta_link: "/shop",
    overlay_opacity: 0.45,
    height: "lg",
  },
  faq: {
    heading: "Frequently asked questions",
    subheading: "Everything you need to know before you buy.",
    items: [
      { q: "How long does delivery take?", a: "Usually 1–3 days inside Dhaka, 2–5 days outside." },
      { q: "Do you offer Cash on Delivery?", a: "Yes — COD is available nationwide in Bangladesh." },
    ] as Array<{ q: string; a: string }>,
  },
  brand_logos: {
    heading: "As featured by",
    grayscale: true,
    items: [] as Array<{ image_url: string; alt: string; link: string }>,
  },
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: "sec_hero", type: "hero", enabled: true, config: SECTION_DEFAULT_CONFIG.hero },
  { id: "sec_banner", type: "banner", enabled: true, config: SECTION_DEFAULT_CONFIG.banner },
  { id: "sec_cats", type: "categories", enabled: true, config: SECTION_DEFAULT_CONFIG.categories },
  {
    id: "sec_new",
    type: "products",
    enabled: true,
    config: {
      heading: "New Arrivals",
      subheading: "Fresh drops handpicked for you",
      source: "new_arrival",
      product_ids: [],
      columns: 4,
      badge: "Just In",
      badge_color: "emerald",
    },
  },
  { id: "sec_reels", type: "reels", enabled: true, config: SECTION_DEFAULT_CONFIG.reels },
  {
    id: "sec_trending",
    type: "products",
    enabled: true,
    config: {
      heading: "Trending Now",
      subheading: "Most loved by our customers this week",
      source: "featured",
      product_ids: [],
      columns: 4,
      badge: "",
      badge_color: "primary",
    },
  },
  { id: "sec_track", type: "track_order", enabled: true, config: {} },
  { id: "sec_reviews", type: "testimonials", enabled: true, config: SECTION_DEFAULT_CONFIG.testimonials },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "HobbyShop",
  site_tagline: "Touch Your Dream",
  logo_url: "",
  contact_email: "support@hobbyshopbd.com",
  contact_phone: "09638779900",
  whatsapp_number: "8801865230553",
  whatsapp_message: "Hi HobbyShop! I have a question about your products.",
  address: "Dhaka, Bangladesh",
  social_facebook: "https://www.facebook.com/hobbyshopbd.shop",
  social_instagram: "https://www.instagram.com/hobbyshopbd",
  social_youtube: "",
  hero_badge: "Flash Sale · Trending in Bangladesh",
  hero_heading: "শখের প্রোডাক্টের একমাত্র ঠিকানা",
  hero_heading_highlight: "HobbyShop",
  hero_subheading:
    "Curated gadgets, decor & gifts shipped fast. Free delivery over ৳1500 — Cash on Delivery nationwide.",
  free_delivery_threshold: 1500,
  hero_product_ids: [],
  homepage_banner_url: "",
  homepage_banner_link: "",
  featured_product_ids: [],
  new_arrival_product_ids: [],
  reels: [],
  homepage_sections: DEFAULT_HOMEPAGE_SECTIONS,
};

export const SITE_SETTINGS_KEY = "site_config";

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", SITE_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  const value = (data?.value ?? {}) as Partial<SiteSettings>;
  const merged: SiteSettings = { ...DEFAULT_SETTINGS, ...value };
  // If sections never set OR empty, fall back to defaults built from legacy fields
  if (!merged.homepage_sections || merged.homepage_sections.length === 0) {
    merged.homepage_sections = DEFAULT_HOMEPAGE_SECTIONS;
  }
  return merged;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_SETTINGS,
  });
}

export async function saveSiteSettings(settings: SiteSettings) {
  const payload = {
    key: SITE_SETTINGS_KEY,
    value: settings as unknown as Record<string, unknown>,
  };
  const { error } = await supabase
    .from("site_settings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(payload as any, { onConflict: "key" });
  if (error) throw error;
}

export function newSection(type: SectionType): HomepageSection {
  return {
    id: `sec_${type}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    enabled: true,
    config: JSON.parse(JSON.stringify(SECTION_DEFAULT_CONFIG[type] ?? {})),
  };
}

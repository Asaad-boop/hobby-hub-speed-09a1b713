import {
  newSection,
  SECTION_DEFAULT_CONFIG,
  type HomepageSection,
  type SectionType,
} from "@/lib/site-settings";

export type SectionTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string; // emoji for quick visual scan
  build: () => HomepageSection[];
};

function make(type: SectionType, configOverride: Record<string, unknown> = {}): HomepageSection {
  const sec = newSection(type);
  sec.config = { ...SECTION_DEFAULT_CONFIG[type], ...sec.config, ...configOverride };
  return sec;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: "tpl_sale",
    label: "Flash Sale combo",
    description: "Countdown + featured products + banner — perfect for campaigns.",
    icon: "🔥",
    build: () => [
      make("countdown", {
        heading: "⚡ Flash Sale ends in",
        subheading: "Up to 60% off — limited time only",
        cta_label: "Shop the sale",
        cta_link: "/shop",
      }),
      make("products", {
        heading: "Sale Picks",
        subheading: "Hottest deals right now",
        source: "featured",
        badge: "Hot Deal",
        badge_color: "rose",
        columns: 4,
      }),
      make("banner", { caption: "Banner image upload korun" }),
    ],
  },
  {
    id: "tpl_storytelling",
    label: "Storytelling combo",
    description: "Image-with-text + rich text + testimonials.",
    icon: "📖",
    build: () => [
      make("image_with_text", {
        heading: "Built for hobbyists",
        body: "Apnar shokher proti amader passion. Every product hand-picked for quality.",
        cta_label: "Our story",
        cta_link: "/about",
      }),
      make("rich_text", {
        heading: "Why thousands trust us",
        body: "Cash on delivery · 7-day return · Authentic products only.",
        background: "muted",
      }),
      make("testimonials"),
    ],
  },
  {
    id: "tpl_lookbook",
    label: "Lookbook combo",
    description: "Category grid + reels + new arrivals — ideal for visual browsing.",
    icon: "🎨",
    build: () => [
      make("category_grid", {
        heading: "Shop the look",
        items: [],
      }),
      make("reels", { heading: "Watch & Shop" }),
      make("products", {
        heading: "New Arrivals",
        source: "new_arrival",
        badge: "Just In",
        badge_color: "emerald",
      }),
    ],
  },
  {
    id: "tpl_launch",
    label: "Product launch",
    description: "Video hero + countdown + product grid + FAQ.",
    icon: "🚀",
    build: () => [
      make("video_hero", {
        heading: "The drop is here",
        subheading: "Limited stock — first come, first served.",
        cta_label: "Shop the drop",
        cta_link: "/shop",
      }),
      make("countdown", {
        heading: "Sale ends in",
        cta_label: "Buy now",
        cta_link: "/shop",
      }),
      make("products", {
        heading: "The Collection",
        source: "new_arrival",
        columns: 4,
      }),
      make("faq"),
    ],
  },
  {
    id: "tpl_brand_trust",
    label: "Brand & trust",
    description: "Brand logos + trust badges + newsletter — build credibility.",
    icon: "🛡️",
    build: () => [
      make("brand_logos"),
      make("trust_badges"),
      make("newsletter"),
    ],
  },
];

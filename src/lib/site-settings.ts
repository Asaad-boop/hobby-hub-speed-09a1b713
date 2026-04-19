import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_title: string;
  site_tagline: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string; // digits only with country code, e.g. 8801964437520
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
};

export const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "HobbyShop",
  site_tagline: "Touch Your Dream",
  logo_url: "",
  contact_email: "support@hobbyshopbd.com",
  contact_phone: "09638779900",
  whatsapp_number: "8801964437520",
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
  return { ...DEFAULT_SETTINGS, ...value };
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

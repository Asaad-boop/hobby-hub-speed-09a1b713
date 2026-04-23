import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import HomepageRenderer from "@/components/HomepageRenderer";
import { fetchSiteSettings } from "@/lib/site-settings";
import { productsQueryOptions } from "@/lib/products";

const siteSettingsQueryOptions = () =>
  queryOptions({
    queryKey: ["site_settings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/")({
  // Only await site_settings (small + needed for hero text/banner).
  // Kick off products fetch in background — hero has fallback content,
  // so we don't block first paint on the larger products query.
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(productsQueryOptions());
    await queryClient.prefetchQuery(siteSettingsQueryOptions());
    return null;
  },
  head: () => ({
    meta: [
      { title: "HobbyShop — Upgrade Your Space Instantly" },
      { name: "description", content: "Trending gadgets, DIY kits, home decor and gifts. Cash on delivery across Bangladesh." },
      { property: "og:title", content: "HobbyShop — Upgrade Your Space Instantly" },
      { property: "og:description", content: "Unique gadgets & gifts at unbeatable prices." },
    ],
    links: [
      // Warm up Supabase connection earlier so product images / API calls start sooner.
      { rel: "preconnect", href: "https://bgsspipkjeuceftuatue.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://bgsspipkjeuceftuatue.supabase.co" },
    ],
  }),
  component: Index,
});

function Index() {
  return <HomepageRenderer />;
}

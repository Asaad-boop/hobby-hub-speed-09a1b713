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
  // Prefetch in parallel on the server so first paint already has data.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.prefetchQuery(siteSettingsQueryOptions()),
      queryClient.prefetchQuery(productsQueryOptions()),
    ]);
    return null;
  },
  head: () => ({
    meta: [
      { title: "HobbyShop — Upgrade Your Space Instantly" },
      { name: "description", content: "Trending gadgets, DIY kits, home decor and gifts. Cash on delivery across Bangladesh." },
      { property: "og:title", content: "HobbyShop — Upgrade Your Space Instantly" },
      { property: "og:description", content: "Unique gadgets & gifts at unbeatable prices." },
    ],
  }),
  component: Index,
});

function Index() {
  return <HomepageRenderer />;
}

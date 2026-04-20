import { createFileRoute } from "@tanstack/react-router";
import HomepageRenderer from "@/components/HomepageRenderer";

export const Route = createFileRoute("/")({
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

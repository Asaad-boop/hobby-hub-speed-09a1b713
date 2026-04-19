import { createFileRoute } from "@tanstack/react-router";
import { fetchAllProducts } from "@/lib/products";

const SITE_URL = "https://hobby-hub-speed.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = [
          "", "/shop", "/about", "/contact", "/faq", "/shipping",
          "/returns", "/privacy", "/terms", "/wishlist", "/track", "/request",
          "/category/home-decor", "/category/gadgets", "/category/diy-kits",
        ];
        const allProducts = await fetchAllProducts().catch(() => []);
        const productPaths = allProducts.map((p) => `/product/${p.id}`);
        const all = [...staticPaths, ...productPaths];
        const today = new Date().toISOString().split("T")[0];
        const urls = all
          .map(
            (p) => `  <url>
    <loc>${SITE_URL}${p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p === "" ? "daily" : "weekly"}</changefreq>
    <priority>${p === "" ? "1.0" : p.startsWith("/product/") ? "0.8" : "0.6"}</priority>
  </url>`
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

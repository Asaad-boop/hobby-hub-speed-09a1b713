import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://hobby-hub-speed.lovable.app";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = `User-agent: *
Allow: /
Disallow: /account
Disallow: /checkout
Disallow: /reset-password
Disallow: /order-success/

Sitemap: ${SITE_URL}/sitemap.xml
`;
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});

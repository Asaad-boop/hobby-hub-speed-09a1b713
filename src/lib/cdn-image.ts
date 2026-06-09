// Free image-CDN proxy. Rewrites Supabase Storage public URLs to go through
// images.weserv.nl, which caches aggressively on its own edge network.
// Result: each image is fetched from Supabase ~once, then served from
// wsrv.nl forever — Supabase cached-egress drops to near zero.
//
// wsrv.nl is free, no auth, unlimited bandwidth. Docs: https://wsrv.nl/

const SUPABASE_STORAGE_HOST = "bgsspipkjeuceftuatue.supabase.co";

export function cdnImage(url: string | null | undefined, width?: number): string {
  if (!url) return "";
  // Skip data URIs, already-proxied, or non-Supabase URLs
  if (url.startsWith("data:")) return url;
  if (url.includes("wsrv.nl")) return url;
  if (!url.includes(SUPABASE_STORAGE_HOST)) return url;

  // Strip protocol — wsrv accepts host+path
  const stripped = url.replace(/^https?:\/\//, "");
  const params = new URLSearchParams({ url: stripped });
  if (width) params.set("w", String(width));
  params.set("we", ""); // don't enlarge
  params.set("q", "82"); // good quality, smaller files
  return `https://wsrv.nl/?${params.toString()}`;
}

export function cdnImages(urls: (string | null | undefined)[], width?: number): string[] {
  return urls.map((u) => cdnImage(u, width)).filter(Boolean) as string[];
}

// Free image-CDN proxy. Any http(s) image URL (Supabase Storage, Cloudinary,
// R2, ImgBB, raw GitHub, etc.) is rewritten to go through images.weserv.nl,
// which caches the original on its own edge network forever and serves
// resized/optimized variants. Result: Supabase / origin egress drops to
// near-zero, and listing pages only transfer ~400px thumbnails instead of
// full-size originals.
//
// wsrv.nl is free, no auth, unlimited bandwidth. Docs: https://wsrv.nl/

import type { SyntheticEvent } from "react";

// Inline SVG fallback shown when an image URL is missing or fails to load.
export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='20' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3ENo image%3C/text%3E%3C/svg%3E";

/**
 * Proxy an image URL through wsrv.nl, optionally resizing to `width` px.
 * Idempotent: re-calling on an already-proxied URL re-applies the new width
 * by unwrapping the inner `url` param and re-wrapping.
 */
export function cdnImage(url: string | null | undefined, width?: number): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith("data:")) return url;
  // Relative paths / blob: URLs — leave alone.
  if (!/^https?:\/\//i.test(url)) return url;

  let target = url;
  // If already a wsrv URL, unwrap to original so we can re-set width/quality.
  if (url.includes("wsrv.nl")) {
    try {
      const u = new URL(url);
      const inner = u.searchParams.get("url");
      if (inner) {
        target = /^https?:\/\//i.test(inner) ? inner : `https://${inner}`;
      }
    } catch {
      // fall through, keep original
    }
  }

  const stripped = target.replace(/^https?:\/\//, "");
  const params = new URLSearchParams({ url: stripped });
  if (width) params.set("w", String(width));
  params.set("we", ""); // don't enlarge past native size
  params.set("q", "82"); // good quality, smaller files
  params.set("output", "webp"); // serve webp when possible
  return `https://wsrv.nl/?${params.toString()}`;
}

export function cdnImages(urls: (string | null | undefined)[], width?: number): string[] {
  return urls.map((u) => cdnImage(u, width)).filter(Boolean) as string[];
}

/**
 * Drop-in onError handler for <img> tags. Swaps to the inline fallback once
 * (won't loop if the fallback itself fails).
 */
export function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  img.src = FALLBACK_IMAGE;
}

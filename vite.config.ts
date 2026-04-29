// Vite config for Vercel deployment.
//
// We disable the Cloudflare plugin from the Lovable preset and use Nitro
// instead. Nitro auto-detects Vercel via the `VERCEL` env var that Vercel
// sets during builds, and emits to `.vercel/output` which Vercel picks up
// automatically (Build Output API). No `vercel.json` rewrites are needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  // Disable the Cloudflare Workers plugin from the Lovable preset.
  cloudflare: false,
  // Nitro handles SSR + server functions for Vercel (and produces a Node
  // build for `vite preview` / local production runs).
  plugins: [nitro()],
});

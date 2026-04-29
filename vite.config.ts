// Vite config.
//
// - On Vercel (VERCEL=1): disable Cloudflare and add Nitro. Nitro auto-detects
//   Vercel and emits `.vercel/output` (Build Output API), so server functions
//   run as a Vercel serverless function instead of a Cloudflare Worker.
// - In the Lovable sandbox / local builds: keep the default Cloudflare-based
//   preset which produces a regular `dist/` output expected by sandbox CI.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  cloudflare: isVercel ? false : undefined,
  plugins: isVercel ? [nitro()] : [],
});

// @lovable.dev/vite-tanstack-config already includes TanStack Start, React,
// Tailwind, tsconfig paths, and Cloudflare defaults. For Vercel deployments,
// we add Nitro only outside the Lovable sandbox build.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => ({
  plugins: mode === "development" ? [] : [nitro()],
}));

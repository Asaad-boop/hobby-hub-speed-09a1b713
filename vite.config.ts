// @lovable.dev/vite-tanstack-config already includes TanStack Start, React,
// Tailwind, tsconfig paths, and Cloudflare defaults. For Vercel deployments,
// we switch the nitro preset to Vercel.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
});

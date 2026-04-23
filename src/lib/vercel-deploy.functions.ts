import { createServerFn } from "@tanstack/react-start";

/**
 * Triggers a Vercel redeploy by POSTing to a Deploy Hook URL.
 * The hook URL is stored as VERCEL_DEPLOY_HOOK_URL secret on the server.
 *
 * Create a hook at: Vercel → Project → Settings → Git → Deploy Hooks
 */
export const triggerVercelRedeploy = createServerFn({ method: "POST" }).handler(
  async () => {
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

    if (!hookUrl) {
      return {
        success: false,
        error:
          "VERCEL_DEPLOY_HOOK_URL secret is not set. Add it in Lovable Cloud secrets.",
      };
    }

    try {
      const res = await fetch(hookUrl, { method: "POST" });
      const text = await res.text();

      if (!res.ok) {
        return {
          success: false,
          error: `Vercel responded ${res.status}: ${text.slice(0, 200)}`,
        };
      }

      // Vercel returns JSON with job info, e.g. { "job": { "id": "...", "state": "PENDING" } }
      let job: unknown = null;
      try {
        job = JSON.parse(text);
      } catch {
        /* ignore */
      }

      return {
        success: true,
        triggeredAt: new Date().toISOString(),
        job,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
);

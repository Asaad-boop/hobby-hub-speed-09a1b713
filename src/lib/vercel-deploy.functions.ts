import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Get latest commit info from GitHub main branch.
 * ADMIN ONLY — exposes repo identity and commit metadata.
 */
export const getLatestGithubCommit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Verify admin role
    const { data: rolesRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!rolesRow || rolesRow.length === 0) {
      return { success: false as const, error: "Forbidden" };
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubToken || !githubRepo) {
      return {
        success: false as const,
        error: "Deployment info not configured",
      };
    }

    try {
      const ghRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/commits/main`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "lovable-deploy-check",
          },
        },
      );
      if (!ghRes.ok) {
        // Generic error to caller; details kept server-side only
        console.error(
          `GitHub API error ${ghRes.status}: ${(await ghRes.text()).slice(0, 200)}`,
        );
        return {
          success: false as const,
          error: "Failed to fetch deployment info",
        };
      }
      const ghJson = (await ghRes.json()) as {
        sha: string;
        html_url: string;
        commit: { message: string; committer: { date: string } };
      };
      return {
        success: true as const,
        sha: ghJson.sha,
        shortSha: ghJson.sha.slice(0, 7),
        commitMessage: ghJson.commit.message.split("\n")[0],
        committedAt: ghJson.commit.committer.date,
        commitUrl: ghJson.html_url,
        checkedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error("GitHub commit fetch failed:", e);
      return {
        success: false as const,
        error: "Failed to fetch deployment info",
      };
    }
  });

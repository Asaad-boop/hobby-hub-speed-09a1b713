import { createServerFn } from "@tanstack/react-start";

const VERCEL_API = "https://api.vercel.com";

function vercelHeaders() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

function teamQuery() {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
}

/**
 * Get latest production deployment info from Vercel + latest GitHub main commit,
 * and report whether they match.
 */
export const getDeploymentStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // format: "owner/repo"

    if (!projectId || !vercelToken) {
      return {
        success: false as const,
        error: "VERCEL_PROJECT_ID or VERCEL_API_TOKEN not set",
      };
    }

    try {
      // Latest production deployment
      const depUrl =
        `${VERCEL_API}/v6/deployments?projectId=${encodeURIComponent(projectId)}` +
        `&target=production&limit=1&state=READY${teamQuery()}`;
      const depRes = await fetch(depUrl, { headers: vercelHeaders() });
      if (!depRes.ok) {
        return {
          success: false as const,
          error: `Vercel API ${depRes.status}: ${(await depRes.text()).slice(0, 200)}`,
        };
      }
      const depJson = (await depRes.json()) as {
        deployments?: Array<{
          uid: string;
          url: string;
          state: string;
          readyState: string;
          created: number;
          meta?: Record<string, string>;
          target?: string;
        }>;
      };
      const dep = depJson.deployments?.[0];

      const vercelSha = dep?.meta?.githubCommitSha ?? null;
      const vercelCommitMsg = dep?.meta?.githubCommitMessage ?? null;
      const vercelDeployedAt = dep?.created ? new Date(dep.created).toISOString() : null;
      const vercelUrl = dep?.url ? `https://${dep.url}` : null;

      // Latest GitHub main commit (optional)
      let githubSha: string | null = null;
      let githubCommitMsg: string | null = null;
      let githubCommittedAt: string | null = null;
      let githubError: string | null = null;

      if (githubToken && githubRepo) {
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
          if (ghRes.ok) {
            const ghJson = (await ghRes.json()) as {
              sha: string;
              commit: { message: string; committer: { date: string } };
            };
            githubSha = ghJson.sha;
            githubCommitMsg = ghJson.commit.message.split("\n")[0];
            githubCommittedAt = ghJson.commit.committer.date;
          } else {
            githubError = `GitHub API ${ghRes.status}`;
          }
        } catch (e) {
          githubError = e instanceof Error ? e.message : String(e);
        }
      } else {
        githubError = "GITHUB_TOKEN or GITHUB_REPO not set";
      }

      const inSync =
        vercelSha && githubSha ? vercelSha.startsWith(githubSha.slice(0, 7)) : null;

      return {
        success: true as const,
        vercel: {
          sha: vercelSha,
          shortSha: vercelSha?.slice(0, 7) ?? null,
          commitMessage: vercelCommitMsg,
          deployedAt: vercelDeployedAt,
          url: vercelUrl,
          state: dep?.readyState ?? dep?.state ?? null,
        },
        github: {
          sha: githubSha,
          shortSha: githubSha?.slice(0, 7) ?? null,
          commitMessage: githubCommitMsg,
          committedAt: githubCommittedAt,
          error: githubError,
        },
        inSync,
        checkedAt: new Date().toISOString(),
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
);

/**
 * Force a fresh production deployment from the latest GitHub main commit
 * via Vercel's REST API. Falls back to deploy hook if API token missing.
 */
export const triggerVercelRedeploy = createServerFn({ method: "POST" }).handler(
  async () => {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

    // Preferred path: Vercel REST API (creates new deployment from latest commit)
    if (vercelToken && projectId && githubToken && githubRepo) {
      try {
        // 1. Get latest main commit SHA from GitHub
        const ghRes = await fetch(
          `https://api.github.com/repos/${githubRepo}/commits/main`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "lovable-deploy-trigger",
            },
          },
        );
        if (!ghRes.ok) {
          return {
            success: false as const,
            error: `GitHub API ${ghRes.status}: ${(await ghRes.text()).slice(0, 200)}`,
          };
        }
        const ghJson = (await ghRes.json()) as { sha: string };
        const sha = ghJson.sha;

        // 2. Get project to find repo info
        const projRes = await fetch(
          `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}?${teamQuery().slice(1)}`,
          { headers: vercelHeaders() },
        );
        if (!projRes.ok) {
          return {
            success: false as const,
            error: `Vercel project fetch ${projRes.status}: ${(await projRes.text()).slice(0, 200)}`,
          };
        }
        const proj = (await projRes.json()) as {
          name: string;
          link?: { type?: string; repo?: string; org?: string; repoId?: number };
        };

        // 3. Trigger production deployment
        const deployRes = await fetch(
          `${VERCEL_API}/v13/deployments?forceNew=1${teamQuery()}`,
          {
            method: "POST",
            headers: vercelHeaders(),
            body: JSON.stringify({
              name: proj.name,
              target: "production",
              gitSource: {
                type: "github",
                repoId: proj.link?.repoId,
                ref: "main",
                sha,
              },
            }),
          },
        );
        if (!deployRes.ok) {
          return {
            success: false as const,
            error: `Vercel deploy ${deployRes.status}: ${(await deployRes.text()).slice(0, 300)}`,
          };
        }
        const deployJson = (await deployRes.json()) as {
          id: string;
          url: string;
        };
        return {
          success: true as const,
          method: "api" as const,
          deploymentId: deployJson.id,
          deploymentUrl: `https://${deployJson.url}`,
          sha: sha.slice(0, 7),
          triggeredAt: new Date().toISOString(),
        };
      } catch (e) {
        return {
          success: false as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    // Fallback: deploy hook
    if (hookUrl) {
      try {
        const res = await fetch(hookUrl, { method: "POST" });
        const text = await res.text();
        if (!res.ok) {
          return {
            success: false as const,
            error: `Deploy hook ${res.status}: ${text.slice(0, 200)}`,
          };
        }
        return {
          success: true as const,
          method: "hook" as const,
          triggeredAt: new Date().toISOString(),
          jobRaw: text.slice(0, 500),
        };
      } catch (e) {
        return {
          success: false as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    return {
      success: false as const,
      error:
        "No deploy method configured. Need VERCEL_API_TOKEN + VERCEL_PROJECT_ID + GITHUB_TOKEN + GITHUB_REPO, or VERCEL_DEPLOY_HOOK_URL.",
    };
  },
);

import { createServerFn } from "@tanstack/react-start";

/**
 * Get latest commit info from GitHub main branch.
 * Vercel auto-deploys on every push to main, so this commit will be live within ~1-2 min.
 */
export const getLatestGithubCommit = createServerFn({ method: "GET" }).handler(
  async () => {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // format: "owner/repo"

    if (!githubToken || !githubRepo) {
      return {
        success: false as const,
        error: "GITHUB_TOKEN or GITHUB_REPO not set",
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
        return {
          success: false as const,
          error: `GitHub API ${ghRes.status}: ${(await ghRes.text()).slice(0, 200)}`,
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
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
);

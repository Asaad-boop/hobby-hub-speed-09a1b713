/**
 * Verifies every product link in the codebase uses `product.slug` with a
 * fallback to `product.id` (or equivalent slug-with-id-fallback expression).
 *
 * Rules enforced:
 *  1. Any `<Link to="/product/$id" ...>` must pass `params={{ id: <slug || id expr> }}`.
 *  2. Any `navigate({ to: "/product/$id", ... })` call must do the same.
 *  3. The fallback expression must reference both a `slug` and an `id`
 *     (e.g. `product.slug || product.id`, `p.slug ?? p.id`, `item.slug || item.id`).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".gen.ts")) files.push(full);
  }
  return files;
}

// Accepts: foo.slug || foo.id, foo.slug ?? foo.id, (foo as any).slug || foo.id, etc.
// Requires both `.slug` and `.id` joined by `||` or `??`, on the same base identifier.
const FALLBACK_RE = /(\w+)(?:\s+as\s+\w+)?\)?\.slug\s*(?:\|\||\?\?)\s*\(?\1(?:\s+as\s+\w+)?\)?\.id\b/;

function extractParamsId(snippet: string): string | null {
  // Find params={{ id: <expr> }} — match balanced-ish until closing }} or , id end
  const m = snippet.match(/params\s*=\s*\{\{\s*id\s*:\s*([^}]+?)\s*\}\}/);
  if (m) return m[1].trim();
  // Object literal form: params: { id: <expr> }
  const m2 = snippet.match(/params\s*:\s*\{\s*id\s*:\s*([^}]+?)\s*\}/);
  if (m2) return m2[1].trim();
  return null;
}

describe("product links use slug with id fallback", () => {
  const files = walk(join(ROOT));
  const offenders: string[] = [];

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    if (!src.includes("/product/$id")) continue;

    // Find each occurrence of /product/$id and inspect surrounding ~400 chars
    const re = /["'`]\/product\/\$id["'`]/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(src))) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(src.length, match.index + 400);
      const window = src.slice(start, end);
      const idExpr = extractParamsId(window);
      const rel = relative(ROOT, file);
      if (!idExpr) {
        offenders.push(`${rel}: missing params={{ id: ... }} near "/product/$id"`);
        continue;
      }
      if (!FALLBACK_RE.test(idExpr)) {
        offenders.push(`${rel}: id expr "${idExpr}" must be \`<obj>.slug || <obj>.id\``);
      }
    }
  }

  it("scans at least one file containing a product link", () => {
    const linked = files.filter((f) => readFileSync(f, "utf8").includes("/product/$id"));
    expect(linked.length).toBeGreaterThan(0);
  });

  it("every product link uses slug with id fallback", () => {
    expect(offenders, `Offending product links:\n${offenders.join("\n")}`).toEqual([]);
  });
});

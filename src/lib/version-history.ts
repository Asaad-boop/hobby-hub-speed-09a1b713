import { supabase } from "@/integrations/supabase/client";
import type { HomepageSection } from "@/lib/site-settings";

export type HomepageVersion = {
  id: string;
  sections: HomepageSection[];
  label: string | null;
  created_by: string | null;
  created_at: string;
};

export async function fetchHomepageVersions(): Promise<HomepageVersion[]> {
  const { data, error } = await supabase
    .from("homepage_versions")
    .select("id, sections, label, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    sections: (r.sections as unknown as HomepageSection[]) ?? [],
    label: r.label,
    created_by: r.created_by,
    created_at: r.created_at,
  }));
}

export async function saveHomepageVersion(
  sections: HomepageSection[],
  label?: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const payload = {
    sections: sections as unknown as Record<string, unknown>[],
    label: label ?? null,
    created_by: userData.user?.id ?? null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("homepage_versions").insert(payload as any);
  if (error) throw error;
}

export async function deleteHomepageVersion(id: string): Promise<void> {
  const { error } = await supabase.from("homepage_versions").delete().eq("id", id);
  if (error) throw error;
}

export function formatVersionTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleString();
}

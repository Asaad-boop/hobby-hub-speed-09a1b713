import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchHomepageVersions,
  deleteHomepageVersion,
  formatVersionTime,
  type HomepageVersion,
} from "@/lib/version-history";
import type { HomepageSection } from "@/lib/site-settings";

type Props = {
  open: boolean;
  onClose: () => void;
  onRestore: (sections: HomepageSection[]) => void;
  /** Bumped by parent after a successful publish to trigger reload. */
  refreshKey?: number;
};

export default function VersionHistoryPanel({ open, onClose, onRestore, refreshKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<HomepageVersion[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchHomepageVersions()
      .then((v) => !cancelled && setVersions(v))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

  if (!open) return null;

  const handleRestore = (v: HomepageVersion) => {
    onRestore(v.sections);
    toast.success("Version restored — review then Publish to apply");
    onClose();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHomepageVersion(id);
      setVersions((prev) => prev.filter((v) => v.id !== id));
      toast.success("Version deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="absolute right-3 top-3 z-30 flex max-h-[calc(100vh-200px)] w-80 flex-col rounded-2xl border border-border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <History className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Version history ({versions.length})
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : versions.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No versions yet. Each Publish saves a snapshot here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {versions.map((v, i) => (
              <li
                key={v.id}
                className="group rounded-lg border border-border/60 bg-muted/40 p-2 transition hover:bg-muted"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold">
                      {i === 0 ? "Current published" : `Version ${versions.length - i}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatVersionTime(v.created_at)} · {v.sections.length} sections
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-[11px]"
                    onClick={() => handleRestore(v)}
                    disabled={i === 0}
                    title={i === 0 ? "This is the current version" : "Load into editor"}
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(v.id)}
                    title="Delete snapshot"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        Last 10 publishes. Restore loads into the editor — Publish to apply.
      </div>
    </div>
  );
}

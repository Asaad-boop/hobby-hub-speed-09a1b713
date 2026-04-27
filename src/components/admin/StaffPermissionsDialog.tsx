import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  fetchUserPermissions,
  saveUserPermissions,
  type PermissionKey,
  type PermissionMap,
} from "@/lib/permissions";

type Props = {
  userId: string;
  email: string;
  /** If true, render a compact summary instead of opening dialog by trigger. */
  triggerLabel?: string;
};

export function StaffPermissionsDialog({ userId, email, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PermissionMap>({});
  const qc = useQueryClient();

  const { data: current = {}, isLoading } = useQuery({
    queryKey: ["staff_permissions", userId],
    queryFn: () => fetchUserPermissions(userId),
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  const saveMut = useMutation({
    mutationFn: () => saveUserPermissions(userId, draft),
    onSuccess: () => {
      toast.success("Permissions saved");
      qc.invalidateQueries({ queryKey: ["staff_permissions", userId] });
      qc.invalidateQueries({ queryKey: ["staff_permissions_summary"] });
      qc.invalidateQueries({ queryKey: ["my_permissions"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const toggle = (key: PermissionKey, value: boolean) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {triggerLabel ?? "Permissions"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permissions for {email}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {ALL_PERMISSIONS.map((key) => (
              <label
                key={key}
                htmlFor={`perm-${key}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:bg-muted/30"
              >
                <Checkbox
                  id={`perm-${key}`}
                  checked={draft[key] === true}
                  onCheckedChange={(v) => toggle(key, v === true)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium leading-none">
                    {PERMISSION_LABELS[key]}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">
                    {key}
                  </div>
                </div>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Note: Admins implicitly have all permissions regardless of these
              flags.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || isLoading}
          >
            {saveMut.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Inline summary badges for a user's currently-set permissions. */
export function PermissionsSummary({ userId }: { userId: string }) {
  const { data = {}, isLoading } = useQuery({
    queryKey: ["staff_permissions", userId],
    queryFn: () => fetchUserPermissions(userId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }

  const enabled = ALL_PERMISSIONS.filter((k) => (data as PermissionMap)[k]);
  if (enabled.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No extra permissions</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {enabled.map((k) => (
        <span
          key={k}
          className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium"
        >
          {PERMISSION_LABELS[k]}
        </span>
      ))}
    </div>
  );
}

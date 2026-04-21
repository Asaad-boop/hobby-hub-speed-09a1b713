import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminAuth } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff Management — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffPage,
});

const STAFF_ROLES: AppRole[] = ["admin", "moderator", "customer_service", "operations"];

function StaffPage() {
  const { isAdmin, loading } = useAdminAuth();
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .in("role", STAFF_ROLES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
      let profiles: { id: string; display_name: string | null }[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        profiles = p ?? [];
      }
      const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
      return (data ?? []).map((r) => ({
        ...r,
        display_name: profileMap.get(r.user_id) ?? "—",
      }));
    },
    enabled: isAdmin,
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed");
      queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newRole, setNewRole] = useState<AppRole>("customer_service");
  const [newUserId, setNewUserId] = useState("");

  const addRole = useMutation({
    mutationFn: async () => {
      if (!newUserId) throw new Error("Enter user ID");
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: newUserId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned");
      setNewUserId("");
      queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-bold">Admin only</h1>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Staff Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Assign admin, customer_service, operations, or moderator roles.
        </p>
      </div>

      {/* Add role */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Add staff member</h3>
        <div className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
          <input
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="User UUID (from auth.users)"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => addRole.mutate()} disabled={addRole.isPending}>
            <UserPlus className="mr-1 h-4 w-4" /> Assign
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: User must sign up first. Get UUID from Supabase auth dashboard.
        </p>
      </div>

      {/* Staff table */}
      <div className="rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No staff assigned yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.display_name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <Badge variant={s.role === "admin" ? "default" : "outline"}>{s.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRole.mutate(s.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  UserPlus,
  Trash2,
  ShieldCheck,
  KeyRound,
  Mail,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAdminAuth } from "@/lib/admin";
import {
  listStaff,
  createStaffUser,
  assignRoleByEmail,
  removeRole,
  resetStaffPassword,
} from "@/lib/staff.functions";
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

const STAFF_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "customer_service",
  "operations",
  "packer",
  "accountant",
];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Full access — all features",
  moderator: "Reviews & content moderation",
  customer_service: "Orders, customers, reviews",
  operations: "Orders, inventory, shipments",
  packer: "Packing & shipping queue",
  accountant: "Finance, accounting, reports",
  customer: "Regular customer (storefront only)",
};

function StaffPage() {
  const { isAdmin, loading } = useAdminAuth();
  const queryClient = useQueryClient();
  const listStaffFn = useServerFn(listStaff);
  const removeRoleFn = useServerFn(removeRole);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["staff", "list"],
    queryFn: () => listStaffFn(),
    enabled: isAdmin,
  });
  const staff = data?.staff ?? [];

  const removeMut = useMutation({
    mutationFn: (role_id: string) => removeRoleFn({ data: { role_id } }),
    onSuccess: () => {
      toast.success("Role removed");
      queryClient.invalidateQueries({ queryKey: ["staff", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_auth"] });
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
        <p className="mt-2 text-sm text-muted-foreground">
          Only admins can manage staff & roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Staff Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Add team members and assign roles to control admin access.
          </p>
        </div>
        <div className="flex gap-2">
          <AssignRoleDialog onDone={() => refetch()} />
          <CreateUserDialog onDone={() => refetch()} />
        </div>
      </div>

      {/* Staff table */}
      <div className="rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No staff yet. Click{" "}
            <span className="font-semibold">Create user</span> to add one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell className="font-medium">
                    {s.display_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-mono">{s.email ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.roles.map((r) => (
                        <Badge
                          key={r.id}
                          variant={r.role === "admin" ? "default" : "outline"}
                          className="gap-1"
                        >
                          {r.role}
                          <button
                            onClick={() => {
                              if (
                                confirm(`Remove role "${r.role}" from ${s.email}?`)
                              ) {
                                removeMut.mutate(r.id);
                              }
                            }}
                            className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-background/40"
                            aria-label="Remove role"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ResetPasswordDialog
                      userId={s.user_id}
                      email={s.email ?? ""}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Roles legend */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">Role guide</h3>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {STAFF_ROLES.map((r) => (
            <div key={r} className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">
                {r}
              </Badge>
              <span>{ROLE_DESCRIPTIONS[r]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Dialogs ---------- */

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("customer_service");

  const mut = useMutation({
    mutationFn: () =>
      createStaffUser({
        data: { email, password, display_name: displayName, role },
      }),
    onSuccess: () => {
      toast.success(`User created and assigned "${role}"`);
      setOpen(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setRole("customer_service");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-1 h-4 w-4" /> Create user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create staff user</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="new" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">
              <UserPlus className="mr-1 h-4 w-4" /> New user
            </TabsTrigger>
            <TabsTrigger value="existing">
              <Mail className="mr-1 h-4 w-4" /> Existing user
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-name">Full name</Label>
              <Input
                id="cu-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Mohammad Akash"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-email">Email</Label>
              <Input
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@hobbyshop.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-pass">Password (min 8 chars)</Label>
              <Input
                id="cu-pass"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Strong password"
              />
              <p className="text-xs text-muted-foreground">
                Share this password securely with the staff member. They can change it
                from their account settings.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r} — {ROLE_DESCRIPTIONS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={() => mut.mutate()}
                disabled={
                  mut.isPending || !email || !password || password.length < 8
                }
              >
                {mut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-1 h-4 w-4" />
                )}
                Create & assign role
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="existing" className="pt-3">
            <ExistingUserAssign
              onDone={() => {
                setOpen(false);
                onDone();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ExistingUserAssign({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("customer_service");

  const mut = useMutation({
    mutationFn: () => assignRoleByEmail({ data: { email, role } }),
    onSuccess: () => {
      toast.success(`Role "${role}" assigned to ${email}`);
      setEmail("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        User already has an account? Enter their email and pick a role.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="ea-email">Email</Label>
        <Input
          id="ea-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r} — {ROLE_DESCRIPTIONS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !email}
        >
          {mut.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <UserCog className="mr-1 h-4 w-4" />
          )}
          Assign role
        </Button>
      </DialogFooter>
    </div>
  );
}

function AssignRoleDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCog className="mr-1 h-4 w-4" /> Assign existing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign role to existing user</DialogTitle>
        </DialogHeader>
        <ExistingUserAssign
          onDone={() => {
            setOpen(false);
            onDone();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      resetStaffPassword({ data: { user_id: userId, password } }),
    onSuccess: () => {
      toast.success("Password updated");
      setOpen(false);
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Reset password">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Set a new password for{" "}
          <span className="font-mono font-semibold">{email}</span>.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="rp-pass">New password (min 8 chars)</Label>
          <Input
            id="rp-pass"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || password.length < 8}
          >
            {mut.isPending && (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            )}
            Update password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  FlaskConical,
  CheckCircle2,
  XCircle,
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
  verifyUserRoles,
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
      {/* Permission Test Panel */}
      <PermissionTestPanel onAfterChange={() => refetch()} />
    </div>
  );
}

/* ---------- Permission Test Panel ---------- */

type TestStep = {
  label: string;
  status: "idle" | "running" | "success" | "error";
  message?: string;
};

function PermissionTestPanel({ onAfterChange }: { onAfterChange: () => void }) {
  const [mode, setMode] = useState<"create" | "existing">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("customer_service");
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [running, setRunning] = useState(false);

  const createStaffUserFn = useServerFn(createStaffUser);
  const assignRoleFn = useServerFn(assignRoleByEmail);
  const verifyUserRolesFn = useServerFn(verifyUserRoles);

  const updateStep = (idx: number, patch: Partial<TestStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const runTest = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Valid email required");
      return;
    }
    if (mode === "create" && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setRunning(true);
    const initial: TestStep[] =
      mode === "create"
        ? [
            { label: "Create staff user", status: "running" },
            { label: `Verify role "${role}" assigned`, status: "idle" },
            { label: "Verify admin panel access", status: "idle" },
          ]
        : [
            { label: `Assign role "${role}" to existing user`, status: "running" },
            { label: `Verify role "${role}" assigned`, status: "idle" },
            { label: "Verify admin panel access", status: "idle" },
          ];
    setSteps(initial);

    try {
      // Step 1: Create or assign
      if (mode === "create") {
        const res = await createStaffUserFn({
          data: {
            email: email.trim(),
            password,
            display_name: displayName.trim() || undefined,
            role,
          },
        });
        updateStep(0, {
          status: "success",
          message: `User created (id: ${res.user_id.slice(0, 8)}…)`,
        });
      } else {
        const res = await assignRoleFn({
          data: { email: email.trim(), role },
        });
        updateStep(0, {
          status: "success",
          message: `Role assigned (user id: ${res.user_id.slice(0, 8)}…)`,
        });
      }

      // Step 2: Verify role exists in DB
      updateStep(1, { status: "running" });
      const verify = await verifyUserRolesFn({
        data: { email: email.trim() },
      });
      if (!verify.found) {
        updateStep(1, { status: "error", message: "User not found in auth" });
        throw new Error("User not found after step 1");
      }
      if (!verify.roles.includes(role)) {
        updateStep(1, {
          status: "error",
          message: `DB roles: [${verify.roles.join(", ") || "none"}] — "${role}" missing`,
        });
        throw new Error(`Role "${role}" not found in user_roles table`);
      }
      updateStep(1, {
        status: "success",
        message: `DB roles: [${verify.roles.join(", ")}]`,
      });

      // Step 3: Admin access check
      updateStep(2, { status: "running" });
      if (verify.canAccessAdmin) {
        updateStep(2, {
          status: "success",
          message: `Can access /admin (role grants entry)`,
        });
        toast.success("Permission test passed ✓");
      } else {
        updateStep(2, {
          status: "error",
          message: `Role "${role}" does NOT grant /admin access`,
        });
        toast.error(`Role "${role}" cannot access admin panel`);
      }

      onAfterChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Mark first running step as failed
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "running" ? { ...s, status: "error", message: msg } : s,
        ),
      );
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-2">
        <FlaskConical className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Permission Test</h2>
          <p className="text-xs text-muted-foreground">
            Create or assign a role, then automatically verify the role lands in
            the DB and grants /admin access.
          </p>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <Button
          size="sm"
          variant={mode === "create" ? "default" : "outline"}
          onClick={() => setMode("create")}
          disabled={running}
        >
          New user
        </Button>
        <Button
          size="sm"
          variant={mode === "existing" ? "default" : "outline"}
          onClick={() => setMode("existing")}
          disabled={running}
        >
          Existing user
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ptest-email">Email</Label>
          <Input
            id="ptest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            disabled={running}
          />
        </div>
        <div>
          <Label htmlFor="ptest-role">Role</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as AppRole)}
            disabled={running}
          >
            <SelectTrigger id="ptest-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mode === "create" && (
          <>
            <div>
              <Label htmlFor="ptest-name">Display name (optional)</Label>
              <Input
                id="ptest-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Test Staff"
                disabled={running}
              />
            </div>
            <div>
              <Label htmlFor="ptest-pw">Password (min 8)</Label>
              <Input
                id="ptest-pw"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 8 chars"
                disabled={running}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={runTest} disabled={running}>
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="mr-2 h-4 w-4" />
          )}
          Run permission test
        </Button>
        {steps.length > 0 && !running && (
          <Button variant="ghost" size="sm" onClick={() => setSteps([])}>
            Clear
          </Button>
        )}
      </div>

      {steps.length > 0 && (
        <ol className="mt-4 space-y-2">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm"
            >
              <StepIcon status={s.status} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {i + 1}. {s.label}
                </div>
                {s.message && (
                  <div
                    className={`mt-0.5 text-xs ${
                      s.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.message}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: TestStep["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />;
  if (status === "error")
    return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  if (status === "running")
    return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />;
  return (
    <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
  );
}

/* ---------- Dialogs ---------- */

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("customer_service");
  const createStaffUserFn = useServerFn(createStaffUser);

  const mut = useMutation({
    mutationFn: () =>
      createStaffUserFn({
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
  const assignRoleByEmailFn = useServerFn(assignRoleByEmail);

  const mut = useMutation({
    mutationFn: () => assignRoleByEmailFn({ data: { email, role } }),
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
  const resetStaffPasswordFn = useServerFn(resetStaffPassword);

  const mut = useMutation({
    mutationFn: () =>
      resetStaffPasswordFn({ data: { user_id: userId, password } }),
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

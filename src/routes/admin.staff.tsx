import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, Shield, UserPlus, Mail } from "lucide-react";
import {
  listStaff,
  createStaffUser,
  assignRoleByEmail,
  assignRoleByUserId,
  listAllUsers,
  removeRole,
  resetStaffPassword,
} from "@/lib/staff.functions";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  type PermissionKey,
  type PermissionMap,
  fetchUserPermissions,
  saveUserPermissions,
} from "@/lib/permissions";
import {
  PageHeader,
  Card,
  Loading,
  Btn,
  Input,
  Modal,
  Empty,
  Badge,
  Select,
} from "@/components/admin/ui";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ASSIGNABLE_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "customer_service",
  "operations",
  "packer",
  "accountant",
];

const ROLE_TONE: Record<string, "purple" | "blue" | "green" | "yellow" | "gray"> = {
  admin: "purple",
  moderator: "blue",
  customer_service: "green",
  operations: "yellow",
  packer: "gray",
  accountant: "gray",
};

export const Route = createFileRoute("/admin/staff")({
  component: StaffPage,
});

function StaffPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [permsFor, setPermsFor] = useState<{
    user_id: string;
    email: string | null;
    display_name: string | null;
  } | null>(null);
  const [pwFor, setPwFor] = useState<{ user_id: string; email: string | null } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => await listStaff(),
  });

  async function handleRemoveRole(role_id: string) {
    if (!confirm("Remove this role assignment?")) return;
    try {
      await removeRole({ data: { role_id } });
      toast.success("Role removed");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove role");
    }
  }

  const staff = data?.staff ?? [];

  return (
    <div>
      <PageHeader
        title="Staff & Permissions"
        description="Manage admin and staff accounts, roles, and per-user permissions"
      />

      <Card className="mb-5">
        <div
          className="flex items-center justify-between border-b border-gray-200 px-4 py-3"
          style={{ borderBottomWidth: "0.5px" }}
        >
          <div className="text-sm font-semibold">Staff members</div>
          <div className="flex gap-2">
            <Btn onClick={() => setAssignOpen(true)}>
              <Mail className="h-3.5 w-3.5" /> Assign existing
            </Btn>
            <Btn variant="primary" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Create user
            </Btn>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : staff.length === 0 ? (
          <Empty title="No staff yet" description="Create the first staff account to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Roles</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.user_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs">{s.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{s.display_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.roles.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1">
                          <Badge tone={ROLE_TONE[r.role] ?? "gray"}>{r.role}</Badge>
                          <button
                            className="text-gray-400 hover:text-red-600"
                            title="Remove role"
                            onClick={() => handleRemoveRole(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Btn
                        onClick={() =>
                          setPermsFor({
                            user_id: s.user_id,
                            email: s.email,
                            display_name: s.display_name,
                          })
                        }
                      >
                        <Shield className="h-3 w-3" /> Permissions
                      </Btn>
                      <Btn onClick={() => setPwFor({ user_id: s.user_id, email: s.email })}>
                        <KeyRound className="h-3 w-3" /> Reset password
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ["admin", "staff"] });
          }}
        />
      )}
      {assignOpen && (
        <AssignRoleModal
          onClose={() => setAssignOpen(false)}
          onSaved={() => {
            setAssignOpen(false);
            qc.invalidateQueries({ queryKey: ["admin", "staff"] });
          }}
        />
      )}
      {permsFor && (
        <PermissionsModal
          user={permsFor}
          onClose={() => setPermsFor(null)}
        />
      )}
      {pwFor && <ResetPasswordModal user={pwFor} onClose={() => setPwFor(null)} />}
    </div>
  );
}

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("customer_service");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!email || !password) return toast.error("Email and password required");
    setSaving(true);
    try {
      await createStaffUser({
        data: { email, password, display_name: displayName || undefined, role },
      });
      toast.success("Staff user created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Create staff user">
      <div className="space-y-3">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="Display name (optional)">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Password (min 8 chars)">
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Strong password" />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>
          {saving ? "Creating…" : "Create user"}
        </Btn>
      </div>
    </Modal>
  );
}

function AssignRoleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("customer_service");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: async () => await listAllUsers(),
  });

  const users = usersData?.users ?? [];
  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(term) ||
          (u.display_name ?? "").toLowerCase().includes(term),
      )
    : users;

  async function saveByPick() {
    if (!selectedUserId) return toast.error("Select a user from the list");
    setSaving(true);
    try {
      await assignRoleByUserId({ data: { user_id: selectedUserId, role } });
      toast.success("Role assigned");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to assign role");
    } finally {
      setSaving(false);
    }
  }

  async function saveByEmail() {
    if (!email) return toast.error("Email required");
    setSaving(true);
    try {
      await assignRoleByEmail({ data: { email, role } });
      toast.success("Role assigned");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to assign role");
    } finally {
      setSaving(false);
    }
  }

  const selectedUser = users.find((u) => u.user_id === selectedUserId) ?? null;

  return (
    <Modal open onClose={onClose} title="Assign role to existing user">
      <div className="space-y-3">
        <Field label="Role to assign">
          <Select value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-600">
              Pick from existing users {users.length > 0 && `(${users.length})`}
            </div>
          </div>
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 max-h-64 overflow-y-auto rounded border border-gray-200">
            {isLoading ? (
              <div className="p-3 text-xs text-gray-500">Loading users…</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">No users found</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.slice(0, 100).map((u) => {
                  const isSel = selectedUserId === u.user_id;
                  return (
                    <li
                      key={u.user_id}
                      onClick={() => setSelectedUserId(u.user_id)}
                      className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 ${
                        isSel ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.email ?? "—"}</div>
                          <div className="truncate text-xs text-gray-500">
                            {u.display_name ?? "No name"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 ? (
                            <Badge tone="gray">customer</Badge>
                          ) : (
                            u.roles.map((r) => (
                              <Badge key={r} tone={ROLE_TONE[r] ?? "gray"}>
                                {r}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {selectedUser && (
            <div className="mt-2 text-xs text-gray-600">
              Selected: <span className="font-medium">{selectedUser.email}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Btn variant="primary" onClick={saveByPick} disabled={saving || !selectedUserId}>
            {saving ? "Assigning…" : `Assign "${role}" to selected`}
          </Btn>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] uppercase tracking-wider text-gray-400">or by email</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <Field label="User email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="existing@example.com"
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={saveByEmail} disabled={saving || !email}>
          {saving ? "Assigning…" : "Assign by email"}
        </Btn>
      </div>
    </Modal>
  );
}

function PermissionsModal({
  user,
  onClose,
}: {
  user: { user_id: string; email: string | null; display_name: string | null };
  onClose: () => void;
}) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "staff", "perms", user.user_id],
    queryFn: () => fetchUserPermissions(user.user_id),
  });
  const [draft, setDraft] = useState<PermissionMap | null>(null);
  const [saving, setSaving] = useState(false);

  const current = draft ?? (data as PermissionMap | undefined) ?? {};

  function toggle(key: PermissionKey) {
    const base = draft ?? ((data as PermissionMap | undefined) ?? {});
    setDraft({ ...base, [key]: !base[key] });
  }

  async function save() {
    setSaving(true);
    try {
      await saveUserPermissions(user.user_id, current);
      toast.success("Permissions saved");
      await refetch();
      setDraft(null);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Permissions — ${user.email ?? user.display_name ?? "user"}`}>
      {isLoading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Granular permissions apply on top of role. Admin role implicitly has all permissions.
          </p>
          <div className="divide-y divide-gray-100 rounded border border-gray-200">
            {ALL_PERMISSIONS.map((key) => (
              <label key={key} className="flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50">
                <span>{PERMISSION_LABELS[key]}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={current[key] === true}
                  onChange={() => toggle(key)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving || isLoading}>
          {saving ? "Saving…" : "Save permissions"}
        </Btn>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: { user_id: string; email: string | null };
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await resetStaffPassword({ data: { user_id: user.user_id, password } });
      toast.success("Password updated");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Reset password — ${user.email ?? "user"}`}>
      <Field label="New password (min 8 chars)">
        <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Update password"}
        </Btn>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      {children}
    </div>
  );
}

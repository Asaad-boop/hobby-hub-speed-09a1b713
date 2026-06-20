import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Loading, Btn, Badge, Empty } from "@/components/admin/ui";

type RoleRow = { id: string; user_id: string; role: string; created_at: string };

export function StaffTab() {
  const { data: roles, refetch } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as RoleRow[];
    },
  });

  async function deleteRole(id: string) {
    if (!confirm("Remove role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    refetch();
  }

  return (
    <Card>
      <div
        className="flex items-center justify-between border-b border-gray-200 px-4 py-3"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <div className="text-sm font-semibold">Staff roles</div>
      </div>
      {!roles ? (
        <Loading />
      ) : roles.length === 0 ? (
        <Empty title="No staff roles configured" />
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">User ID</th>
              <th className="px-4 py-2 text-left font-medium">Role</th>
              <th className="px-4 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{r.user_id}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={r.role === "admin" ? "purple" : "blue"}>{r.role}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Btn variant="danger" onClick={() => deleteRole(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

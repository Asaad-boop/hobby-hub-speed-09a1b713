import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fetchExpenseCategories, upsertExpenseCategory } from "@/lib/expenses";

export function ExpenseCategoryManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["admin", "expense_categories", "all"],
    queryFn: () => fetchExpenseCategories(true),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Name din");
      await upsertExpenseCategory({ name: newName.trim() });
    },
    onSuccess: () => {
      toast.success("Category added");
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin", "expense_categories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, name, is_active }: { id: string; name: string; is_active: boolean }) => {
      await upsertExpenseCategory({ id, name, is_active });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "expense_categories"] }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage expense categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create.mutate()}
            />
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : cats.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No categories</p>
            ) : (
              cats.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                  <span className={c.is_active ? "" : "text-muted-foreground line-through"}>{c.name}</span>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: c.id, name: c.name, is_active: v })}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

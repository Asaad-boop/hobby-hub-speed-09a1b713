import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Tags, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/admin/ImageUploader";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesPage,
});

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
};

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "Slug required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().trim().max(500).nullable(),
  image_url: z.string().trim().max(1000).nullable(),
  display_order: z.number().int(),
  is_active: z.boolean(),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  // Count products per category for the badge
  const { data: counts } = useQuery({
    queryKey: ["admin", "categories", "counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) {
        const id = (r as { category_id: string | null }).category_id;
        if (id) map[id] = (map[id] ?? 0) + 1;
      }
      return map;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setDeleteId(null);
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("violates") ? "Ei category er products ache. Age products onno category te move koro." : e.message),
  });

  const deleteTarget = useMemo(
    () => categories?.find((c) => c.id === deleteId) ?? null,
    [categories, deleteId],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories?.length ?? 0} total · organize your catalog
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add category
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tags className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No categories yet</p>
            <p className="text-xs text-muted-foreground">Add your first category to organize products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 px-2 py-3"></th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3 text-center">Order</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-2 py-3 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                          ) : (
                            <Tags className="m-auto h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">/{c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary">{counts?.[c.id] ?? 0}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {c.display_order}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: c.id, value: v })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(c);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        nextOrder={(categories?.length ?? 0) * 10}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "categories"] });
          qc.invalidateQueries({ queryKey: ["admin", "categories", "list"] });
          setDialogOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && counts?.[deleteTarget.id]
                ? `Ei category te ${counts[deleteTarget.id]} ta products ache. Delete korle products gulo "no category" hoye jabe.`
                : "Eta permanently delete hobe."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteCategory.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  editing,
  nextOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CategoryRow | null;
  nextOrder: number;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useMemo(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setSlug(editing.slug);
      setSlugTouched(true);
      setDescription(editing.description ?? "");
      setImageUrl(editing.image_url ?? "");
      setDisplayOrder(String(editing.display_order));
      setIsActive(editing.is_active);
    } else {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setImageUrl("");
      setDisplayOrder(String(nextOrder));
      setIsActive(true);
    }
  }, [open, editing, nextOrder]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched && !isEdit) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = categorySchema.safeParse({
      name,
      slug,
      description: description.trim() === "" ? null : description.trim(),
      image_url: imageUrl.trim() === "" ? null : imageUrl.trim(),
      display_order: Number(displayOrder) || 0,
      is_active: isActive,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    setSaving(true);
    try {
      if (isEdit && editing) {
        const { error } = await supabase
          .from("categories")
          .update(parsed.data as never)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("categories").insert(parsed.data as never);
        if (error) throw error;
        toast.success("Category created");
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg.includes("duplicate") ? "Ei slug already exist kore" : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Category details update koro." : "Notun category banao products organize korte."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="gadgets"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                URL: /category/{slug || "your-slug"}
              </p>
            </div>
            <div>
              <Label htmlFor="display_order">Display order</Label>
              <Input
                id="display_order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <span>Active</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </label>
            </div>
            <div className="sm:col-span-2">
              <Label>Cover image</Label>
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                folder="categories"
                label="Category cover"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

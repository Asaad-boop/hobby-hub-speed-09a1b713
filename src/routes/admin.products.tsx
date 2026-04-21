import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Loader2, Package, ImageOff, History, Layers } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageUploader, GalleryUploader } from "@/components/admin/ImageUploader";
import { StockHistoryDrawer } from "@/components/admin/StockHistoryDrawer";
import { VariantManager } from "@/components/admin/VariantManager";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  old_price: number | null;
  image: string;
  gallery: unknown;
  stock: number;
  rating: number;
  reviews: number;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  category_id: string | null;
  display_order: number;
  benefits: unknown;
  specs: unknown;
};

type CategoryRow = { id: string; name: string; slug: string };

const productSchema = z.object({
  title: z.string().trim().min(2, "Title required").max(200),
  slug: z.string().trim().min(2, "Slug required").max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().trim().max(2000).optional().default(""),
  price: z.number().nonnegative("Price must be ≥ 0"),
  old_price: z.number().nonnegative().nullable(),
  stock: z.number().int().nonnegative(),
  image: z.string().trim().min(1, "Image URL required").max(1000),
  category_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_new_arrival: z.boolean(),
  benefits: z.array(z.string().min(1)).default([]),
  gallery: z.array(z.string().min(1)).default([]),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductRow | null>(null);
  const [variantsProduct, setVariantsProduct] = useState<ProductRow | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [products, search]);

  const toggleField = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("products").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products?.length ?? 0} total · manage your catalog
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No products found</p>
            <p className="text-xs text-muted-foreground">Add your first product to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-center">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {p.image ? (
                            <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="m-auto h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.title}</p>
                          <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ৳{Number(p.price).toLocaleString()}
                      {p.old_price && (
                        <div className="text-xs font-normal text-muted-foreground line-through">
                          ৳{Number(p.old_price).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.stock > 0 ? "secondary" : "destructive"}>
                        {p.stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(v) =>
                          toggleField.mutate({ id: p.id, patch: { is_active: v } })
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={p.is_featured}
                        onCheckedChange={(v) =>
                          toggleField.mutate({ id: p.id, patch: { is_featured: v } })
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Variants"
                          onClick={() => setVariantsProduct(p)}
                        >
                          <Layers className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Stock history"
                          onClick={() => setHistoryProduct(p)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories ?? []}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "products"] });
          setDialogOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              Eta permanently delete hobe. Undo kora jabe na.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteProduct.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StockHistoryDrawer
        open={!!historyProduct}
        onOpenChange={(o) => !o && setHistoryProduct(null)}
        productId={historyProduct?.id ?? null}
        productTitle={historyProduct?.title ?? null}
      />

      <VariantManager
        open={!!variantsProduct}
        onOpenChange={(o) => !o && setVariantsProduct(null)}
        productId={variantsProduct?.id ?? null}
        productTitle={variantsProduct?.title ?? ""}
        productPrice={Number(variantsProduct?.price ?? 0)}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  editing,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ProductRow | null;
  categories: CategoryRow[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [saving, setSaving] = useState(false);

  // Form state seeded from editing or defaults whenever dialog opens
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [benefitsText, setBenefitsText] = useState("");
  const [categoryId, setCategoryId] = useState<string | "none">("none");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);

  // Reset form when opening
  useMemo(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setSlug(editing.slug);
      setSlugTouched(true);
      setDescription(editing.description ?? "");
      setPrice(String(editing.price ?? ""));
      setOldPrice(editing.old_price != null ? String(editing.old_price) : "");
      setStock(String(editing.stock ?? 0));
      setImage(editing.image ?? "");
      setGallery(Array.isArray(editing.gallery) ? (editing.gallery as string[]).filter((g): g is string => typeof g === "string") : []);
      setBenefitsText(Array.isArray(editing.benefits) ? (editing.benefits as string[]).join("\n") : "");
      setCategoryId(editing.category_id ?? "none");
      setIsActive(editing.is_active);
      setIsFeatured(editing.is_featured);
      setIsNewArrival(editing.is_new_arrival);
    } else {
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setPrice("");
      setOldPrice("");
      setStock("0");
      setImage("");
      setGallery([]);
      setBenefitsText("");
      setCategoryId("none");
      setIsActive(true);
      setIsFeatured(false);
      setIsNewArrival(false);
    }
  }, [open, editing]);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched && !isEdit) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = productSchema.safeParse({
      title,
      slug,
      description,
      price: Number(price),
      old_price: oldPrice.trim() === "" ? null : Number(oldPrice),
      stock: Number(stock),
      image,
      category_id: categoryId === "none" ? null : categoryId,
      is_active: isActive,
      is_featured: isFeatured,
      is_new_arrival: isNewArrival,
      benefits: benefitsText.split("\n").map((s) => s.trim()).filter(Boolean),
      gallery,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    setSaving(true);
    try {
      if (isEdit && editing) {
        const { error } = await supabase
          .from("products")
          .update(parsed.data as never)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(parsed.data as never);
        if (error) throw error;
        toast.success("Product created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Product details update koro." : "Notun product add koro catalog e."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="my-product-slug"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price (৳)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="old_price">Old price (৳, optional)</Label>
              <Input
                id="old_price"
                type="number"
                min="0"
                step="1"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Main image</Label>
              <ImageUploader
                value={image}
                onChange={setImage}
                folder="products"
                label="Main product image"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Gallery (additional images)</Label>
              <GalleryUploader value={gallery} onChange={setGallery} folder="products" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="benefits">Benefits / features (one per line)</Label>
              <Textarea
                id="benefits"
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                rows={3}
                placeholder={"Warm ambient light\nUSB-C rechargeable"}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>Featured</span>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>New arrival</span>
              <Switch checked={isNewArrival} onCheckedChange={setIsNewArrival} />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

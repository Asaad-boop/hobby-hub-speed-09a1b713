import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star, Trash2, Check, X, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Admin" }] }),
  component: AdminReviewsPage,
});

type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
};

function AdminReviewsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "approved" | "pending">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const [revRes, prodRes, profRes] = await Promise.all([
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, title, image"),
        supabase.from("profiles").select("id, display_name"),
      ]);
      if (revRes.error) throw revRes.error;
      if (prodRes.error) throw prodRes.error;
      if (profRes.error) throw profRes.error;
      const products = new Map<string, { title: string; image: string }>();
      (prodRes.data ?? []).forEach((p) => products.set(p.id, { title: p.title, image: p.image }));
      const profiles = new Map<string, string | null>();
      (profRes.data ?? []).forEach((p) => profiles.set(p.id, p.display_name));
      return {
        reviews: (revRes.data ?? []) as ReviewRow[],
        products,
        profiles,
      };
    },
  });

  const approve = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Review updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Review deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.reviews;
    if (tab === "approved") list = list.filter((r) => r.is_approved);
    else if (tab === "pending") list = list.filter((r) => !r.is_approved);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const product = data.products.get(r.product_id)?.title ?? "";
        const author = data.profiles.get(r.user_id) ?? "";
        return (
          (r.title ?? "").toLowerCase().includes(q) ||
          (r.comment ?? "").toLowerCase().includes(q) ||
          product.toLowerCase().includes(q) ||
          (author ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [data, tab, search]);

  const counts = useMemo(() => {
    const all = data?.reviews ?? [];
    return {
      all: all.length,
      approved: all.filter((r) => r.is_approved).length,
      pending: all.filter((r) => !r.is_approved).length,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="h-6 w-6 text-primary" /> Reviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Moderate, approve, or remove customer reviews.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reviews, products, authors…"
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No reviews found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="min-w-[260px]">Review</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const product = data?.products.get(r.product_id);
                const author = data?.profiles.get(r.user_id) ?? "Anonymous";
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product?.image && (
                          <img src={product.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                        )}
                        <span className="line-clamp-2 max-w-[180px] text-sm">
                          {product?.title ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{author}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.title && <p className="text-sm font-semibold line-clamp-1">{r.title}</p>}
                      {r.comment && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {r.is_approved ? (
                        <Badge variant="secondary">Approved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {r.is_approved ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Unpublish"
                            onClick={() => approve.mutate({ id: r.id, value: false })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Approve"
                            onClick={() => approve.mutate({ id: r.id, value: true })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => {
                            if (confirm("Delete this review permanently?")) remove.mutate(r.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

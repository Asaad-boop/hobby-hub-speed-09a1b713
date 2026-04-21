import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star, MessageSquare, Search, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminTableSkeleton } from "@/components/admin/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAdminReviews,
  setReviewApproval,
  bulkSetApproval,
  bulkDelete,
  deleteReview,
  type AdminReview,
} from "@/lib/reviews";
import ReviewDetailDrawer from "@/components/admin/ReviewDetailDrawer";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Admin" }] }),
  component: AdminReviewsPage,
});

type Tab = "pending" | "approved" | "all";

function AdminReviewsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<AdminReview | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: fetchAdminReviews,
  });

  const counts = useMemo(
    () => ({
      pending: data.filter((r) => !r.is_approved).length,
      approved: data.filter((r) => r.is_approved).length,
      all: data.length,
    }),
    [data],
  );

  const filtered = useMemo(() => {
    let list = data;
    if (tab === "approved") list = list.filter((r) => r.is_approved);
    else if (tab === "pending") list = list.filter((r) => !r.is_approved);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.title ?? "").toLowerCase().includes(q) ||
          (r.comment ?? "").toLowerCase().includes(q) ||
          (r.product_title ?? "").toLowerCase().includes(q) ||
          (r.customer_name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, tab, search]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    qc.invalidateQueries({ queryKey: ["product_reviews"] });
    setSelected(new Set());
  };

  const approveOne = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setReviewApproval(id, value),
    onSuccess: (_, v) => {
      toast.success(v.value ? "Approved" : "Rejected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkApprove = useMutation({
    mutationFn: (value: boolean) => bulkSetApproval(Array.from(selected), value),
    onSuccess: (_, value) => {
      toast.success(`${selected.size} review${selected.size === 1 ? "" : "s"} ${value ? "approved" : "rejected"}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const bulkRemove = useMutation({
    mutationFn: () => bulkDelete(Array.from(selected)),
    onSuccess: () => {
      toast.success(`${selected.size} deleted`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="h-6 w-6 text-primary" /> Reviews
          {counts.pending > 0 && (
            <Badge className="ml-1 bg-primary/15 text-primary hover:bg-primary/20">
              {counts.pending} pending
            </Badge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">Moderate, approve, or remove customer reviews.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelected(new Set()); }}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews, products, customers…"
            className="pl-9"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
            <span className="text-xs font-bold">{selected.size} selected</span>
            <Button size="sm" variant="ghost" onClick={() => bulkApprove.mutate(true)} disabled={bulkApprove.isPending}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkApprove.mutate(false)} disabled={bulkApprove.isPending}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete ${selected.size} review(s) permanently?`)) bulkRemove.mutate();
              }}
              disabled={bulkRemove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <AdminTableSkeleton rows={6} columns={6} />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No reviews found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="min-w-[260px]">Review</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    // ignore clicks coming from checkboxes/buttons
                    const t = e.target as HTMLElement;
                    if (t.closest("button, input, label")) return;
                    setActive(r);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label="Select review"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {r.product_image && (
                        <img src={r.product_image} alt="" className="h-9 w-9 rounded-md object-cover" />
                      )}
                      <span className="line-clamp-2 max-w-[180px] text-sm">{r.product_title ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.customer_name || "Anonymous"}</TableCell>
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
                    {r.title && <p className="line-clamp-1 text-sm font-semibold">{r.title}</p>}
                    {r.comment && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{r.comment}</p>
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {r.is_approved ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Unpublish"
                          onClick={() => approveOne.mutate({ id: r.id, value: false })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Approve"
                          onClick={() => approveOne.mutate({ id: r.id, value: true })}
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
                          if (confirm("Delete this review permanently?")) deleteOne.mutate(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ReviewDetailDrawer review={active} onClose={() => setActive(null)} onChanged={refresh} />
    </div>
  );
}

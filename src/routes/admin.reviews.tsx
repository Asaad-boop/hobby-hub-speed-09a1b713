import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Trash2, Star, Search, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  PageHeader,
  Card,
  Loading,
  Empty,
  Btn,
  Input,
  Badge,
} from "@/components/admin/ui";
import {
  fetchAdminReviews,
  setReviewApproval,
  bulkSetApproval,
  deleteReview,
  bulkDelete,
  updateReviewDate,
  type AdminReview,
} from "@/lib/reviews";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewsPage,
});

type Tab = "pending" | "approved" | "all";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            "h-3.5 w-3.5 " +
            (i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300")
          }
        />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: fetchAdminReviews,
  });

  const filtered = useMemo(() => {
    let list: AdminReview[] = data ?? [];
    if (tab === "pending") list = list.filter((r) => !r.is_approved);
    else if (tab === "approved") list = list.filter((r) => r.is_approved);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (r) =>
          (r.product_title ?? "").toLowerCase().includes(s) ||
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.guest_phone ?? "").toLowerCase().includes(s) ||
          (r.comment ?? "").toLowerCase().includes(s) ||
          (r.title ?? "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [data, tab, q]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      pending: all.filter((r) => !r.is_approved).length,
      approved: all.filter((r) => r.is_approved).length,
      all: all.length,
    };
  }, [data]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  async function approve(id: string) {
    try {
      await setReviewApproval(id, true);
      toast.success("Review approved");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function reject(id: string) {
    try {
      await setReviewApproval(id, false);
      toast.success("Review unapproved");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await deleteReview(id);
      toast.success("Review deleted");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function bulkApprove(value: boolean) {
    if (selected.size === 0) return;
    try {
      await bulkSetApproval(Array.from(selected), value);
      toast.success(`${selected.size} review(s) ${value ? "approved" : "unapproved"}`);
      setSelected(new Set());
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function bulkRemove() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} review(s) permanently?`)) return;
    try {
      await bulkDelete(Array.from(selected));
      toast.success(`${selected.size} review(s) deleted`);
      setSelected(new Set());
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Approve, unapprove, or delete customer reviews"
        actions={
          <Btn onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Btn>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { key: "pending", label: `Pending (${counts.pending})` },
            { key: "approved", label: `Approved (${counts.approved})` },
            { key: "all", label: `All (${counts.all})` },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSelected(new Set());
            }}
            className={
              "h-8 rounded-md px-3 text-xs font-medium transition-colors " +
              (tab === t.key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50")
            }
          >
            {t.label}
          </button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product, customer, comment…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
          <span className="text-gray-700">{selected.size} selected</span>
          <Btn variant="primary" onClick={() => bulkApprove(true)}>
            <Check className="h-3.5 w-3.5" /> Approve
          </Btn>
          <Btn onClick={() => bulkApprove(false)}>
            <X className="h-3.5 w-3.5" /> Unapprove
          </Btn>
          <Btn variant="danger" onClick={bulkRemove}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Btn>
        </div>
      )}

      <Card>
        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty title="No reviews" description="Nothing matches the current filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Comment</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {r.product_image && (
                          <img
                            src={r.product_image}
                            alt=""
                            className="h-9 w-9 rounded object-cover"
                          />
                        )}
                        <span className="line-clamp-2 max-w-[200px] text-xs text-gray-800">
                          {r.product_title ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium text-gray-900">
                        {r.customer_name ?? "Guest"}
                      </div>
                      {r.guest_phone && (
                        <div className="text-gray-500">{r.guest_phone}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Stars rating={r.rating} />
                    </td>
                    <td className="px-3 py-3 max-w-[280px]">
                      {r.title && (
                        <div className="text-xs font-medium text-gray-900">{r.title}</div>
                      )}
                      <div className="text-xs text-gray-600 line-clamp-3">
                        {r.comment ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {r.is_approved ? (
                        <Badge tone="green">Approved</Badge>
                      ) : (
                        <Badge tone="yellow">Pending</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        {r.is_approved ? (
                          <Btn onClick={() => reject(r.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Btn>
                        ) : (
                          <Btn variant="primary" onClick={() => approve(r.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Btn>
                        )}
                        <Btn variant="danger" onClick={() => remove(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
